'use server';

import { Weather } from '@/types/journal';
import { getWeatherForLocation, getWeatherByCoordinates } from '@/lib/services/weather';

/**
 * Weather result returned by the server action
 */
export interface WeatherResult {
  weather: Weather;
  temperature: number;
  description: string;
}

/**
 * Get weather for a location string
 *
 * @param location - Location string (e.g., "Bangalore, India", "New York, USA")
 * @returns Weather data or null if location not found or API error
 *
 * @example
 * const result = await getWeatherForLocationAction("Bangalore, India");
 * // Returns: { weather: "sunny", temperature: 28, description: "Clear sky" }
 *
 * @example
 * const result = await getWeatherForLocationAction("New York");
 * // Returns: { weather: "cloudy", temperature: 15, description: "Partly cloudy" }
 */
export async function getWeatherForLocationAction(
  location: string
): Promise<WeatherResult | null> {
  if (!location || location.trim().length === 0) {
    console.warn('getWeatherForLocationAction: Empty location provided');
    return null;
  }

  try {
    const result = await getWeatherForLocation(location);

    if (!result) {
      console.warn(`getWeatherForLocationAction: No weather data for "${location}"`);
      return null;
    }

    // Return only the required fields (exclude locationName and country)
    return {
      weather: result.weather,
      temperature: result.temperature,
      description: result.description,
    };
  } catch (error) {
    console.error('getWeatherForLocationAction error:', error);
    return null;
  }
}

/**
 * Extended weather result with location details
 */
export interface WeatherResultWithLocation extends WeatherResult {
  locationName: string;
  country: string;
}

/**
 * Get weather for a location with resolved location details
 * Useful when you want to show the canonical location name
 *
 * @param location - Location string (e.g., "Bangalore", "NYC")
 * @returns Weather data with resolved location, or null if not found
 *
 * @example
 * const result = await getWeatherWithLocationAction("Bangalore");
 * // Returns: {
 * //   weather: "sunny",
 * //   temperature: 28,
 * //   description: "Clear sky",
 * //   locationName: "Bengaluru",
 * //   country: "India"
 * // }
 */
export async function getWeatherWithLocationAction(
  location: string
): Promise<WeatherResultWithLocation | null> {
  if (!location || location.trim().length === 0) {
    console.warn('getWeatherWithLocationAction: Empty location provided');
    return null;
  }

  try {
    const result = await getWeatherForLocation(location);

    if (!result) {
      console.warn(`getWeatherWithLocationAction: No weather data for "${location}"`);
      return null;
    }

    return {
      weather: result.weather,
      temperature: result.temperature,
      description: result.description,
      locationName: result.locationName,
      country: result.country,
    };
  } catch (error) {
    console.error('getWeatherWithLocationAction error:', error);
    return null;
  }
}

/**
 * Get weather by coordinates directly
 * Use this when you already have latitude/longitude (e.g., from Photon location search)
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 * @returns Weather data or null if coordinates are invalid or API error
 *
 * @example
 * const result = await getWeatherByCoordinatesAction(40.7128, -74.0060);
 * // Returns: { weather: "cloudy", temperature: 15, description: "Partly cloudy" }
 *
 * @example
 * // Use with Photon location suggestion
 * const suggestion = await searchLocationsAction("New York");
 * if (suggestion[0]) {
 *   const weather = await getWeatherByCoordinatesAction(
 *     suggestion[0].latitude,
 *     suggestion[0].longitude
 *   );
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
