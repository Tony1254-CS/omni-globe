export type PresetWidget = { widget_type: string; x: number; y: number; w: number; h: number; settings: Record<string, string | number | boolean | null> };
export type Preset = { id: string; name: string; description: string; widgets: PresetWidget[] };

export const PRESETS: Preset[] = [
  {
    id: "humanitarian",
    name: "Humanitarian",
    description: "Earthquakes, air quality, weather warnings and world news.",
    widgets: [
      { widget_type: "earthquakes", x: 0, y: 0, w: 6, h: 4, settings: { minMagnitude: 4.0 } },
      { widget_type: "aqi", x: 6, y: 0, w: 6, h: 4, settings: { lat: 28.6139, lon: 77.209, label: "Delhi" } },
      { widget_type: "weather", x: 0, y: 4, w: 6, h: 4, settings: { lat: 6.5244, lon: 3.3792, label: "Lagos" } },
      { widget_type: "news", x: 6, y: 4, w: 6, h: 4, settings: { query: "humanitarian crisis" } },
    ],
  },
  {
    id: "financial",
    name: "Financial",
    description: "Crypto, FX and market-driven news.",
    widgets: [
      { widget_type: "crypto", x: 0, y: 0, w: 6, h: 4, settings: { coins: "bitcoin,ethereum,solana" } },
      { widget_type: "fx", x: 6, y: 0, w: 6, h: 4, settings: { base: "USD", quote: "EUR", amount: 1 } },
      { widget_type: "news", x: 0, y: 4, w: 12, h: 4, settings: { query: "markets stocks" } },
    ],
  },
  {
    id: "travel",
    name: "Travel",
    description: "Multi-city weather, air quality and world clocks.",
    widgets: [
      { widget_type: "weather", x: 0, y: 0, w: 4, h: 4, settings: { lat: 35.6762, lon: 139.6503, label: "Tokyo" } },
      { widget_type: "weather", x: 4, y: 0, w: 4, h: 4, settings: { lat: 40.7128, lon: -74.006, label: "New York" } },
      { widget_type: "weather", x: 8, y: 0, w: 4, h: 4, settings: { lat: -33.8688, lon: 151.2093, label: "Sydney" } },
      { widget_type: "aqi", x: 0, y: 4, w: 6, h: 4, settings: { lat: 35.6762, lon: 139.6503, label: "Tokyo" } },
      { widget_type: "clocks", x: 6, y: 4, w: 6, h: 4, settings: { zones: "UTC,America/New_York,Asia/Tokyo,Australia/Sydney" } },
    ],
  },
  {
    id: "space",
    name: "Space",
    description: "ISS, launches, APOD and Mars.",
    widgets: [
      { widget_type: "iss", x: 0, y: 0, w: 4, h: 4, settings: {} },
      { widget_type: "spacex", x: 4, y: 0, w: 4, h: 4, settings: {} },
      { widget_type: "apod", x: 8, y: 0, w: 4, h: 4, settings: {} },
      { widget_type: "mars", x: 0, y: 4, w: 6, h: 4, settings: { rover: "curiosity" } },
      { widget_type: "neo", x: 6, y: 4, w: 6, h: 4, settings: {} },
    ],
  },
];
