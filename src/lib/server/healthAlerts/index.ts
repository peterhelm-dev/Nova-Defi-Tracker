import { join } from "node:path";
import { isVercelRuntime } from "../persistence";
import { createFileHealthAlertStore, type HealthAlertStore } from "./store";
import { createPostgresHealthAlertStore } from "./postgresStore";
import { createRedisHealthAlertStore } from "./redisStore";

export type HealthAlertBackend = "redis" | "postgres" | "file" | "none";

/**
 * Upstash wins when it is configured, including on Vercel Hobby with no database.
 * Postgres is next. The JSON file is only for a long-running machine, never Vercel.
 */
export function healthAlertBackend(): HealthAlertBackend {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (redisUrl && redisToken) return "redis";
  if (process.env.DATABASE_URL?.trim()) return "postgres";
  if (isVercelRuntime()) return "none";
  return "file";
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.ALERT_FROM_EMAIL?.trim());
}

/** Delivery needs a durable place to store the opt-in and a sender. */
export function healthAlertsConfigured(): boolean {
  return healthAlertBackend() !== "none" && resendConfigured();
}

let fileStore: HealthAlertStore | null = null;

export function getHealthAlertStore(): HealthAlertStore | null {
  const backend = healthAlertBackend();
  if (backend === "redis") {
    return createRedisHealthAlertStore({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });
  }
  if (backend === "postgres") {
    return createPostgresHealthAlertStore(process.env.DATABASE_URL!.trim());
  }
  if (backend === "file") {
    if (!fileStore) fileStore = createFileHealthAlertStore(join(process.cwd(), ".data", "health-alerts.json"));
    return fileStore;
  }
  return null;
}
