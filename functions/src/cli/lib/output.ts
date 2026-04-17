import { CliError } from './errors';

/**
 * Emit a JSON success result to stdout and exit cleanly.
 */
export function success(data: unknown): void {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    process.exit(0);
}

/**
 * Emit a JSON error envelope to stderr and exit with code 1.
 */
export function fail(err: unknown): void {
    const envelope = toEnvelope(err);
    process.stderr.write(JSON.stringify(envelope, null, 2) + '\n');
    process.exit(1);
}

function toEnvelope(err: unknown): { error: { code: string; message: string; details?: unknown } } {
    if (err instanceof CliError) {
        return { error: { code: err.code, message: err.message, details: err.details } };
    }
    if (err instanceof Error) {
        return { error: { code: 'INTERNAL', message: err.message } };
    }
    return { error: { code: 'INTERNAL', message: String(err) } };
}
