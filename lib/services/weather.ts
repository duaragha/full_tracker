import { Weather } from '@/types/journal';

// ============================================
// Open-Meteo Weather Service
// ============================================

/**
 * Open-Meteo API endpoints (free, no API key required)
 */
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

/**
 * Geocoding result from Open-Meteo
 */
interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // State/Province
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

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
 * Geocode a location string to coordinates
 *
 * @param location - Location string (e.g., "Bangalore, India", "New York")
 * @returns Coordinates and location info, or null if not found
 *
 * @example
 * const coords = await geocodeLocation("Bangalore, India");
 * // Returns: { latitude: 12.9716, longitude: 77.5946, name: "Bengaluru", country: "India" }
 */
export async function geocodeLocation(location: string): Promise<{
  latitude: number;
  longitude: number;
  name: string;
  country: string;
} | null> {
  if (!location || location.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(GEOCODING_API);
    url.searchParams.set('name', location.trim());
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 1 hour since location coordinates don't change
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: GeocodingResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      console.warn(`No geocoding results for location: ${location}`);
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
      country: result.country,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Fetch current weather for given coordinates
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Weather data or null if failed
 *
 * @example
 * const weather = await fetchWeatherByCoords(12.9716, 77.5946);
 * // Returns: { weather: "sunny", temperature: 28, description: "Clear sky" }
 */
export async function fetchWeatherByCoords(
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
 * Get weather for a location string
 * Combines geocoding and weather fetching into one call
 *
 * @param location - Location string (e.g., "Bangalore, India")
 * @returns Weather data with location info, or null if failed
 *
 * @example
 * const result = await getWeatherForLocation("Bangalore, India");
 * // Returns: {
 * //   weather: "sunny",
 * //   temperature: 28,
 * //   description: "Clear sky",
 * //   locationName: "Bengaluru",
 * //   country: "India"
 * // }
 */
export async function getWeatherForLocation(location: string): Promise<{
  weather: Weather;
  temperature: number;
  description: string;
  locationName: string;
  country: string;
} | null> {
  // First, geocode the location
  const coords = await geocodeLocation(location);
  if (!coords) {
    return null;
  }

  // Then fetch the weather
  const weatherData = await fetchWeatherByCoords(coords.latitude, coords.longitude);
  if (!weatherData) {
    return null;
  }

  return {
    ...weatherData,
    locationName: coords.name,
    country: coords.country,
  };
}
