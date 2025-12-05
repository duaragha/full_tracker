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
  subtitle: string;       // Secondary line (e.g., "Brampton, ON L6X 5C1, Canada")
  city?: string;
  state?: string;
  stateCode?: string;     // Abbreviated state (e.g., "ON" for "Ontario")
  postcode?: string;
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
 * Common state/province abbreviations for major countries
 */
const STATE_ABBREVIATIONS: Record<string, string> = {
  // Canada
  'Alberta': 'AB',
  'British Columbia': 'BC',
  'Manitoba': 'MB',
  'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL',
  'Northwest Territories': 'NT',
  'Nova Scotia': 'NS',
  'Nunavut': 'NU',
  'Ontario': 'ON',
  'Prince Edward Island': 'PE',
  'Quebec': 'QC',
  'Saskatchewan': 'SK',
  'Yukon': 'YT',
  // United States
  'Alabama': 'AL',
  'Alaska': 'AK',
  'Arizona': 'AZ',
  'Arkansas': 'AR',
  'California': 'CA',
  'Colorado': 'CO',
  'Connecticut': 'CT',
  'Delaware': 'DE',
  'Florida': 'FL',
  'Georgia': 'GA',
  'Hawaii': 'HI',
  'Idaho': 'ID',
  'Illinois': 'IL',
  'Indiana': 'IN',
  'Iowa': 'IA',
  'Kansas': 'KS',
  'Kentucky': 'KY',
  'Louisiana': 'LA',
  'Maine': 'ME',
  'Maryland': 'MD',
  'Massachusetts': 'MA',
  'Michigan': 'MI',
  'Minnesota': 'MN',
  'Mississippi': 'MS',
  'Missouri': 'MO',
  'Montana': 'MT',
  'Nebraska': 'NE',
  'Nevada': 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  'Ohio': 'OH',
  'Oklahoma': 'OK',
  'Oregon': 'OR',
  'Pennsylvania': 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  'Tennessee': 'TN',
  'Texas': 'TX',
  'Utah': 'UT',
  'Vermont': 'VT',
  'Virginia': 'VA',
  'Washington': 'WA',
  'West Virginia': 'WV',
  'Wisconsin': 'WI',
  'Wyoming': 'WY',
  'District of Columbia': 'DC',
  // Australia
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
};

/**
 * Get abbreviated state code if available
 */
function getStateCode(state: string | undefined): string | undefined {
  if (!state) return undefined;
  return STATE_ABBREVIATIONS[state] || state;
}

/**
 * Build a display name from Photon properties
 * Creates a full address string like "8 Legacy Lane, Brampton, ON L6X 5C1"
 *
 * @param props - Photon feature properties
 * @returns Formatted display name (without country for brevity)
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

  // State/Province (abbreviated) + Postal code combined
  // Format: "ON L6X 5C1" or just "ON" or just "L6X 5C1"
  const stateCode = getStateCode(props.state);
  if (stateCode || props.postcode) {
    const statePostal = [stateCode, props.postcode].filter(Boolean).join(' ');
    parts.push(statePostal);
  }

  // If we have no parts, use any available info
  if (parts.length === 0) {
    if (props.country) parts.push(props.country);
    if (props.countrycode) parts.push(props.countrycode.toUpperCase());
  }

  return parts.join(', ') || 'Unknown location';
}

/**
 * Build a subtitle for dropdown display
 * Shows: "Brampton, ON L6X 5C1, Canada" (excludes street address)
 *
 * @param props - Photon feature properties
 * @returns Subtitle string for secondary display line
 */
function buildSubtitle(props: PhotonProperties): string {
  const parts: string[] = [];

  // City
  const locality = props.city || props.county || props.district;
  if (locality) {
    parts.push(locality);
  }

  // State/Province (abbreviated) + Postal code combined
  const stateCode = getStateCode(props.state);
  if (stateCode || props.postcode) {
    const statePostal = [stateCode, props.postcode].filter(Boolean).join(' ');
    parts.push(statePostal);
  }

  // Country
  if (props.country) {
    parts.push(props.country);
  }

  return parts.join(', ') || '';
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
    subtitle: buildSubtitle(props),
    city: props.city || props.county || props.district,
    state: props.state,
    stateCode: getStateCode(props.state),
    postcode: props.postcode,
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
 * // Returns: "New York, NY" or "Toronto, ON"
 */
export function getCompactLocation(suggestion: LocationSuggestion): string {
  const parts: string[] = [];

  if (suggestion.city) {
    parts.push(suggestion.city);
  } else if (suggestion.name) {
    parts.push(suggestion.name);
  }

  // Prefer abbreviated state code
  if (suggestion.stateCode) {
    parts.push(suggestion.stateCode);
  } else if (suggestion.state) {
    parts.push(suggestion.state);
  } else if (suggestion.country) {
    parts.push(suggestion.country);
  }

  return parts.join(', ') || suggestion.displayName;
}
