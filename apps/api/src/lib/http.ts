export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }
  static badGateway(message: string, details?: unknown) {
    return new ApiError(502, 'BAD_GATEWAY', message, details);
  }
}

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { data, ...(meta ? { meta } : {}) };
}

export function paged<T>(data: T, total: number, page: number, pageSize: number) {
  return { data, meta: { total, page, pageSize } };
}