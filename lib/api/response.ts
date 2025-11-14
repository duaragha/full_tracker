/**
 * Standardized API Response Utilities
 *
 * Provides consistent response format for all API endpoints.
 *
 * @module lib/api/response
 */

import { NextResponse } from 'next/server'

// ============================================
// Types
// ============================================

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  pagination?: PaginationMeta
  meta?: Record<string, any>
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    field?: string
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
}

// ============================================
// Success Responses
// ============================================

/**
 * Return successful response with data
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
    },
    { status }
  )
}

/**
 * Return successful response with pagination
 */
export function paginatedResponse<T>(
  data: T,
  pagination: PaginationMeta,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
    },
    { status }
  )
}

/**
 * Return successful creation response (201)
 */
export function createdResponse<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return successResponse(data, 201)
}

/**
 * Return successful no-content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// ============================================
// Error Responses
// ============================================

/**
 * Return error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  )
}

/**
 * Return validation error (400)
 */
export function validationError(
  message: string,
  field?: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        ...(field && { field }),
        ...(details && { details }),
      },
    },
    { status: 400 }
  )
}

/**
 * Return not found error (404)
 */
export function notFoundError(
  resource: string = 'Resource'
): NextResponse<ApiErrorResponse> {
  return errorResponse('NOT_FOUND', `${resource} not found`, 404)
}

/**
 * Return conflict error (409)
 */
export function conflictError(message: string): NextResponse<ApiErrorResponse> {
  return errorResponse('CONFLICT', message, 409)
}

/**
 * Return internal server error (500)
 */
export function serverError(
  message: string = 'Internal server error'
): NextResponse<ApiErrorResponse> {
  return errorResponse('INTERNAL_ERROR', message, 500)
}

/**
 * Return bad request error (400)
 */
export function badRequestError(message: string): NextResponse<ApiErrorResponse> {
  return errorResponse('BAD_REQUEST', message, 400)
}

// ============================================
// Pagination Utilities
// ============================================

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number
  limit: number
  offset: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

// ============================================
// Query Parameter Utilities
// ============================================

/**
 * Parse boolean query parameter
 */
export function parseBoolean(value: string | null, defaultValue: boolean = false): boolean {
  if (value === null) return defaultValue
  return value === 'true' || value === '1'
}

/**
 * Parse number query parameter
 */
export function parseNumber(
  value: string | null,
  defaultValue?: number
): number | undefined {
  if (value === null) return defaultValue
  const parsed = parseInt(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Parse array query parameter (comma-separated)
 */
export function parseArray(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

/**
 * Parse number array query parameter (comma-separated)
 */
export function parseNumberArray(value: string | null): number[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => parseInt(v.trim()))
    .filter((n) => !isNaN(n))
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ''
  )

  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields as string[],
  }
}

/**
 * Validate that a value is one of allowed values
 */
export function validateEnum<T>(
  value: T,
  allowedValues: T[],
  fieldName: string = 'value'
): { isValid: boolean; error?: string } {
  if (!allowedValues.includes(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    }
  }
  return { isValid: true }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number,
  fieldName: string = 'value'
): { isValid: boolean; error?: string } {
  if (min !== undefined && value.length < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min} characters`,
    }
  }
  if (max !== undefined && value.length > max) {
    return {
      isValid: false,
      error: `${fieldName} must be at most ${max} characters`,
    }
  }
  return { isValid: true }
}

// ============================================
// Error Handling
// ============================================

/**
 * Handle API errors and return appropriate response
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error)

  if (error instanceof Error) {
    // Handle specific database errors
    if (error.message.includes('duplicate key')) {
      return conflictError('Resource already exists')
    }
    if (error.message.includes('foreign key')) {
      return validationError('Referenced resource does not exist')
    }
    if (error.message.includes('violates check constraint')) {
      return validationError('Invalid data format or value')
    }

    // Generic error
    return serverError(
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    )
  }

  return serverError()
}
