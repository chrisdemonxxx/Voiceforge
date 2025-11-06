import { type ApiKey, type InsertApiKey } from "@shared/schema";
import { randomUUID } from "crypto";
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

export class MemStorage implements IStorage {
  private apiKeys: Map<string, ApiKey>;

  constructor() {
    this.apiKeys = new Map();
    
    // Public demo key for landing page (well-known, no security risk for demo)
    const publicDemoKey: ApiKey = {
      id: "public-demo",
      name: "Public Landing Page Demo",
      key: "vf_demo_public_key_for_landing_page",
      createdAt: new Date("2025-01-01"),
      usage: 0,
      active: true,
    };
    
    // Create some default API keys for testing
    const defaultKey1: ApiKey = {
      id: randomUUID(),
      name: "Production API",
      key: "vf_sk_" + randomBytes(16).toString("hex"),
      createdAt: new Date("2025-01-01"),
      usage: 8234,
      active: true,
    };
    
    const defaultKey2: ApiKey = {
      id: randomUUID(),
      name: "Development",
      key: "vf_sk_" + randomBytes(16).toString("hex"),
      createdAt: new Date("2025-01-15"),
      usage: 423,
      active: true,
    };
    
    this.apiKeys.set(publicDemoKey.id, publicDemoKey);
    this.apiKeys.set(defaultKey1.id, defaultKey1);
    this.apiKeys.set(defaultKey2.id, defaultKey2);
  }

  async getApiKey(id: string): Promise<ApiKey | undefined> {
    return this.apiKeys.get(id);
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find((apiKey) => apiKey.key === key);
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values());
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = randomUUID();
    const key = "vf_sk_" + randomBytes(16).toString("hex");
    const apiKey: ApiKey = {
      ...insertApiKey,
      id,
      key,
      createdAt: new Date(),
      usage: 0,
      active: true,
    };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    return this.apiKeys.delete(id);
  }

  async incrementApiKeyUsage(id: string): Promise<void> {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      apiKey.usage += 1;
      this.apiKeys.set(id, apiKey);
    }
  }
}

export const storage = new MemStorage();
