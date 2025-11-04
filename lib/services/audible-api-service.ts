/**
 * Audible API Service
 *
 * Communicates with the Python Audible microservice
 */

import type {
  AudibleAuthRequest,
  AudibleAuthResponse,
  AudibleLibraryRequest,
  AudibleLibraryResponse,
  AudibleProgressRequest,
  AudibleProgressResponse,
} from '@/lib/types/audible';

const AUDIBLE_SERVICE_URL = process.env.AUDIBLE_SERVICE_URL || 'http://localhost:5001';
const API_SECRET = process.env.AUDIBLE_API_SECRET || '';

export class AudibleApiService {
  /**
   * Make authenticated request to Python service
   */
  private static async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${AUDIBLE_SERVICE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (API_SECRET) {
      headers['X-API-Secret'] = API_SECRET;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Authenticate with Audible
   */
  static async authenticate(
    email: string,
    password: string,
    countryCode: string = 'us'
  ): Promise<AudibleAuthResponse> {
    const request: AudibleAuthRequest = {
      email,
      password,
      country_code: countryCode,
    };

    return this.request<AudibleAuthResponse>('/api/auth', 'POST', request);
  }

  /**
   * Fetch user's complete Audible library
   */
  static async getLibrary(
    accessToken: string,
    refreshToken: string,
    countryCode: string = 'us'
  ): Promise<AudibleLibraryResponse> {
    const request: AudibleLibraryRequest = {
      access_token: accessToken,
      refresh_token: refreshToken,
      country_code: countryCode,
    };

    return this.request<AudibleLibraryResponse>('/api/library', 'POST', request);
  }

  /**
   * Get progress for specific book
   */
  static async getProgress(
    asin: string,
    accessToken: string,
    refreshToken: string,
    countryCode: string = 'us'
  ): Promise<AudibleProgressResponse> {
    const request: AudibleProgressRequest = {
      access_token: accessToken,
      refresh_token: refreshToken,
      country_code: countryCode,
      asin,
    };

    return this.request<AudibleProgressResponse>(
      `/api/progress/${asin}`,
      'POST',
      request
    );
  }

  /**
   * Refresh access token
   */
  static async refreshToken(
    refreshToken: string,
    countryCode: string = 'us'
  ): Promise<{ access_token: string; expires_at: string }> {
    return this.request('/api/refresh-token', 'POST', {
      refresh_token: refreshToken,
      country_code: countryCode,
    });
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health', 'GET');
  }
}
