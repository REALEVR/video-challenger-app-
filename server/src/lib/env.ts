import "dotenv/config";
import path from "path";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

const isProduction = process.env.NODE_ENV === "production";

// Placeholder secrets that ship in .env.example / docker-compose.yml. Anyone
// who has read the repo knows them, so a server signing JWTs with one lets
// anybody mint a token for any user — including role "ADMIN".
const KNOWN_PLACEHOLDER_SECRETS = new Set(["dev-only-change-me", "change-me-in-prod"]);

function jwtSecret(): string {
  const v = process.env.JWT_SECRET;
  if (isProduction) {
    if (!v || KNOWN_PLACEHOLDER_SECRETS.has(v) || v.length < 32) {
      throw new Error(
        "JWT_SECRET must be set to a random value of at least 32 characters in production " +
          "(generate one with: openssl rand -base64 32)."
      );
    }
    return v;
  }
  return v || "dev-only-change-me";
}

/**
 * How many reverse-proxy hops to trust for req.ip / req.protocol.
 * Accepts a hop count ("1", "2") or anything Express's "trust proxy" setting
 * accepts ("loopback", a CIDR list, ...). Behind Vercel's rewrite AND
 * Railway's edge there are two hops; trusting only one makes every visitor
 * share Vercel's egress IP, so the rate limiters lock everyone out together.
 */
function trustProxy(): number | string {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return 1;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: jwtSecret(),
  trustProxy: trustProxy(),
  clientOrigin: required("CLIENT_ORIGIN", "http://localhost:5173"),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 200),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeConnectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL || "http://localhost:5173/profile",
  stripeConnectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL || "http://localhost:5173/profile",
};
