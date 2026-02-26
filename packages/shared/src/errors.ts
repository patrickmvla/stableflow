export class AppError extends Error {
	readonly type: string;
	readonly statusCode: number;
	readonly details?: Record<string, unknown>;

	constructor(
		message: string,
		type: string,
		statusCode: number,
		details?: Record<string, unknown>,
	) {
		super(message);
		this.name = this.constructor.name;
		this.type = type;
		this.statusCode = statusCode;
		this.details = details;
	}

	toJSON(): { error: { type: string; message: string; details?: Record<string, unknown> } } {
		return {
			error: {
				type: this.type,
				message: this.message,
				...(this.details ? { details: this.details } : {}),
			},
		};
	}
}

export class NotFoundError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "NOT_FOUND", 404, details);
	}
}

export class ValidationError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "VALIDATION_ERROR", 400, details);
	}
}

export class ConflictError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "CONFLICT", 409, details);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "UNAUTHORIZED", 401, details);
	}
}

export class ForbiddenError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "FORBIDDEN", 403, details);
	}
}

export class InternalError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "INTERNAL_ERROR", 500, details);
	}
}

// Specific errors
export class AccountNotFoundError extends NotFoundError {
	constructor(id?: string) {
		super(id ? `Account not found: ${id}` : "Account not found");
		this.name = "AccountNotFoundError";
	}
}

export class PaymentNotFoundError extends NotFoundError {
	constructor(id?: string) {
		super(id ? `Payment not found: ${id}` : "Payment not found");
		this.name = "PaymentNotFoundError";
	}
}

export class SettlementNotFoundError extends NotFoundError {
	constructor(id?: string) {
		super(id ? `Settlement not found: ${id}` : "Settlement not found");
		this.name = "SettlementNotFoundError";
	}
}

export class InvalidStateTransitionError extends ConflictError {
	constructor(from: string, to: string) {
		super(`Invalid state transition: ${from} → ${to}`);
		this.name = "InvalidStateTransitionError";
	}
}

export class IdempotencyConflictError extends ConflictError {
	constructor(key: string) {
		super(`Idempotency key already used: ${key}`);
		this.name = "IdempotencyConflictError";
	}
}

export class LedgerImbalanceError extends InternalError {
	constructor(details?: Record<string, unknown>) {
		super("Ledger transaction does not balance: debits must equal credits", details);
		this.name = "LedgerImbalanceError";
	}
}

export class InsufficientFundsError extends ValidationError {
	constructor(details?: Record<string, unknown>) {
		super("Insufficient funds", details);
		this.name = "InsufficientFundsError";
	}
}

export class InvalidAmountError extends ValidationError {
	constructor(message = "Invalid amount") {
		super(message);
		this.name = "InvalidAmountError";
	}
}

export class APIKeyRevokedError extends UnauthorizedError {
	constructor() {
		super("API key has been revoked");
		this.name = "APIKeyRevokedError";
	}
}
