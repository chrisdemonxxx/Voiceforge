import { randomBytes } from "crypto";
import type { IStorage } from "./storage";
import type {
  ApiKey, InsertApiKey,
  ClonedVoice, InsertClonedVoice,
  AgentFlow, InsertAgentFlow,
  FlowNode, InsertFlowNode,
  FlowEdge, InsertFlowEdge,
  TelephonyProvider, InsertTelephonyProvider,
  PhoneNumber, InsertPhoneNumber,
  Call, InsertCall,
  CallingCampaign, InsertCallingCampaign
} from "@shared/schema";

/**
 * In-memory storage implementation for development mode
 * Used when DATABASE_URL is not set
 */
export class MockStorage implements IStorage {
  private apiKeys: Map<string, ApiKey> = new Map();
  private apiKeysByKey: Map<string, ApiKey> = new Map();
  private clonedVoices: Map<string, ClonedVoice> = new Map();
  private agentFlows: Map<string, AgentFlow> = new Map();
  private flowNodes: Map<string, FlowNode> = new Map();
  private flowEdges: Map<string, FlowEdge> = new Map();
  private telephonyProviders: Map<string, TelephonyProvider> = new Map();
  private phoneNumbers: Map<string, PhoneNumber> = new Map();
  private calls: Map<string, Call> = new Map();
  private callingCampaigns: Map<string, CallingCampaign> = new Map();

  constructor() {
    // Create a default API key for development
    const defaultKey: ApiKey = {
      id: "dev-key-1",
      name: "Development API Key",
      key: "vf_dev_" + randomBytes(16).toString("hex"),
      createdAt: new Date(),
      usage: 0,
      active: true,
      rateLimit: 10000,
    };
    this.apiKeys.set(defaultKey.id, defaultKey);
    this.apiKeysByKey.set(defaultKey.key, defaultKey);

    console.log(`[MockStorage] Created default API key: ${defaultKey.key}`);
    console.log(`[MockStorage] Use this key for API requests in development mode`);
  }

  // API Keys
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    return this.apiKeys.get(id);
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    return this.apiKeysByKey.get(key);
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values());
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const key: ApiKey = {
      id: randomBytes(8).toString("hex"),
      key: "vf_" + randomBytes(16).toString("hex"),
      createdAt: new Date(),
      usage: 0,
      active: true,
      ...apiKey,
    };
    this.apiKeys.set(key.id, key);
    this.apiKeysByKey.set(key.key, key);
    return key;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const key = this.apiKeys.get(id);
    if (key) {
      this.apiKeysByKey.delete(key.key);
      this.apiKeys.delete(id);
      return true;
    }
    return false;
  }

  async updateApiKey(id: string, data: Partial<Pick<ApiKey, 'active'>>): Promise<ApiKey | undefined> {
    const key = this.apiKeys.get(id);
    if (key) {
      Object.assign(key, data);
      return key;
    }
    return undefined;
  }

  async incrementApiKeyUsage(id: string): Promise<void> {
    const key = this.apiKeys.get(id);
    if (key) {
      key.usage++;
    }
  }

  // Cloned Voices
  async getClonedVoice(id: string): Promise<ClonedVoice | undefined> {
    return this.clonedVoices.get(id);
  }

  async getAllClonedVoices(apiKeyId: string): Promise<ClonedVoice[]> {
    return Array.from(this.clonedVoices.values()).filter(v => v.apiKeyId === apiKeyId);
  }

  async createClonedVoice(voice: InsertClonedVoice): Promise<ClonedVoice> {
    const clonedVoice: ClonedVoice = {
      id: randomBytes(8).toString("hex"),
      createdAt: new Date(),
      processingStartedAt: null,
      processingCompletedAt: null,
      ...voice,
    };
    this.clonedVoices.set(clonedVoice.id, clonedVoice);
    return clonedVoice;
  }

  async deleteClonedVoice(id: string): Promise<boolean> {
    return this.clonedVoices.delete(id);
  }

  async updateClonedVoiceStatus(id: string, status: string): Promise<void> {
    const voice = this.clonedVoices.get(id);
    if (voice) {
      voice.status = status;
    }
  }

  // Agent Flows
  async getAgentFlow(id: string): Promise<AgentFlow | undefined> {
    return this.agentFlows.get(id);
  }

  async getAllAgentFlows(apiKeyId: string): Promise<AgentFlow[]> {
    return Array.from(this.agentFlows.values()).filter(f => f.apiKeyId === apiKeyId);
  }

  async createAgentFlow(flow: InsertAgentFlow): Promise<AgentFlow> {
    const agentFlow: AgentFlow = {
      id: randomBytes(8).toString("hex"),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...flow,
    };
    this.agentFlows.set(agentFlow.id, agentFlow);
    return agentFlow;
  }

  async updateAgentFlow(id: string, data: Partial<Omit<AgentFlow, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<AgentFlow | undefined> {
    const flow = this.agentFlows.get(id);
    if (flow) {
      Object.assign(flow, { ...data, updatedAt: new Date() });
      return flow;
    }
    return undefined;
  }

  async deleteAgentFlow(id: string): Promise<boolean> {
    return this.agentFlows.delete(id);
  }

  // Flow Nodes
  async getFlowNode(id: string): Promise<FlowNode | undefined> {
    return this.flowNodes.get(id);
  }

  async getAllFlowNodes(flowId: string): Promise<FlowNode[]> {
    return Array.from(this.flowNodes.values()).filter(n => n.flowId === flowId);
  }

  async createFlowNode(node: InsertFlowNode): Promise<FlowNode> {
    const flowNode: FlowNode = {
      id: randomBytes(8).toString("hex"),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...node,
    };
    this.flowNodes.set(flowNode.id, flowNode);
    return flowNode;
  }

  async updateFlowNode(id: string, data: Partial<Omit<FlowNode, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowNode | undefined> {
    const node = this.flowNodes.get(id);
    if (node) {
      Object.assign(node, { ...data, updatedAt: new Date() });
      return node;
    }
    return undefined;
  }

  async deleteFlowNode(id: string): Promise<boolean> {
    return this.flowNodes.delete(id);
  }

  // Flow Edges
  async getFlowEdge(id: string): Promise<FlowEdge | undefined> {
    return this.flowEdges.get(id);
  }

  async getAllFlowEdges(flowId: string): Promise<FlowEdge[]> {
    return Array.from(this.flowEdges.values()).filter(e => e.flowId === flowId);
  }

  async createFlowEdge(edge: InsertFlowEdge): Promise<FlowEdge> {
    const flowEdge: FlowEdge = {
      id: randomBytes(8).toString("hex"),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...edge,
    };
    this.flowEdges.set(flowEdge.id, flowEdge);
    return flowEdge;
  }

  async updateFlowEdge(id: string, data: Partial<Omit<FlowEdge, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowEdge | undefined> {
    const edge = this.flowEdges.get(id);
    if (edge) {
      Object.assign(edge, { ...data, updatedAt: new Date() });
      return edge;
    }
    return undefined;
  }

  async deleteFlowEdge(id: string): Promise<boolean> {
    return this.flowEdges.delete(id);
  }

  // Telephony Providers
  async getTelephonyProvider(id: string): Promise<TelephonyProvider | undefined> {
    return this.telephonyProviders.get(id);
  }

  async getAllTelephonyProviders(apiKeyId: string): Promise<TelephonyProvider[]> {
    return Array.from(this.telephonyProviders.values()).filter(p => p.apiKeyId === apiKeyId);
  }

  async getActiveTelephonyProvider(apiKeyId: string): Promise<TelephonyProvider | undefined> {
    return Array.from(this.telephonyProviders.values()).find(p => p.apiKeyId === apiKeyId && p.active);
  }

  async createTelephonyProvider(provider: InsertTelephonyProvider): Promise<TelephonyProvider> {
    const telephonyProvider: TelephonyProvider = {
      id: randomBytes(8).toString("hex"),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...provider,
    };
    this.telephonyProviders.set(telephonyProvider.id, telephonyProvider);
    return telephonyProvider;
  }

  async updateTelephonyProvider(id: string, data: Partial<Omit<TelephonyProvider, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<TelephonyProvider | undefined> {
    const provider = this.telephonyProviders.get(id);
    if (provider) {
      Object.assign(provider, { ...data, updatedAt: new Date() });
      return provider;
    }
    return undefined;
  }

  async deleteTelephonyProvider(id: string): Promise<boolean> {
    return this.telephonyProviders.delete(id);
  }

  // Phone Numbers
  async getPhoneNumber(id: string): Promise<PhoneNumber | undefined> {
    return this.phoneNumbers.get(id);
  }

  async getAllPhoneNumbers(providerId: string): Promise<PhoneNumber[]> {
    return Array.from(this.phoneNumbers.values()).filter(n => n.providerId === providerId);
  }

  async getPhoneNumberByNumber(phoneNumber: string): Promise<PhoneNumber | undefined> {
    return Array.from(this.phoneNumbers.values()).find(n => n.phoneNumber === phoneNumber);
  }

  async createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber> {
    const number: PhoneNumber = {
      id: randomBytes(8).toString("hex"),
      purchasedAt: new Date(),
      ...phoneNumber,
    };
    this.phoneNumbers.set(number.id, number);
    return number;
  }

  async updatePhoneNumber(id: string, data: Partial<Omit<PhoneNumber, 'id' | 'providerId' | 'purchasedAt'>>): Promise<PhoneNumber | undefined> {
    const number = this.phoneNumbers.get(id);
    if (number) {
      Object.assign(number, data);
      return number;
    }
    return undefined;
  }

  async deletePhoneNumber(id: string): Promise<boolean> {
    return this.phoneNumbers.delete(id);
  }

  // Calls
  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async getAllCalls(providerId: string): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(c => c.providerId === providerId);
  }

  async getCallsByApiKey(apiKeyId: string): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(c => c.apiKeyId === apiKeyId);
  }

  async getCallsByCampaign(campaignId: string): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(c => c.campaignId === campaignId);
  }

  async createCall(call: InsertCall): Promise<Call> {
    const newCall: Call = {
      id: randomBytes(8).toString("hex"),
      createdAt: new Date(),
      ...call,
    };
    this.calls.set(newCall.id, newCall);
    return newCall;
  }

  async updateCall(id: string, data: Partial<Omit<Call, 'id' | 'createdAt'>>): Promise<Call | undefined> {
    const call = this.calls.get(id);
    if (call) {
      Object.assign(call, data);
      return call;
    }
    return undefined;
  }

  // Calling Campaigns
  async getCallingCampaign(id: string): Promise<CallingCampaign | undefined> {
    return this.callingCampaigns.get(id);
  }

  async getAllCallingCampaigns(apiKeyId: string): Promise<CallingCampaign[]> {
    return Array.from(this.callingCampaigns.values()).filter(c => c.apiKeyId === apiKeyId);
  }

  async createCallingCampaign(campaign: InsertCallingCampaign): Promise<CallingCampaign> {
    const callingCampaign: CallingCampaign = {
      id: randomBytes(8).toString("hex"),
      createdAt: new Date(),
      updatedAt: new Date(),
      completedCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      ...campaign,
    };
    this.callingCampaigns.set(callingCampaign.id, callingCampaign);
    return callingCampaign;
  }

  async updateCallingCampaign(id: string, data: Partial<Omit<CallingCampaign, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<CallingCampaign | undefined> {
    const campaign = this.callingCampaigns.get(id);
    if (campaign) {
      Object.assign(campaign, { ...data, updatedAt: new Date() });
      return campaign;
    }
    return undefined;
  }

  async deleteCallingCampaign(id: string): Promise<boolean> {
    return this.callingCampaigns.delete(id);
  }

  async incrementCampaignStats(id: string, field: 'completedCalls' | 'successfulCalls' | 'failedCalls'): Promise<void> {
    const campaign = this.callingCampaigns.get(id);
    if (campaign) {
      campaign[field]++;
    }
  }
}
