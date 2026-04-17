import { z } from 'zod';

/**
 * Zod input schemas for every CLI tool. Each handler parses its args
 * through the matching schema — invalid input is rejected with
 * VALIDATION_ERROR before any Firestore access.
 *
 * Shared personality context fields are composed in via PersonalityCtx.
 */

const PersonalityCtx = z.object({
    personalityId: z.string().optional(),
    personalityName: z.string().optional(),
});

const DecayCfg = z.object({
    enabled: z.boolean(),
    amount: z.number().positive(),
    frequency: z.enum(['day', 'week', 'month']),
    interval: z.number().int().positive().optional(),
});

export const ListPersonalitiesInput = z.object({}).strict();
export const ListPowersInput = PersonalityCtx.strict();
export const ListActionsInput = PersonalityCtx.strict();
export const ListStatesInput = PersonalityCtx.strict();

export const ListCheckInsInput = PersonalityCtx.extend({
    since: z.string().optional(),
    until: z.string().optional(),
    limit: z.number().int().positive().max(1000).optional(),
    powerId: z.string().optional(),
    actionId: z.string().optional(),
    types: z.array(z.enum(['protocol', 'manual_adjustment', 'system', 'decay'])).optional(),
}).strict();

export const GetPowerTimelineInput = PersonalityCtx.extend({
    powerId: z.string(),
    days: z.number().int().positive().max(365).optional(),
}).strict();

export const CreatePowerInput = PersonalityCtx.extend({
    name: z.string().min(1),
    icon: z.string().optional(),
    description: z.string().optional(),
    hover: z.string().optional(),
    initialScore: z.number().min(0).optional(),
    color: z.string().optional(),
    category: z.enum(['skill', 'foundation']).nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    group: z.string().optional(),
    decay: DecayCfg.optional(),
}).strict();

export const CreateActionInput = PersonalityCtx.extend({
    title: z.string().min(1),
    description: z.string(),
    icon: z.string().optional(),
    color: z.string().optional(),
    weight: z.number().refine((v) => v !== 0, 'weight must be non-zero'),
    targets: z.array(z.string()).min(1),
    hover: z.string().optional(),
    instruction: z.string().optional(),
    group: z.string().optional(),
}).strict();

export const CreateStateInput = PersonalityCtx.extend({
    name: z.string().min(1),
    icon: z.string().optional(),
    subtext: z.string().optional(),
    description: z.string().optional(),
    hover: z.string().optional(),
    color: z.string().optional(),
    innerfaceIds: z.array(z.string()).optional(),
    stateIds: z.array(z.string()).optional(),
}).strict();

export const CreateCheckInInput = PersonalityCtx.extend({
    actionId: z.string(),
    comment: z.string().optional(),
    timestamp: z.string().optional(),
    idempotencyKey: z.string().optional(),
}).strict();

export const AddCommentInput = PersonalityCtx.extend({
    checkInId: z.string(),
    comment: z.string(),
}).strict();
