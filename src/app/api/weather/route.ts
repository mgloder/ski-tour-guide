import { NextRequest, NextResponse } from "next/server";

const WEATHER_DESCRIPTIONS: Record<string, string> = {
  "0":  "Clear",
  "1":  "Partly cloudy",
  "2":  "Partly cloudy",
  "3":  "Partly cloudy",
  "45": "Fog",
  "48": "Fog",
  "51": "Rain",
  "53": "Rain",
  "55": "Rain",
  "56": "Rain",
  "57": "Rain",
  "61": "Rain",
  "63": "Rain",
  "65": "Rain",
  "66": "Rain",
  "67": "Rain",
  "71": "Snow",
  "73": "Snow",
  "75": "Snow",
  "77": "Snow",
  "80": "Showers",
  "81": "Showers",
  "82": "Showers",
  "85": "Snow showers",
  "86": "Snow showers",
  "95": "Thunderstorm",
  "96": "Thunderstorm",
  "99": "Thunderstorm",
};

function describeCode(code: number): string {
  // Exact match first
  const exact = WEATHER_DESCRIPTIONS[String(code)];
  if (exact) return exact;
  // Range fallback
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing required query parameters: lat, lng" },
      { status: 400 },
    );
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json(
      { error: "lat and lng must be valid numbers" },
      { status: 400 },
    );
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latNum}&longitude=${lngNum}` +
    `&current=temperature_2m,wind_speed_10m,snowfall,weather_code` +
    `&wind_speed_unit=kmh`;

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Open-Meteo returned ${res.status}` },
      { status: 502 },
    );
  }

  const data = await res.json() as {
    current: {
      temperature_2m: number;
      wind_speed_10m: number;
      snowfall: number;
      weather_code: number;
    };
  };

  const { temperature_2m, wind_speed_10m, snowfall, weather_code } = data.current;

  return NextResponse.json({
    temperature_2m,
    wind_speed_10m,
    snowfall,
    weather_code,
    description: describeCode(weather_code),
  });
}
