export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: T;
  public readonly meta?: PaginationMeta;

  constructor(statusCode: number, data: T, message = 'Success', meta?: PaginationMeta) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta;
  }

  static ok<T>(data: T, message = 'Success', meta?: PaginationMeta) {
    return new ApiResponse(200, data, message, meta);
  }

  static created<T>(data: T, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }
}
