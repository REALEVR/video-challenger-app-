export type Role = "VIEWER" | "CREATOR" | "ADMIN";
export type ChallengeStatus = "DRAFT" | "OPEN" | "VOTING" | "CLOSED" | "PAID";
export type PayoutModel = "VIEWS" | "VOTES" | "HYBRID";
export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PayoutStatus = "PENDING" | "SIMULATED" | "PROCESSING" | "PAID" | "FAILED";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  avatarUrl?: string | null;
  bio?: string | null;
  hasStripeAccount?: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  coverImageUrl?: string | null;
  prizePoolCents: number;
  currency: string;
  payoutModel: PayoutModel;
  status: ChallengeStatus;
  submissionDeadline: string;
  votingDeadline: string;
  minViewsForPayout: number;
  createdById: string;
  createdBy?: { id: string; displayName: string; avatarUrl?: string | null };
  createdAt: string;
  submissions?: Submission[];
  _count?: { submissions: number };
}

export interface Submission {
  id: string;
  challengeId: string;
  userId: string;
  caption?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  status: SubmissionStatus;
  viewCount: number;
  voteCount: number;
  createdAt: string;
  user?: { id: string; displayName: string; avatarUrl?: string | null };
  challenge?: { id: string; title: string; status: ChallengeStatus };
  _count?: { comments: number };
}

export interface ChallengeListResponse {
  items: Challenge[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
}

export interface Comment {
  id: string;
  submissionId: string;
  userId: string;
  body: string;
  createdAt: string;
  user?: { id: string; displayName: string; avatarUrl?: string | null };
}

export interface Payout {
  id: string;
  challengeId: string;
  submissionId: string;
  userId: string;
  viewShare: number;
  voteShare: number;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  computedAt: string;
  paidAt?: string | null;
  user?: { id: string; displayName: string; avatarUrl?: string | null };
  submission?: { id: string; caption?: string | null; viewCount: number; voteCount: number };
  challenge?: { id: string; title: string };
}
