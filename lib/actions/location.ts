'use server';

import {
  searchLocations,
  getLocationDetails,
  LocationSuggestion,
  LocationDetails,
  formatLocationName,
  getCompactLocation,
} from '@/lib/services/location';

// Re-export types for client-side use
export type { LocationSuggestion, LocationDetails };

/**
 * Search for location suggestions using Google Places Autocomplete
 * Server action that wraps the Google Places geocoding service
 *
 * @param query - Search query string (minimum 2 characters)
 * @returns Array of location suggestions (use getLocationDetailsAction to get full details with coordinates)
 *
 * @example
 * const suggestions = await searchLocationsAction("8 Legacy Lane");
 * // Returns: [
 * //   { placeId: "ChIJ...", mainText: "8 Legacy Lane", secondaryText: "Brampton, ON, Canada", ... },
 * //   ...
 * // ]
 */
export async function searchLocationsAction(
  query: string
): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    return await searchLocations(query);
  } catch (error) {
    console.error('Location search failed:', error);
    return [];
  }
}

/**
 * Get full location details including coordinates from Google Places Details API
 * Server action that fetches complete address information for a place
 *
 * @param placeId - Google Place ID from autocomplete suggestion
 * @returns LocationDetails with full address components and coordinates, or null on error
 *
 * @example
 * const details = await getLocationDetailsAction("ChIJ...");
 * // Returns: {
 * //   placeId: "ChIJ...",
 * //   displayName: "8 Legacy Lane, Brampton, ON L6X 4T4, Canada",
 * //   formattedAddress: "8 Legacy Lane, Brampton, ON L6X 4T4, Canada",
 * //   streetNumber: "8",
 * //   street: "Legacy Lane",
 * //   city: "Brampton",
 * //   state: "Ontario",
 * //   stateCode: "ON",
 * //   postalCode: "L6X 4T4",
 * //   country: "Canada",
 * //   countryCode: "CA",
 * //   latitude: 43.123456,
 * //   longitude: -79.123456
 * // }
 */
export async function getLocationDetailsAction(
  placeId: string
): Promise<LocationDetails | null> {
  if (!placeId) {
    return null;
  }

  try {
    return await getLocationDetails(placeId);
  } catch (error) {
    console.error('Location details fetch failed:', error);
    return null;
  }
}

/**
 * Format a location for display
 * Server action that returns the formatted display name
 *
 * @param details - LocationDetails to format
 * @returns Formatted display string
 *
 * @example
 * const display = await formatLocationNameAction(details);
 * // Returns: "8 Legacy Lane, Brampton, ON L6X 4T4, Canada"
 */
export async function formatLocationNameAction(
  details: LocationDetails
): Promise<string> {
  return formatLocationName(details);
}

/**
 * Get a compact location string
 * Server action that returns a shorter location format
 *
 * @param details - LocationDetails to format
 * @returns Compact location string
 *
 * @example
 * const compact = await getCompactLocationAction(details);
 * // Returns: "Brampton, ON"
 */
export async function getCompactLocationAction(
  details: LocationDetails
): Promise<string> {
  return getCompactLocation(details);
}
