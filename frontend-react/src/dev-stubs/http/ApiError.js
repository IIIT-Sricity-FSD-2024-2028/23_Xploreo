// TEMP-STUB: one error type for every failed call, so pages handle errors the same way.
//   400 -> fieldErrors: { fieldName: 'message' }
//   401 -> session ended      403 -> not permitted (never retried)

const DEFAULT_MESSAGES = {
  0: 'Cannot reach the server. Check your connection and try again.',
  400: 'Please fix the highlighted fields.',
  401: 'Your session has ended. Please sign in again.',
  403: 'You are not permitted to do that.',
  404: 'We could not find that.',
};

export class ApiError extends Error {
  constructor(status, message, fieldErrors = null) {
    super(message || DEFAULT_MESSAGES[status] || 'Something went wrong. Please try again.');
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  // Nest validation errors look like { statusCode, message: ['price must not be less than 0', ...] }
  static fromResponse(status, data) {
    const raw = data?.message;
    const messages = Array.isArray(raw) ? raw : raw ? [raw] : [];
    let fieldErrors = null;
    if (status === 400 && Array.isArray(raw)) {
      fieldErrors = {};
      for (const m of raw) {
        const text = String(m);
        const extra = text.match(/^property (\S+) should not exist/);
        const field = extra ? extra[1] : text.split(' ')[0];
        if (!fieldErrors[field]) fieldErrors[field] = text;
      }
    }
    return new ApiError(status, messages[0] ? String(messages[0]) : undefined, fieldErrors);
  }
}
