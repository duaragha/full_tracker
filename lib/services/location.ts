// ============================================
// Photon Geocoding Service (OpenStreetMap-based)
// ============================================

/**
 * Photon API endpoint (free, no API key required)
 * Documentation: https://photon.komoot.io/
 */
const PHOTON_API = 'https://photon.komoot.io/api/';

/**
 * LocationSuggestion represents a geocoded location result
 */
export interface LocationSuggestion {
  id: string;
  name: string;           // Short name (e.g., "123 Main St")
  displayName: string;    // Full formatted name for display
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

/**
 * Photon API response types
 */
interface PhotonGeometry {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface PhotonProperties {
  osm_id?: number;
  osm_type?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countrycode?: string;
  type?: string;
}

interface PhotonFeature {
  type: 'Feature';
  geometry: PhotonGeometry;
  properties: PhotonProperties;
}

interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

/**
 * Build a display name from Photon properties
 * Creates a hierarchical display string from available address components
 *
 * @param props - Photon feature properties
 * @returns Formatted display name
 */
function buildDisplayName(props: PhotonProperties): string {
  const parts: string[] = [];

  // Street address (housenumber + street or just name)
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.name) {
    parts.push(props.name);
  }

  // City (use city, or fall back to county/district)
  const locality = props.city || props.county || props.district;
  if (locality && !parts.includes(locality)) {
    parts.push(locality);
  }

  // State/Province
  if (props.state && !parts.includes(props.state)) {
    parts.push(props.state);
  }

  // Country
  if (props.country && !parts.includes(props.country)) {
    parts.push(props.country);
  }

  // If we have no parts, use any available info
  if (parts.length === 0) {
    if (props.postcode) parts.push(props.postcode);
    if (props.countrycode) parts.push(props.countrycode.toUpperCase());
  }

  return parts.join(', ') || 'Unknown location';
}

/**
 * Get a short name for the location
 *
 * @param props - Photon feature properties
 * @returns Short display name
 */
function getShortName(props: PhotonProperties): string {
  // Prefer street address
  if (props.housenumber && props.street) {
    return `${props.housenumber} ${props.street}`;
  }

  // Fall back to name
  if (props.name) {
    return props.name;
  }

  // Fall back to street
  if (props.street) {
    return props.street;
  }

  // Fall back to city
  if (props.city) {
    return props.city;
  }

  // Fall back to county/district
  return props.county || props.district || props.state || props.country || 'Unknown';
}

/**
 * Generate a unique ID for a Photon feature
 *
 * @param feature - Photon feature
 * @returns Unique identifier string
 */
function generateFeatureId(feature: PhotonFeature): string {
  const props = feature.properties;

  // Use OSM ID if available
  if (props.osm_id && props.osm_type) {
    return `${props.osm_type}-${props.osm_id}`;
  }

  // Fall back to coordinates-based ID
  const [lon, lat] = feature.geometry.coordinates;
  return `loc-${lat.toFixed(6)}-${lon.toFixed(6)}`;
}

/**
 * Convert a Photon feature to a LocationSuggestion
 *
 * @param feature - Photon feature from API response
 * @returns LocationSuggestion object
 */
function parsePhotonFeature(feature: PhotonFeature): LocationSuggestion {
  const props = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;

  return {
    id: generateFeatureId(feature),
    name: getShortName(props),
    displayName: buildDisplayName(props),
    city: props.city || props.county || props.district,
    state: props.state,
    country: props.country,
    latitude,
    longitude,
  };
}

/**
 * Search for location suggestions using Photon API
 *
 * @param query - Search query string (e.g., "123 Main St, New York")
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Array of location suggestions
 *
 * @example
 * const suggestions = await searchLocations("New York");
 * // Returns: [
 * //   { id: "...", name: "New York", displayName: "New York, New York, United States", ... },
 * //   ...
 * // ]
 *
 * @example
 * const suggestions = await searchLocations("123 Main St, San Francisco");
 * // Returns address-level suggestions
 */
export async function searchLocations(
  query: string,
  limit: number = 5
): Promise<LocationSuggestion[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const trimmedQuery = query.trim();

  // Require at least 2 characters for a search
  if (trimmedQuery.length < 2) {
    return [];
  }

  try {
    const url = new URL(PHOTON_API);
    url.searchParams.set('q', trimmedQuery);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('lang', 'en');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes since location data is relatively stable
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`Photon API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: PhotonResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Parse and deduplicate results
    const suggestions = data.features.map(parsePhotonFeature);

    // Remove duplicates based on display name
    const seen = new Set<string>();
    return suggestions.filter((suggestion) => {
      const key = suggestion.displayName.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  } catch (error) {
    console.error('Location search error:', error);
    return [];
  }
}

/**
 * Format a location suggestion for display
 * Returns the full display name with proper formatting
 *
 * @param suggestion - LocationSuggestion object
 * @returns Formatted display string
 *
 * @example
 * const formatted = formatLocationName(suggestion);
 * // Returns: "123 Main St, New York, NY, United States"
 */
export function formatLocationName(suggestion: LocationSuggestion): string {
  return suggestion.displayName;
}

/**
 * Get a compact location string (city, state/country)
 * Useful for shorter display contexts
 *
 * @param suggestion - LocationSuggestion object
 * @returns Compact location string
 *
 * @example
 * const compact = getCompactLocation(suggestion);
 * // Returns: "New York, NY" or "Toronto, Canada"
 */
export function getCompactLocation(suggestion: LocationSuggestion): string {
  const parts: string[] = [];

  if (suggestion.city) {
    parts.push(suggestion.city);
  } else if (suggestion.name) {
    parts.push(suggestion.name);
  }

  if (suggestion.state) {
    parts.push(suggestion.state);
  } else if (suggestion.country) {
    parts.push(suggestion.country);
  }

  return parts.join(', ') || suggestion.displayName;
}
