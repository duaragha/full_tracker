'use server';

import { Weather } from '@/types/journal';
import { getWeatherByCoordinates } from '@/lib/services/weather';

/**
 * Weather result returned by the server action
 */
export interface WeatherResult {
  weather: Weather;
  temperature: number;
  description: string;
}

/**
 * Get weather by coordinates
 * Use with coordinates from Photon location autocomplete
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 * @returns Weather data or null if coordinates are invalid or API error
 *
 * @example
 * // Use with Photon location suggestion
 * const suggestions = await searchLocationsAction("8 Legacy Lane");
 * if (suggestions[0]) {
 *   const weather = await getWeatherByCoordinatesAction(
 *     suggestions[0].latitude,
 *     suggestions[0].longitude
 *   );
 *   // Returns: { weather: "cloudy", temperature: 5, description: "Partly cloudy" }
 * }
 */
export async function getWeatherByCoordinatesAction(
  latitude: number,
  longitude: number
): Promise<WeatherResult | null> {
  // Validate input types
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    console.warn('getWeatherByCoordinatesAction: Invalid coordinate types');
    return null;
  }

  // Validate coordinate values
  if (isNaN(latitude) || isNaN(longitude)) {
    console.warn('getWeatherByCoordinatesAction: NaN coordinates provided');
    return null;
  }

  try {
    const result = await getWeatherByCoordinates(latitude, longitude);

    if (!result) {
      console.warn(
        `getWeatherByCoordinatesAction: No weather data for coordinates (${latitude}, ${longitude})`
      );
      return null;
    }

    return {
      weather: result.weather,
      temperature: result.temperature,
      description: result.description,
    };
  } catch (error) {
    console.error('getWeatherByCoordinatesAction error:', error);
    return null;
  }
}
