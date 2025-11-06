import { 
  type ApiKey, type InsertApiKey, apiKeys, 
  type ClonedVoice, type InsertClonedVoice, clonedVoices,
  type AgentFlow, type InsertAgentFlow, agentFlows,
  type FlowNode, type InsertFlowNode, flowNodes,
  type FlowEdge, type InsertFlowEdge, flowEdges
} from "@shared/schema";
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
  updateApiKey(id: string, data: Partial<Pick<ApiKey, 'active'>>): Promise<ApiKey | undefined>;
  incrementApiKeyUsage(id: string): Promise<void>;
  
  // Cloned Voices
  getClonedVoice(id: string): Promise<ClonedVoice | undefined>;
  getAllClonedVoices(apiKeyId: string): Promise<ClonedVoice[]>;
  createClonedVoice(voice: InsertClonedVoice): Promise<ClonedVoice>;
  deleteClonedVoice(id: string): Promise<boolean>;
  updateClonedVoiceStatus(id: string, status: string): Promise<void>;
  
  // Agent Flows
  getAgentFlow(id: string): Promise<AgentFlow | undefined>;
  getAllAgentFlows(apiKeyId: string): Promise<AgentFlow[]>;
  createAgentFlow(flow: InsertAgentFlow): Promise<AgentFlow>;
  updateAgentFlow(id: string, data: Partial<Omit<AgentFlow, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<AgentFlow | undefined>;
  deleteAgentFlow(id: string): Promise<boolean>;
  
  // Flow Nodes
  getFlowNode(id: string): Promise<FlowNode | undefined>;
  getAllFlowNodes(flowId: string): Promise<FlowNode[]>;
  createFlowNode(node: InsertFlowNode): Promise<FlowNode>;
  updateFlowNode(id: string, data: Partial<Omit<FlowNode, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowNode | undefined>;
  deleteFlowNode(id: string): Promise<boolean>;
  
  // Flow Edges
  getFlowEdge(id: string): Promise<FlowEdge | undefined>;
  getAllFlowEdges(flowId: string): Promise<FlowEdge[]>;
  createFlowEdge(edge: InsertFlowEdge): Promise<FlowEdge>;
  updateFlowEdge(id: string, data: Partial<Omit<FlowEdge, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowEdge | undefined>;
  deleteFlowEdge(id: string): Promise<boolean>;
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

  async updateApiKey(id: string, data: Partial<Pick<ApiKey, 'active'>>): Promise<ApiKey | undefined> {
    const result = await db.update(apiKeys)
      .set(data)
      .where(eq(apiKeys.id, id))
      .returning();
    
    return result[0];
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

  async getAgentFlow(id: string): Promise<AgentFlow | undefined> {
    const results = await db.select().from(agentFlows).where(eq(agentFlows.id, id)).limit(1);
    return results[0];
  }

  async getAllAgentFlows(apiKeyId: string): Promise<AgentFlow[]> {
    return await db.select().from(agentFlows).where(eq(agentFlows.apiKeyId, apiKeyId));
  }

  async createAgentFlow(insertFlow: InsertAgentFlow): Promise<AgentFlow> {
    const results = await db.insert(agentFlows).values(insertFlow).returning();
    return results[0];
  }

  async updateAgentFlow(id: string, data: Partial<Omit<AgentFlow, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<AgentFlow | undefined> {
    const result = await db.update(agentFlows)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentFlows.id, id))
      .returning();
    
    return result[0];
  }

  async deleteAgentFlow(id: string): Promise<boolean> {
    const result = await db.delete(agentFlows).where(eq(agentFlows.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getFlowNode(id: string): Promise<FlowNode | undefined> {
    const results = await db.select().from(flowNodes).where(eq(flowNodes.id, id)).limit(1);
    return results[0];
  }

  async getAllFlowNodes(flowId: string): Promise<FlowNode[]> {
    return await db.select().from(flowNodes).where(eq(flowNodes.flowId, flowId));
  }

  async createFlowNode(insertNode: InsertFlowNode): Promise<FlowNode> {
    const results = await db.insert(flowNodes).values(insertNode).returning();
    return results[0];
  }

  async updateFlowNode(id: string, data: Partial<Omit<FlowNode, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowNode | undefined> {
    const result = await db.update(flowNodes)
      .set(data)
      .where(eq(flowNodes.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFlowNode(id: string): Promise<boolean> {
    const result = await db.delete(flowNodes).where(eq(flowNodes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getFlowEdge(id: string): Promise<FlowEdge | undefined> {
    const results = await db.select().from(flowEdges).where(eq(flowEdges.id, id)).limit(1);
    return results[0];
  }

  async getAllFlowEdges(flowId: string): Promise<FlowEdge[]> {
    return await db.select().from(flowEdges).where(eq(flowEdges.flowId, flowId));
  }

  async createFlowEdge(insertEdge: InsertFlowEdge): Promise<FlowEdge> {
    const results = await db.insert(flowEdges).values(insertEdge).returning();
    return results[0];
  }

  async updateFlowEdge(id: string, data: Partial<Omit<FlowEdge, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowEdge | undefined> {
    const result = await db.update(flowEdges)
      .set(data)
      .where(eq(flowEdges.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFlowEdge(id: string): Promise<boolean> {
    const result = await db.delete(flowEdges).where(eq(flowEdges.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DbStorage();
