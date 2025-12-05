// ============================================
// Google Places Geocoding Service
// ============================================

/**
 * Google Places API endpoints
 * Documentation: https://developers.google.com/maps/documentation/places/web-service
 */
const GOOGLE_PLACES_AUTOCOMPLETE_API =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_PLACES_DETAILS_API =
  'https://maps.googleapis.com/maps/api/place/details/json';

/**
 * LocationSuggestion represents an autocomplete result from Google Places
 * Used in the dropdown before user selects a location
 */
export interface LocationSuggestion {
  placeId: string;
  mainText: string; // Primary text (e.g., "8 Legacy Lane")
  secondaryText: string; // Secondary text (e.g., "Brampton, ON, Canada")
  fullAddress: string; // Full description from Google
}

/**
 * LocationDetails represents full details from Google Place Details API
 * Returned after user selects a location from the dropdown
 */
export interface LocationDetails {
  placeId: string;
  displayName: string; // Full formatted address for display
  formattedAddress: string;
  streetNumber: string;
  street: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

/**
 * Google Places Autocomplete API response types
 */
interface GooglePlacesPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  types: string[];
}

interface GooglePlacesAutocompleteResponse {
  status: string;
  predictions: GooglePlacesPrediction[];
  error_message?: string;
}

/**
 * Google Places Details API response types
 */
interface GooglePlaceAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GooglePlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: GooglePlaceAddressComponent[];
}

interface GooglePlacesDetailsResponse {
  status: string;
  result?: GooglePlaceDetails;
  error_message?: string;
}

/**
 * Simple in-memory cache for location details to reduce API calls
 */
const detailsCache = new Map<
  string,
  { data: LocationDetails; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the Google Places API key from environment variable
 */
function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is not configured');
  }
  return apiKey;
}

/**
 * Extract address component by type
 */
function getAddressComponent(
  components: GooglePlaceAddressComponent[],
  type: string,
  useShortName: boolean = false
): string {
  const component = components.find((c) => c.types.includes(type));
  return component
    ? useShortName
      ? component.short_name
      : component.long_name
    : '';
}

/**
 * Parse Google Place Details into LocationDetails
 */
function parseLocationDetails(place: GooglePlaceDetails): LocationDetails {
  const components = place.address_components;

  return {
    placeId: place.place_id,
    displayName: place.formatted_address,
    formattedAddress: place.formatted_address,
    streetNumber: getAddressComponent(components, 'street_number'),
    street: getAddressComponent(components, 'route'),
    city:
      getAddressComponent(components, 'locality') ||
      getAddressComponent(components, 'sublocality') ||
      getAddressComponent(components, 'administrative_area_level_2'),
    state: getAddressComponent(components, 'administrative_area_level_1'),
    stateCode: getAddressComponent(
      components,
      'administrative_area_level_1',
      true
    ),
    postalCode: getAddressComponent(components, 'postal_code'),
    country: getAddressComponent(components, 'country'),
    countryCode: getAddressComponent(components, 'country', true),
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
  };
}

/**
 * Search for location suggestions using Google Places Autocomplete API
 *
 * @param query - Search query string (e.g., "123 Main St, New York")
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Array of location suggestions with placeId (coordinates fetched on selection)
 *
 * @example
 * const suggestions = await searchLocations("8 Legacy Lane");
 * // Returns: [
 * //   { placeId: "ChIJ...", mainText: "8 Legacy Lane", secondaryText: "Brampton, ON, Canada", ... },
 * //   ...
 * // ]
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
    const apiKey = getApiKey();
    const url = new URL(GOOGLE_PLACES_AUTOCOMPLETE_API);
    url.searchParams.set('input', trimmedQuery);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('types', 'address');
    url.searchParams.set('language', 'en');
    // Bias towards Canada and US for better results
    url.searchParams.set('components', 'country:ca|country:us');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      // Cache for 5 minutes since location data is relatively stable
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(
        `Google Places API error: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const data: GooglePlacesAutocompleteResponse = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`Google Places API error: ${data.status}`, data.error_message);
      return [];
    }

    if (!data.predictions || data.predictions.length === 0) {
      return [];
    }

    // Limit results
    const predictions = data.predictions.slice(0, limit);

    // Map predictions to LocationSuggestion format
    const suggestions: LocationSuggestion[] = predictions.map((prediction) => ({
      placeId: prediction.place_id,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text || '',
      fullAddress: prediction.description,
    }));

    return suggestions;
  } catch (error) {
    console.error('Location search error:', error);
    return [];
  }
}

/**
 * Get full location details including coordinates from Google Places Details API
 *
 * @param placeId - Google Place ID from autocomplete suggestion
 * @returns LocationDetails with full address components and coordinates
 *
 * @example
 * const details = await getLocationDetails("ChIJ...");
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
export async function getLocationDetails(
  placeId: string
): Promise<LocationDetails | null> {
  if (!placeId) {
    return null;
  }

  // Check cache first
  const cached = detailsCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiKey = getApiKey();
    const url = new URL(GOOGLE_PLACES_DETAILS_API);
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', apiKey);
    url.searchParams.set(
      'fields',
      'place_id,formatted_address,geometry,address_components'
    );
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(
        `Google Places Details API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data: GooglePlacesDetailsResponse = await response.json();

    if (data.status !== 'OK' || !data.result) {
      console.error(
        `Google Places Details API error: ${data.status}`,
        data.error_message
      );
      return null;
    }

    const details = parseLocationDetails(data.result);

    // Cache the result
    detailsCache.set(placeId, { data: details, timestamp: Date.now() });

    return details;
  } catch (error) {
    console.error('Location details error:', error);
    return null;
  }
}

/**
 * Format a location for display
 * Returns the full display name with proper formatting
 *
 * @param details - LocationDetails object
 * @returns Formatted display string
 *
 * @example
 * const formatted = formatLocationName(details);
 * // Returns: "8 Legacy Lane, Brampton, ON L6X 4T4, Canada"
 */
export function formatLocationName(details: LocationDetails): string {
  return details.displayName;
}

/**
 * Get a compact location string (city, state/country)
 * Useful for shorter display contexts
 *
 * @param details - LocationDetails object
 * @returns Compact location string
 *
 * @example
 * const compact = getCompactLocation(details);
 * // Returns: "Brampton, ON" or "Toronto, ON"
 */
export function getCompactLocation(details: LocationDetails): string {
  const parts: string[] = [];

  if (details.city) {
    parts.push(details.city);
  }

  // Prefer abbreviated state code
  if (details.stateCode) {
    parts.push(details.stateCode);
  } else if (details.state) {
    parts.push(details.state);
  } else if (details.country) {
    parts.push(details.country);
  }

  return parts.join(', ') || details.displayName;
}

/**
 * Clear the location details cache
 * Useful for testing or when you need to force fresh data
 */
export function clearLocationCache(): void {
  detailsCache.clear();
}
