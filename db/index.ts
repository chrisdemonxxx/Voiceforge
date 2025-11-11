import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Development mode: Allow running without database
const isDevelopment = process.env.NODE_ENV === 'development';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  if (isDevelopment) {
    console.warn("[Database] No DATABASE_URL set. Running in development mode with limited functionality.");
    console.warn("[Database] Some features (API keys, voice cloning, agent flows) will not persist.");
    console.warn("[Database] To enable full functionality, set up a PostgreSQL database.");
  } else {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
}

// Create pool only if DATABASE_URL is provided
export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = pool ? drizzle({ client: pool, schema }) : null;
