import { type ApiKey, type InsertApiKey, apiKeys } from "@shared/schema";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // API Keys
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  deleteApiKey(id: string): Promise<boolean>;
  incrementApiKeyUsage(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const results = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    return results[0];
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const results = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
    return results[0];
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const key = "vf_sk_" + randomBytes(16).toString("hex");
    const results = await db.insert(apiKeys).values({
      ...insertApiKey,
      key,
    }).returning();
    return results[0];
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async incrementApiKeyUsage(id: string): Promise<void> {
    // Atomic SQL increment with returning clause to verify success
    // This generates: UPDATE api_keys SET usage = usage + 1 WHERE id = ? RETURNING *
    // The entire operation is atomic at the database level
    const result = await db.update(apiKeys)
      .set({ usage: sql`${apiKeys.usage} + 1` })
      .where(eq(apiKeys.id, id))
      .returning();
    
    // Verify exactly one row was updated
    if (result.length === 0) {
      throw new Error(`API key ${id} not found - unable to increment usage`);
    }
  }
}

export const storage = new DbStorage();
