import { ZodError } from 'zod';
import { success, fail } from './lib/output';
import { CliError, validationError } from './lib/errors';
import { listPersonalities } from './handlers/listPersonalities';
import { listPowers } from './handlers/listPowers';
import { listActions } from './handlers/listActions';
import { listStates } from './handlers/listStates';
import { listCheckIns } from './handlers/listCheckIns';
import { getPowerTimeline } from './handlers/getPowerTimeline';
import { createPower } from './handlers/createPower';
import { createAction } from './handlers/createAction';
import { createState } from './handlers/createState';
import { createCheckIn } from './handlers/createCheckIn';
import { addComment } from './handlers/addComment';

type Handler = (raw: unknown) => Promise<unknown>;

const handlers: Record<string, Handler> = {
    listPersonalities,
    listPowers,
    listActions,
    listStates,
    listCheckIns,
    getPowerTimeline,
    createPower,
    createAction,
    createState,
    createCheckIn,
    addComment,
};

async function main(): Promise<void> {
    const [toolName, argsJson] = process.argv.slice(2);

    if (!toolName || toolName === '--help' || toolName === '-h') {
        success({
            usage: "GOOGLE_CLOUD_PROJECT=monkeylearn-4e739 node lib/functions/src/cli/cli-tool.js <toolName> '<json-args>'",
            tools: Object.keys(handlers).sort(),
        });
        return;
    }

    const handler = handlers[toolName];
    if (!handler) {
        fail(
            new CliError('UNKNOWN_TOOL', `Unknown tool: ${toolName}`, {
                available: Object.keys(handlers).sort(),
            })
        );
        return;
    }

    let args: unknown = {};
    if (argsJson !== undefined && argsJson !== '') {
        try {
            args = JSON.parse(argsJson);
        } catch (err) {
            fail(
                validationError(
                    `Invalid JSON args: ${err instanceof Error ? err.message : String(err)}`,
                    { raw: argsJson }
                )
            );
            return;
        }
    }

    try {
        const result = await handler(args);
        success(result);
    } catch (err) {
        if (err instanceof ZodError) {
            fail(
                validationError('Invalid input', {
                    issues: err.issues.map((i) => ({
                        path: i.path.join('.'),
                        code: i.code,
                        message: i.message,
                    })),
                })
            );
            return;
        }
        fail(err);
    }
}

main();
