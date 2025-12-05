'use server';

import {
  searchLocations,
  LocationSuggestion,
  formatLocationName,
  getCompactLocation,
} from '@/lib/services/location';

// Re-export types for client-side use
export type { LocationSuggestion };

/**
 * Search for location suggestions
 * Server action that wraps the Photon geocoding service
 *
 * @param query - Search query string (minimum 2 characters)
 * @returns Array of location suggestions, or empty array on error
 *
 * @example
 * const suggestions = await searchLocationsAction("New York");
 * // Returns: [
 * //   { id: "...", name: "New York", displayName: "New York, New York, United States", ... },
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
 * Format a location for display
 * Server action that returns the formatted display name
 *
 * @param suggestion - LocationSuggestion to format
 * @returns Formatted display string
 *
 * @example
 * const display = await formatLocationNameAction(suggestion);
 * // Returns: "123 Main St, New York, NY, United States"
 */
export async function formatLocationNameAction(
  suggestion: LocationSuggestion
): Promise<string> {
  return formatLocationName(suggestion);
}

/**
 * Get a compact location string
 * Server action that returns a shorter location format
 *
 * @param suggestion - LocationSuggestion to format
 * @returns Compact location string
 *
 * @example
 * const compact = await getCompactLocationAction(suggestion);
 * // Returns: "New York, NY"
 */
export async function getCompactLocationAction(
  suggestion: LocationSuggestion
): Promise<string> {
  return getCompactLocation(suggestion);
}
