import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Lazy database initialization - only connects when actually used
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not set - database features will be unavailable");
    console.warn("[Database] Voice library, campaigns, and call history will not persist");
    return null;
  }

  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle({ client: _pool, schema });
    console.log("[Database] Connected to PostgreSQL database");
  }

  return { pool: _pool, db: _db };
}

export const getDatabase = () => {
  const result = initializeDatabase();
  if (!result) {
    throw new Error("Database not available - DATABASE_URL not configured");
  }
  return result;
};

// Export lazy accessors
export const pool = new Proxy({} as Pool, {
  get(target, prop) {
    return getDatabase().pool[prop as keyof Pool];
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDatabase().db[prop as keyof ReturnType<typeof drizzle>];
  }
});
