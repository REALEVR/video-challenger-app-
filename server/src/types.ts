// SQLite has no native enum support, so Prisma models store these as plain
// Strings (see prisma/schema.prisma). These are the app-level "enums" that
// constrain them — zod schemas in the routes validate incoming values
// against the same lists.

export const ROLES = ["VIEWER", "CREATOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const CHALLENGE_STATUSES = ["DRAFT", "OPEN", "VOTING", "CLOSED", "PAID"] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const PAYOUT_MODELS = ["VIEWS", "VOTES", "HYBRID"] as const;
export type PayoutModel = (typeof PAYOUT_MODELS)[number];

export const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const PAYOUT_STATUSES = ["PENDING", "SIMULATED", "PROCESSING", "PAID", "FAILED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
