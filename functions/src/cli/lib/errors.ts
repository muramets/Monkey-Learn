/**
 * Typed CLI errors. The dispatcher surfaces `code` and `details` to stderr
 * so callers can branch on error type without string matching.
 */
export class CliError extends Error {
    public code: string;
    public details?: unknown;

    constructor(code: string, message: string, details?: unknown) {
        super(message);
        this.name = 'CliError';
        this.code = code;
        this.details = details;
    }
}

export function notFound(message: string, details?: unknown): CliError {
    return new CliError('NOT_FOUND', message, details);
}

export function validationError(message: string, details?: unknown): CliError {
    return new CliError('VALIDATION_ERROR', message, details);
}
