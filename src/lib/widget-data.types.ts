export type WidgetSettings = Record<string, string | number | boolean | null>;

export type WidgetDataValue =
  | string
  | number
  | boolean
  | null
  | WidgetDataValue[]
  | { [key: string]: WidgetDataValue | undefined };

export type WidgetDataResult = {
  type: string;
  source: string;
  updatedAt: string;
  data: WidgetDataValue;
  error?: string;
};

export const DEFAULT_WIDGET_SETTINGS: Record<string, WidgetSettings> = {
  weather: { lat: 51.5072, lon: -0.1276, label: "London" },
  aqi: { lat: 51.5072, lon: -0.1276, label: "London" },
  earthquakes: { minMagnitude: 2.5 },
  iss: {},
  spacex: {},
  apod: {},
  mars: { rover: "curiosity" },
  neo: {},
  clocks: { zones: "UTC,America/New_York,Asia/Tokyo" },
  news: { query: "world" },
  reddit: { subreddit: "worldnews" },
  crypto: { coins: "bitcoin,ethereum,solana" },
  fx: { base: "USD", quote: "EUR", amount: 1 },
  countries: { country: "Japan" },
  github: { language: "typescript" },
  quote: {},
  covid: { country: "all" },
};