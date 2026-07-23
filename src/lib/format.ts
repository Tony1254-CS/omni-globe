// Small formatting helpers for timezone-aware dates and unit conversion.

export function formatInTz(value: unknown, tz?: string | null): string {
  if (value == null || value === "") return "—";
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat([], {
      timeZone: tz || undefined,
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatTimeInTz(tz: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat([], {
      timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(at);
  } catch {
    return at.toLocaleTimeString();
  }
}

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const kmhToMph = (kmh: number) => kmh * 0.621371;

// Minimal IANA timezone → ISO country map for the news `gl` param.
// Only the popular anchors are listed; anything else falls back to "US".
const TZ_TO_COUNTRY: Record<string, string> = {
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR",
  "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Zurich": "CH",
  "Europe/Vienna": "AT", "Europe/Stockholm": "SE", "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ", "Europe/Athens": "GR", "Europe/Lisbon": "PT",
  "Europe/Istanbul": "TR", "Europe/Moscow": "RU", "Europe/Kyiv": "UA",
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK",
  "Asia/Singapore": "SG", "Asia/Bangkok": "TH", "Asia/Jakarta": "ID",
  "Asia/Manila": "PH", "Asia/Kuala_Lumpur": "MY", "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA", "Asia/Jerusalem": "IL", "Asia/Tehran": "IR",
  "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Ho_Chi_Minh": "VN",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
  "Africa/Cairo": "EG", "Africa/Lagos": "NG", "Africa/Johannesburg": "ZA",
  "Africa/Nairobi": "KE", "Africa/Casablanca": "MA",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Montreal": "CA",
  "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Buenos_Aires": "AR",
  "America/Santiago": "CL", "America/Bogota": "CO", "America/Lima": "PE",
};

export function countryFromTz(tz: string | null | undefined): string {
  if (!tz) return "US";
  return TZ_TO_COUNTRY[tz] ?? "US";
}
