export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
export class BadRequestError extends AppError {
    constructor(message = "Bad Request", details = null) {
        super(message, 400, "BAD_REQUEST", details);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized", details = null) {
        super(message, 401, "UNAUTHORIZED", details);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = "Forbidden", details = null) {
        super(message, 403, "FORBIDDEN", details);
    }
}
export class NotFoundError extends AppError {
    constructor(message = "Not Found", details = null) {
        super(message, 404, "NOT_FOUND", details);
    }
}
export class ConflictError extends AppError {
    constructor(message = "Conflict", details = null) {
        super(message, 409, "CONFLICT", details);
    }
}
export class ValidationError extends AppError {
    constructor(message = "Validation Error", details = null) {
        super(message, 422, "VALIDATION_ERROR", details);
    }
}
export class TooManyRequestsError extends AppError {
    constructor(message = "Too Many Requests", details = null) {
        super(message, 429, "TOO_MANY_REQUESTS", details);
    }
}
export class InternalServerError extends AppError {
    constructor(message = "Internal Server Error", details = null) {
        super(message, 500, "INTERNAL_SERVER_ERROR", details);
    }
}
export const isAppError = (err) => {
    return err instanceof AppError;
};
