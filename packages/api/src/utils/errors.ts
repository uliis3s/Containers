export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(msg = 'Resource not found') {
    super(msg, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(msg: string) {
    super(msg, 400, 'VALIDATION_ERROR')
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = 'Authentication required') {
    super(msg, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Access denied') {
    super(msg, 403, 'FORBIDDEN')
  }
}

export class ConflictError extends AppError {
  constructor(msg = 'Resource already exists') {
    super(msg, 409, 'CONFLICT')
  }
}
