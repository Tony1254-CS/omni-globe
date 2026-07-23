// Pure client-side anomaly scoring for widget data. No I/O.
export type AttentionLevel = "calm" | "watch" | "alert";
export type AnomalyScore = {
  level: AttentionLevel;
  label: string;
  detail: string;
};

const calm = (label = "Nominal", detail = "Within normal range"): AnomalyScore => ({ level: "calm", label, detail });
const watch = (label: string, detail: string): AnomalyScore => ({ level: "watch", label, detail });
const alert = (label: string, detail: string): AnomalyScore => ({ level: "alert", label, detail });

function stddev(nums: number[]) {
  if (!nums.length) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

export function scoreWidget(type: string, data: any): AnomalyScore | null {
  if (!data) return null;
  try {
    switch (type) {
      case "earthquakes": {
        const events: any[] = data.events ?? [];
        if (!events.length) return calm("Quiet", "No events matching threshold");
        const mags = events.map((e) => Number(e.magnitude) || 0);
        const max = Math.max(...mags);
        const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
        const sd = stddev(mags) || 0.5;
        if (max >= 6) return alert(`M${max.toFixed(1)} major`, "Major seismic event detected");
        if (max >= mean + 2 * sd && max >= 4.5) return watch(`M${max.toFixed(1)} anomaly`, `>2σ above 24h mean (μ=${mean.toFixed(1)})`);
        return calm(`Peak M${max.toFixed(1)}`, `${events.length} events, mean M${mean.toFixed(1)}`);
      }
      case "crypto": {
        const entries = Object.entries(data as Record<string, any>);
        const changes = entries.map(([, v]) => Math.abs(Number(v?.usd_24h_change) || 0));
        if (!changes.length) return null;
        const max = Math.max(...changes);
        if (max >= 10) return alert(`${max.toFixed(1)}% swing`, "Extreme 24h move");
        if (max >= 5) return watch(`${max.toFixed(1)}% move`, "Elevated volatility vs baseline");
        return calm(`${max.toFixed(1)}% max`, "Normal intraday range");
      }
      case "aqi": {
        const cur = data?.current?.us_aqi;
        if (cur == null) return null;
        const v = Number(cur);
        if (v >= 150) return alert(`AQI ${v}`, "Unhealthy — sensitive groups at risk");
        if (v >= 100) return watch(`AQI ${v}`, "Above WHO daily guideline");
        return calm(`AQI ${v}`, "Good air quality");
      }
      case "weather": {
        const t = data?.current?.temperature_2m;
        const wind = data?.current?.wind_speed_10m;
        if (t == null) return null;
        const daily = data?.daily?.temperature_2m_max ?? [];
        const mean = daily.length ? daily.reduce((a: number, b: number) => a + b, 0) / daily.length : t;
        const sd = stddev(daily) || 3;
        const dev = Math.abs(t - mean) / sd;
        if (wind >= 60 || dev >= 2.5) return alert(`${t}°C · ${wind} km/h`, "Extreme conditions");
        if (dev >= 1.5 || wind >= 40) return watch(`${t}°C · ${wind} km/h`, `${dev.toFixed(1)}σ from 5-day mean`);
        return calm(`${t}°C`, "Typical for the period");
      }
      case "iss":
      case "spacex":
      case "apod":
      case "mars":
      case "news":
      case "reddit":
      case "quote":
      case "clocks":
      case "countries":
      case "fx":
      case "github":
      case "covid":
      case "neo":
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
