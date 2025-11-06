import { type ApiKey, type InsertApiKey, apiKeys, type ClonedVoice, type InsertClonedVoice, clonedVoices } from "@shared/schema";
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
  
  // Cloned Voices
  getClonedVoice(id: string): Promise<ClonedVoice | undefined>;
  getAllClonedVoices(apiKeyId: string): Promise<ClonedVoice[]>;
  createClonedVoice(voice: InsertClonedVoice): Promise<ClonedVoice>;
  deleteClonedVoice(id: string): Promise<boolean>;
  updateClonedVoiceStatus(id: string, status: string): Promise<void>;
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

  async getClonedVoice(id: string): Promise<ClonedVoice | undefined> {
    const results = await db.select().from(clonedVoices).where(eq(clonedVoices.id, id)).limit(1);
    return results[0];
  }

  async getAllClonedVoices(apiKeyId: string): Promise<ClonedVoice[]> {
    return await db.select().from(clonedVoices).where(eq(clonedVoices.apiKeyId, apiKeyId));
  }

  async createClonedVoice(insertVoice: InsertClonedVoice): Promise<ClonedVoice> {
    const results = await db.insert(clonedVoices).values(insertVoice).returning();
    return results[0];
  }

  async deleteClonedVoice(id: string): Promise<boolean> {
    const result = await db.delete(clonedVoices).where(eq(clonedVoices.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateClonedVoiceStatus(id: string, status: string): Promise<void> {
    const result = await db.update(clonedVoices)
      .set({ status })
      .where(eq(clonedVoices.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Cloned voice ${id} not found - unable to update status`);
    }
  }
}

export const storage = new DbStorage();
