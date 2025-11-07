/**
 * Zadarma SIP Provider
 * Implements SIP-based telephony integration for Zadarma
 * Bypasses REST API restrictions by using direct SIP protocol
 * https://zadarma.com/en/support/instructions/
 */

import sip from 'sip';
import crypto from 'crypto';
import os from 'os';
import type { TelephonyProvider as TelephonyProviderType } from '@shared/schema';

interface ZadarmaSIPCredentials {
  sipUsername: string;  // SIP login from my.zadarma.com/mysip/
  sipPassword: string;  // SIP password
  sipDomain?: string;   // Default: sip.zadarma.com
}

interface CallOptions {
  from: string;
  to: string;
  url?: string;
  statusCallback?: string;
  statusCallbackMethod?: string;
  record?: boolean;
}

interface CallResult {
  providerCallId: string;
  status: string;
  direction: "inbound" | "outbound";
}

interface SIPDialog {
  callId: string;
  fromTag: string;
  toTag: string;
  remoteTarget: string;
  status: 'trying' | 'ringing' | 'answered' | 'terminated';
}

export class ZadarmaSIPProvider {
  private sipUsername: string;
  private sipPassword: string;
  private sipDomain: string;
  private localIp: string;
  private localPort: number;
  private activeDialogs: Map<string, SIPDialog>;
  private sipStack: any;

  constructor(provider: TelephonyProviderType) {
    const creds = provider.credentials as ZadarmaSIPCredentials;
    
    if (!creds.sipUsername || !creds.sipPassword) {
      throw new Error('Zadarma SIP provider requires sipUsername and sipPassword');
    }

    this.sipUsername = creds.sipUsername.trim();
    this.sipPassword = creds.sipPassword.trim();
    this.sipDomain = creds.sipDomain?.trim() || 'sip.zadarma.com';
    this.localIp = this.getLocalIp();
    this.localPort = 5060;
    this.activeDialogs = new Map();

    this.initializeSIPStack();
  }

  /**
   * Get local IP address for SIP Contact header
   */
  private getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;
      
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    return '127.0.0.1';
  }

  /**
   * Initialize SIP stack with message handlers
   */
  private initializeSIPStack(): void {
    const self = this;

    // Start SIP stack on random port to avoid conflicts
    this.localPort = 5060 + Math.floor(Math.random() * 1000);

    sip.start({
      port: this.localPort,
      address: this.localIp,
      publicAddress: this.localIp,
      tcp: false, // Use UDP for simplicity
      logger: {
        send: (msg: any) => {
          console.log(`[ZadarmaSIP] SEND →`, this.formatSIPMessage(msg));
        },
        recv: (msg: any) => {
          console.log(`[ZadarmaSIP] RECV ←`, this.formatSIPMessage(msg));
        },
        error: (e: any) => {
          console.error(`[ZadarmaSIP] ERROR:`, e);
        }
      }
    }, (request: any) => {
      // Handle incoming SIP requests
      this.handleIncomingRequest(request);
    });

    console.log(`[ZadarmaSIP] Stack initialized on ${this.localIp}:${this.localPort}`);
  }

  /**
   * Format SIP message for logging (detailed for debugging)
   */
  private formatSIPMessage(msg: any): string {
    if (!msg) return '';
    
    const method = msg.method || msg.status;
    const uri = msg.uri || '';
    const callId = msg.headers?.['call-id'] || 'unknown';
    const from = msg.headers?.from?.uri || 'unknown';
    const to = msg.headers?.to?.uri || 'unknown';
    
    // Show full details for debugging
    console.log(`[ZadarmaSIP-DETAIL] ${method} ${uri}`);
    console.log(`[ZadarmaSIP-DETAIL] From: ${from}, To: ${to}`);
    console.log(`[ZadarmaSIP-DETAIL] Call-ID: ${callId}`);
    
    if (msg.status) {
      console.log(`[ZadarmaSIP-DETAIL] Status: ${msg.status} ${msg.reason || ''}`);
      if (msg.headers?.['www-authenticate']) {
        console.log(`[ZadarmaSIP-DETAIL] Auth Challenge: ${msg.headers['www-authenticate']}`);
      }
    }
    
    if (msg.content) {
      console.log(`[ZadarmaSIP-DETAIL] Content (${msg.content.length} bytes):\n${msg.content.substring(0, 200)}...`);
    }
    
    return `${method} ${uri} (Call-ID: ${callId.substring(0, 20)}...)`;
  }

  /**
   * Handle incoming SIP requests (responses to our INVITE, etc.)
   */
  private handleIncomingRequest(request: any): void {
    const method = request.method;
    const callId = request.headers['call-id'];

    console.log(`[ZadarmaSIP] Handling ${method} for call ${callId}`);

    // Handle different SIP methods
    switch (method) {
      case 'INVITE':
        // Incoming call (not implemented yet - requires webhook setup)
        this.handleIncomingInvite(request);
        break;

      case 'BYE':
        // Call termination request
        this.handleBye(request);
        break;

      case 'CANCEL':
        // Call cancellation
        this.handleCancel(request);
        break;

      default:
        console.log(`[ZadarmaSIP] Unhandled method: ${method}`);
    }
  }

  /**
   * Handle incoming INVITE (inbound call)
   */
  private handleIncomingInvite(request: any): void {
    console.log(`[ZadarmaSIP] Incoming call from ${request.headers.from.uri}`);
    
    // Send 180 Ringing response (not a request!)
    sip.send({
      status: 180,
      reason: 'Ringing',
      headers: {
        to: request.headers.to,
        from: request.headers.from,
        'call-id': request.headers['call-id'],
        cseq: request.headers.cseq,
        via: request.headers.via
      },
      content: ''
    });

    // TODO: Implement full inbound call handling with media negotiation
  }

  /**
   * Handle BYE request (call termination)
   */
  private handleBye(request: any): void {
    const callId = request.headers['call-id'];
    
    // Send 200 OK response (not a request!)
    sip.send({
      status: 200,
      reason: 'OK',
      headers: {
        to: request.headers.to,
        from: request.headers.from,
        'call-id': callId,
        cseq: request.headers.cseq,
        via: request.headers.via
      },
      content: ''
    });

    // Remove from active dialogs
    this.activeDialogs.delete(callId);
    console.log(`[ZadarmaSIP] Call ${callId} terminated`);
  }

  /**
   * Handle CANCEL request
   */
  private handleCancel(request: any): void {
    const callId = request.headers['call-id'];
    
    // Send 200 OK response (not a request!)
    sip.send({
      status: 200,
      reason: 'OK',
      headers: {
        to: request.headers.to,
        from: request.headers.from,
        'call-id': callId,
        cseq: request.headers.cseq,
        via: request.headers.via
      },
      content: ''
    });

    this.activeDialogs.delete(callId);
    console.log(`[ZadarmaSIP] Call ${callId} canceled`);
  }

  /**
   * Generate SDP (Session Description Protocol) for audio
   * This negotiates the media stream parameters
   */
  private generateSDP(): string {
    const sdp = [
      'v=0',
      `o=- ${Date.now()} 1 IN IP4 ${this.localIp}`,
      's=VoiceForge Call',
      `c=IN IP4 ${this.localIp}`,
      't=0 0',
      'm=audio 10000 RTP/AVP 0 8', // Use ports 10000+ for RTP
      'a=rtpmap:0 PCMU/8000',       // μ-law codec
      'a=rtpmap:8 PCMA/8000',       // A-law codec
      'a=sendrecv'
    ].join('\r\n');

    return sdp;
  }

  /**
   * Initiate an outbound call via SIP INVITE
   */
  async initiateCall(options: CallOptions): Promise<CallResult> {
    return new Promise((resolve, reject) => {
      const callId = this.generateCallId();
      const fromTag = this.generateTag();
      const sipUri = `sip:${options.to}@${this.sipDomain}`;
      
      console.log(`[ZadarmaSIP] Initiating call to ${sipUri}`);

      const inviteMessage = {
        method: 'INVITE',
        uri: sipUri,
        headers: {
          to: {
            uri: sipUri
          },
          from: {
            uri: `sip:${this.sipUsername}@${this.sipDomain}`,
            params: { tag: fromTag }
          },
          'call-id': callId,
          cseq: { method: 'INVITE', seq: 1 },
          contact: [{
            uri: `sip:${this.sipUsername}@${this.localIp}:${this.localPort}`
          }],
          'content-type': 'application/sdp',
          'max-forwards': 70,
          'user-agent': 'VoiceForge/1.0'
        },
        content: this.generateSDP()
      };

      // Track response status
      let responseReceived = false;

      // Set up response handler
      const responseHandler = (response: any) => {
        if (!response || response.headers['call-id'] !== callId) return;

        const status = response.status;
        console.log(`[ZadarmaSIP] Received ${status} response for call ${callId}`);

        responseReceived = true;

        if (status >= 100 && status < 200) {
          // 1xx: Provisional responses (100 Trying, 180 Ringing)
          console.log(`[ZadarmaSIP] Call ${callId}: ${status} - ${response.reason}`);
          
          if (status === 180) {
            // Ringing
            this.updateDialog(callId, { status: 'ringing' });
          }
        } else if (status >= 200 && status < 300) {
          // 2xx: Success (200 OK)
          console.log(`[ZadarmaSIP] Call ${callId} answered`);
          
          const toTag = response.headers.to.params?.tag;
          const contact = response.headers.contact?.[0]?.uri || sipUri;

          // Store dialog information
          this.activeDialogs.set(callId, {
            callId,
            fromTag,
            toTag,
            remoteTarget: contact,
            status: 'answered'
          });

          // Send ACK
          this.sendAck(callId, fromTag, toTag, contact);

          resolve({
            providerCallId: callId,
            status: 'in-progress',
            direction: 'outbound' as const
          });
        } else if (status >= 300) {
          // 3xx-6xx: Redirects, client errors, server errors
          console.error(`[ZadarmaSIP] Call ${callId} failed: ${status} ${response.reason}`);
          
          this.activeDialogs.delete(callId);
          
          reject(new Error(`Call failed: ${status} ${response.reason}`));
        }
      };

      // Send INVITE with authentication
      this.sendAuthenticatedRequest(inviteMessage, responseHandler);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!responseReceived) {
          this.activeDialogs.delete(callId);
          reject(new Error('Call timeout: No response within 30 seconds'));
        }
      }, 30000);
    });
  }

  /**
   * Send authenticated SIP request with digest authentication
   */
  private sendAuthenticatedRequest(request: any, callback: (response: any) => void): void {
    console.log(`[ZadarmaSIP-AUTH] Sending initial request (no auth)`);
    
    // First attempt without auth
    sip.send(request, (response: any) => {
      console.log(`[ZadarmaSIP-AUTH] Received response: ${response.status} ${response.reason || ''}`);
      
      if (response.status === 401 || response.status === 407) {
        // Authentication required
        console.log(`[ZadarmaSIP-AUTH] Authentication required (${response.status})`);
        
        const challenge = response.headers['www-authenticate'] || response.headers['proxy-authenticate'];
        console.log(`[ZadarmaSIP-AUTH] Challenge: ${challenge}`);
        
        const authHeader = this.generateAuthHeader(request, challenge);
        console.log(`[ZadarmaSIP-AUTH] Generated auth header: ${authHeader.substring(0, 80)}...`);
        
        // Retry with authentication
        request.headers.authorization = authHeader;
        request.headers.cseq.seq++;
        
        console.log(`[ZadarmaSIP-AUTH] Retrying with authentication (CSeq: ${request.headers.cseq.seq})`);
        sip.send(request, callback);
      } else {
        console.log(`[ZadarmaSIP-AUTH] No auth required, forwarding response`);
        callback(response);
      }
    });
  }

  /**
   * Generate Digest authentication header
   */
  private generateAuthHeader(request: any, challenge: string): string {
    // Parse challenge
    const realm = this.extractValue(challenge, 'realm');
    const nonce = this.extractValue(challenge, 'nonce');
    const algorithm = this.extractValue(challenge, 'algorithm') || 'MD5';
    const opaque = this.extractValue(challenge, 'opaque');

    // Generate response
    const ha1 = crypto
      .createHash('md5')
      .update(`${this.sipUsername}:${realm}:${this.sipPassword}`)
      .digest('hex');

    const ha2 = crypto
      .createHash('md5')
      .update(`${request.method}:${request.uri}`)
      .digest('hex');

    const response = crypto
      .createHash('md5')
      .update(`${ha1}:${nonce}:${ha2}`)
      .digest('hex');

    // Build auth header
    let authHeader = `Digest username="${this.sipUsername}", realm="${realm}", ` +
                     `nonce="${nonce}", uri="${request.uri}", ` +
                     `response="${response}", algorithm=${algorithm}`;

    if (opaque) {
      authHeader += `, opaque="${opaque}"`;
    }

    return authHeader;
  }

  /**
   * Extract value from authentication challenge
   */
  private extractValue(challenge: string, key: string): string {
    const regex = new RegExp(`${key}="([^"]+)"`);
    const match = challenge.match(regex);
    return match ? match[1] : '';
  }

  /**
   * Send ACK message to confirm call establishment
   */
  private sendAck(callId: string, fromTag: string, toTag: string, contact: string): void {
    sip.send({
      method: 'ACK',
      uri: contact,
      headers: {
        to: {
          uri: contact,
          params: { tag: toTag }
        },
        from: {
          uri: `sip:${this.sipUsername}@${this.sipDomain}`,
          params: { tag: fromTag }
        },
        'call-id': callId,
        cseq: { method: 'ACK', seq: 1 },
        'max-forwards': 70
      }
    });

    console.log(`[ZadarmaSIP] ACK sent for call ${callId}`);
  }

  /**
   * Update dialog status
   */
  private updateDialog(callId: string, updates: Partial<SIPDialog>): void {
    const dialog = this.activeDialogs.get(callId);
    if (dialog) {
      Object.assign(dialog, updates);
      this.activeDialogs.set(callId, dialog);
    }
  }

  /**
   * End an active call by sending BYE
   */
  async endCall(callSid: string): Promise<void> {
    const dialog = this.activeDialogs.get(callSid);
    
    if (!dialog) {
      console.warn(`[ZadarmaSIP] No active dialog found for ${callSid}`);
      return;
    }

    console.log(`[ZadarmaSIP] Sending BYE for call ${callSid}`);

    sip.send({
      method: 'BYE',
      uri: dialog.remoteTarget,
      headers: {
        to: {
          uri: dialog.remoteTarget,
          params: { tag: dialog.toTag }
        },
        from: {
          uri: `sip:${this.sipUsername}@${this.sipDomain}`,
          params: { tag: dialog.fromTag }
        },
        'call-id': callSid,
        cseq: { method: 'BYE', seq: 2 },
        'max-forwards': 70
      }
    });

    // Remove from active dialogs
    this.activeDialogs.delete(callSid);
  }

  /**
   * Generate unique Call-ID
   */
  private generateCallId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}@voiceforge`;
  }

  /**
   * Generate unique tag for From/To headers
   */
  private generateTag(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get call details (stub - SIP doesn't provide detailed call info)
   */
  async getCallDetails(callSid: string): Promise<any> {
    const dialog = this.activeDialogs.get(callSid);
    
    if (!dialog) {
      return {
        sid: callSid,
        status: 'unknown',
        message: 'Dialog not found in active calls'
      };
    }

    return {
      sid: callSid,
      from: `sip:${this.sipUsername}@${this.sipDomain}`,
      to: dialog.remoteTarget,
      status: dialog.status,
      direction: 'outbound'
    };
  }

  /**
   * Cleanup when provider is destroyed
   */
  destroy(): void {
    console.log(`[ZadarmaSIP] Shutting down SIP stack`);
    
    // End all active calls
    const callIds = Array.from(this.activeDialogs.keys());
    for (const callId of callIds) {
      this.endCall(callId).catch(console.error);
    }

    // Stop SIP stack
    if (sip && sip.stop) {
      sip.stop();
    }
  }
}
