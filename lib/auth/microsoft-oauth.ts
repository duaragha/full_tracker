// ============================================
// Microsoft OAuth Authentication
// Handle OAuth flow for OneNote/Microsoft Graph API
// ============================================

import { ConfidentialClientApplication, AuthorizationUrlRequest, AuthorizationCodeRequest } from '@azure/msal-node'

export interface MicrosoftOAuthConfig {
  clientId: string
  clientSecret: string
  tenantId?: string
  redirectUri: string
}

export interface MicrosoftTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn: number
  tokenType: string
  scope: string
}

export interface MicrosoftUserInfo {
  id: string
  email: string
  displayName: string
}

/**
 * Microsoft OAuth scopes for OneNote access
 */
export const ONENOTE_SCOPES = [
  'User.Read',
  'Notes.ReadWrite',
  'Notes.Create',
  'offline_access'
]

/**
 * Create Microsoft authentication client
 */
export function createMicrosoftAuthClient(config: MicrosoftOAuthConfig): ConfidentialClientApplication {
  const msalConfig = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId || 'common'}`,
      clientSecret: config.clientSecret,
    }
  }

  return new ConfidentialClientApplication(msalConfig)
}

/**
 * Generate authorization URL for OAuth flow
 */
export async function getAuthorizationUrl(
  client: ConfidentialClientApplication,
  redirectUri: string,
  state?: string
): Promise<string> {
  const authCodeUrlParameters: AuthorizationUrlRequest = {
    scopes: ONENOTE_SCOPES,
    redirectUri: redirectUri,
    state: state,
    prompt: 'select_account'
  }

  return await client.getAuthCodeUrl(authCodeUrlParameters)
}

/**
 * Exchange authorization code for access token
 */
export async function getTokenFromCode(
  client: ConfidentialClientApplication,
  code: string,
  redirectUri: string
): Promise<MicrosoftTokenResponse> {
  const tokenRequest: AuthorizationCodeRequest = {
    code: code,
    scopes: ONENOTE_SCOPES,
    redirectUri: redirectUri,
  }

  const response = await client.acquireTokenByCode(tokenRequest)

  if (!response) {
    throw new Error('Failed to acquire token')
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresIn: response.expiresOn ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) : 3600,
    tokenType: response.tokenType || 'Bearer',
    scope: response.scopes?.join(' ') || ''
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  client: ConfidentialClientApplication,
  refreshToken: string
): Promise<MicrosoftTokenResponse> {
  const refreshTokenRequest = {
    refreshToken: refreshToken,
    scopes: ONENOTE_SCOPES,
  }

  const response = await client.acquireTokenByRefreshToken(refreshTokenRequest)

  if (!response) {
    throw new Error('Failed to refresh token')
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken || refreshToken,
    expiresIn: response.expiresOn ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) : 3600,
    tokenType: response.tokenType || 'Bearer',
    scope: response.scopes?.join(' ') || ''
  }
}

/**
 * Get user information from Microsoft Graph
 */
export async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  const data = await response.json()

  return {
    id: data.id,
    email: data.mail || data.userPrincipalName,
    displayName: data.displayName
  }
}

/**
 * Validate Microsoft access token
 */
export async function validateMicrosoftToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(expiresAt: Date, bufferSeconds: number = 300): boolean {
  return new Date(expiresAt.getTime() - bufferSeconds * 1000) < new Date()
}
