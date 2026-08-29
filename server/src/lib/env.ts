import "dotenv/config";
import path from "path";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  clientOrigin: required("CLIENT_ORIGIN", "http://localhost:5173"),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 200),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeConnectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL || "http://localhost:5173/profile",
  stripeConnectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL || "http://localhost:5173/profile",
};
