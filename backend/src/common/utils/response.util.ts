/**
 * Standard API response envelope used across all customer endpoints.
 */
export interface IApiResponse<T = null> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

export function successResponse<T>(
  data: T,
  message = 'Request successful',
  statusCode = 200,
  meta?: Record<string, unknown>,
  requestId?: string
): IApiResponse<T> {
  return {
    success: true,
    statusCode,
    message,
    data,
    ...(meta ? { meta } : {}),
    ...(requestId ? { requestId } : {}),
    timestamp: new Date().toISOString(),
  };
}

export function createdResponse<T>(
  data: T,
  message = 'Resource created successfully',
  requestId?: string
): IApiResponse<T> {
  return successResponse(data, message, 201, undefined, requestId);
}

export function errorResponse(
  message: string,
  statusCode = 500,
  errorCode?: string,
  errors?: unknown[],
  requestId?: string
): IApiResponse<null> {
  return {
    success: false,
    statusCode,
    message,
    data: null,
    ...(errorCode ? { errorCode } : {}),
    ...(errors && errors.length ? { errors } : {}),
    ...(requestId ? { requestId } : {}),
    timestamp: new Date().toISOString(),
  };
}
