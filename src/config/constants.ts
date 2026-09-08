export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUTH = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  OTP_MAX_ATTEMPTS: 5,
  PASSWORD_RESET_EXPIRY_HOURS: 1,
  PASSWORD_MIN_LENGTH: 8,
  GUEST_TOKEN_LENGTH: 32,
} as const;

export const CART = {
  MAX_QUANTITY_PER_ITEM: 10,
  GUEST_CART_EXPIRY_DAYS: 30,
} as const;

export const ORDER = {
  PENDING_PAYMENT_TIMEOUT_MINUTES: 30,
  CANCELLABLE_STATUSES: ['PLACED', 'CONFIRMED'] as const,
} as const;

export const UPLOAD = {
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  MAX_PRODUCT_IMAGES: 10,
} as const;

export const RATE_LIMIT = {
  LOGIN: { windowMs: 15 * 60 * 1000, max: 5 },
  SIGNUP: { windowMs: 60 * 60 * 1000, max: 5 },
  OTP_SEND: { windowMs: 10 * 60 * 1000, max: 3 },
  FORGOT_PASSWORD: { windowMs: 60 * 60 * 1000, max: 3 },
  CONTACT_FORM: { windowMs: 60 * 60 * 1000, max: 3 },
  ORDER_CREATE: { windowMs: 60 * 60 * 1000, max: 10 },
  AUTHENTICATED: { windowMs: 15 * 60 * 1000, max: 300 },
  PUBLIC: { windowMs: 15 * 60 * 1000, max: 600 },
} as const;

/// Default values inserted into the settings table by the seeder.
export const DEFAULT_SETTINGS = {
  'gst.default_rate': 12,
  'shipping.mode': 'FREE_ABOVE',
  'shipping.flat_rate': 99,
  'shipping.free_above': 2000,
  'shipping.oversized_surcharge': 499,
  'cod.enabled': true,
  'cod.max_order_value': 5000,
  'returns.window_days': 7,
  'invoice.prefix': 'INV-2026-',
  'invoice.next_sequence': 1,
  'order.prefix': 'ORD-2026-',
  'order.next_sequence': 1,
  'payment.pending_timeout_min': 30,
  'announcement.text': 'Free shipping on orders above Rs.2000',
  'announcement.enabled': true,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
