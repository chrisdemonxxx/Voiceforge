import twilio from "twilio";
import type { TelephonyProvider } from "@shared/schema";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface MakeCallOptions {
  to: string;
  from: string;
  twimlUrl?: string;
  statusCallback?: string;
  statusCallbackMethod?: "GET" | "POST";
  record?: boolean;
}

export interface CallStatus {
  sid: string;
  status: string;
  direction: string;
  from: string;
  to: string;
  duration?: string;
  price?: string;
  startTime?: Date;
  endTime?: Date;
}

export class TwilioService {
  private client: twilio.Twilio;
  private credentials: TwilioCredentials;

  constructor(provider: TelephonyProvider) {
    if (provider.provider !== "twilio") {
      throw new Error("Invalid provider type. Expected 'twilio'");
    }

    const creds = provider.credentials as TwilioCredentials;
    if (!creds.accountSid || !creds.authToken) {
      throw new Error("Missing Twilio credentials");
    }

    this.credentials = creds;
    this.client = twilio(creds.accountSid, creds.authToken);
  }

  /**
   * Initiate an outbound call
   */
  async makeCall(options: MakeCallOptions): Promise<CallStatus> {
    try {
      const call = await this.client.calls.create({
        to: options.to,
        from: options.from,
        url: options.twimlUrl,
        statusCallback: options.statusCallback,
        statusCallbackMethod: options.statusCallbackMethod || "POST",
        record: options.record || false,
      });

      return {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime ? new Date(call.startTime) : undefined,
      };
    } catch (error: any) {
      throw new Error(`Twilio call failed: ${error.message}`);
    }
  }

  /**
   * Get the status of a call
   */
  async getCallStatus(callSid: string): Promise<CallStatus> {
    try {
      const call = await this.client.calls(callSid).fetch();

      return {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        duration: call.duration,
        price: call.price,
        startTime: call.startTime ? new Date(call.startTime) : undefined,
        endTime: call.endTime ? new Date(call.endTime) : undefined,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch call status: ${error.message}`);
    }
  }

  /**
   * Hang up an active call
   */
  async hangupCall(callSid: string): Promise<void> {
    try {
      await this.client.calls(callSid).update({ status: "completed" });
    } catch (error: any) {
      throw new Error(`Failed to hang up call: ${error.message}`);
    }
  }

  /**
   * List available phone numbers for purchase
   */
  async searchAvailableNumbers(options: {
    areaCode?: string;
    country?: string;
    limit?: number;
  }) {
    try {
      const numbers = await this.client.availablePhoneNumbers(options.country || "US")
        .local
        .list({
          areaCode: options.areaCode,
          limit: options.limit || 10,
        });

      return numbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        locality: num.locality,
        region: num.region,
        capabilities: num.capabilities,
      }));
    } catch (error: any) {
      throw new Error(`Failed to search phone numbers: ${error.message}`);
    }
  }

  /**
   * Purchase a phone number
   */
  async purchaseNumber(phoneNumber: string) {
    try {
      const number = await this.client.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
      });

      return {
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        capabilities: number.capabilities,
      };
    } catch (error: any) {
      throw new Error(`Failed to purchase number: ${error.message}`);
    }
  }

  /**
   * Update phone number configuration
   */
  async updateNumberConfig(numberSid: string, config: {
    voiceUrl?: string;
    statusCallback?: string;
    friendlyName?: string;
  }) {
    try {
      const number = await this.client.incomingPhoneNumbers(numberSid).update({
        voiceUrl: config.voiceUrl,
        statusCallback: config.statusCallback,
        friendlyName: config.friendlyName,
      });

      return {
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
      };
    } catch (error: any) {
      throw new Error(`Failed to update number config: ${error.message}`);
    }
  }

  /**
   * Get call recording URL
   */
  async getRecording(recordingSid: string): Promise<string> {
    try {
      const recording = await this.client.recordings(recordingSid).fetch();
      return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    } catch (error: any) {
      throw new Error(`Failed to fetch recording: ${error.message}`);
    }
  }

  /**
   * Generate TwiML for voice AI agent
   */
  static generateAgentTwiML(options: {
    websocketUrl: string;
    agentFlowId?: string;
  }): string {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Connect to WebSocket for real-time voice AI
    const connect = twiml.connect();
    const stream = connect.stream({
      url: options.websocketUrl,
    });
    
    if (options.agentFlowId) {
      stream.parameter({
        name: "agentFlowId",
        value: options.agentFlowId,
      });
    }

    return twiml.toString();
  }

  /**
   * Generate TwiML for simple message
   */
  static generateMessageTwiML(message: string): string {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: "alice" }, message);
    return twiml.toString();
  }

  /**
   * Validate Twilio webhook signature
   */
  static validateWebhook(authToken: string, signature: string, url: string, params: any): boolean {
    return twilio.validateRequest(authToken, signature, url, params);
  }
}
