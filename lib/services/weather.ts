import { Weather } from '@/types/journal';

// ============================================
// Open-Meteo Weather Service (by coordinates only)
// Location geocoding is handled by Photon in location.ts
// ============================================

/**
 * Open-Meteo Weather API endpoint (free, no API key required)
 */
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

/**
 * Weather response from Open-Meteo
 */
interface WeatherResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
}

/**
 * Weather code description mapping
 * Based on WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
interface WeatherCodeInfo {
  weather: Weather;
  description: string;
}

const WEATHER_CODE_MAP: Record<number, WeatherCodeInfo> = {
  // Clear sky
  0: { weather: 'sunny', description: 'Clear sky' },

  // Mainly clear, partly cloudy, overcast
  1: { weather: 'cloudy', description: 'Mainly clear' },
  2: { weather: 'cloudy', description: 'Partly cloudy' },
  3: { weather: 'cloudy', description: 'Overcast' },

  // Fog and depositing rime fog
  45: { weather: 'cloudy', description: 'Fog' },
  48: { weather: 'cloudy', description: 'Depositing rime fog' },

  // Drizzle
  51: { weather: 'rainy', description: 'Light drizzle' },
  53: { weather: 'rainy', description: 'Moderate drizzle' },
  55: { weather: 'rainy', description: 'Dense drizzle' },

  // Freezing drizzle
  56: { weather: 'rainy', description: 'Light freezing drizzle' },
  57: { weather: 'rainy', description: 'Dense freezing drizzle' },

  // Rain
  61: { weather: 'rainy', description: 'Slight rain' },
  63: { weather: 'rainy', description: 'Moderate rain' },
  65: { weather: 'rainy', description: 'Heavy rain' },

  // Freezing rain
  66: { weather: 'rainy', description: 'Light freezing rain' },
  67: { weather: 'rainy', description: 'Heavy freezing rain' },

  // Snow fall
  71: { weather: 'snowy', description: 'Slight snow fall' },
  73: { weather: 'snowy', description: 'Moderate snow fall' },
  75: { weather: 'snowy', description: 'Heavy snow fall' },

  // Snow grains
  77: { weather: 'snowy', description: 'Snow grains' },

  // Rain showers
  80: { weather: 'rainy', description: 'Slight rain showers' },
  81: { weather: 'rainy', description: 'Moderate rain showers' },
  82: { weather: 'rainy', description: 'Violent rain showers' },

  // Snow showers
  85: { weather: 'snowy', description: 'Slight snow showers' },
  86: { weather: 'snowy', description: 'Heavy snow showers' },

  // Thunderstorm
  95: { weather: 'stormy', description: 'Thunderstorm' },
  96: { weather: 'stormy', description: 'Thunderstorm with slight hail' },
  99: { weather: 'stormy', description: 'Thunderstorm with heavy hail' },
};

/**
 * Get weather info from weather code
 */
function getWeatherFromCode(code: number): WeatherCodeInfo {
  return WEATHER_CODE_MAP[code] ?? { weather: 'cloudy', description: 'Unknown conditions' };
}

/**
 * Fetch current weather for given coordinates
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Weather data or null if failed
 *
 * @example
 * const weather = await fetchWeatherByCoords(43.685832, -79.7599366);
 * // Returns: { weather: "cloudy", temperature: 5, description: "Partly cloudy" }
 */
async function fetchWeatherByCoords(
  latitude: number,
  longitude: number
): Promise<{
  weather: Weather;
  temperature: number;
  description: string;
} | null> {
  try {
    const url = new URL(WEATHER_API);
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 15 minutes since weather changes
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      console.error(`Weather API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: WeatherResponse = await response.json();

    if (!data.current) {
      console.error('No current weather data in response');
      return null;
    }

    const { weather, description } = getWeatherFromCode(data.current.weather_code);

    return {
      weather,
      temperature: Math.round(data.current.temperature_2m),
      description,
    };
  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
}

/**
 * Get weather by coordinates
 * Use with coordinates from Photon location autocomplete
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 * @returns Weather data or null if failed
 *
 * @example
 * // Use with Photon location suggestion
 * const suggestion = await searchLocationsAction("8 Legacy Lane");
 * if (suggestion[0]) {
 *   const weather = await getWeatherByCoordinates(
 *     suggestion[0].latitude,
 *     suggestion[0].longitude
 *   );
 * }
 */
export async function getWeatherByCoordinates(
  latitude: number,
  longitude: number
): Promise<{
  weather: Weather;
  temperature: number;
  description: string;
} | null> {
  // Validate coordinates
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude)
  ) {
    console.error('getWeatherByCoordinates: Invalid coordinates provided');
    return null;
  }

  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90) {
    console.error(`getWeatherByCoordinates: Latitude ${latitude} out of range (-90 to 90)`);
    return null;
  }

  if (longitude < -180 || longitude > 180) {
    console.error(`getWeatherByCoordinates: Longitude ${longitude} out of range (-180 to 180)`);
    return null;
  }

  return fetchWeatherByCoords(latitude, longitude);
}
