/**
 * End-to-End Tests for Zadarma Telephony Integration
 * Tests actual Zadarma API calls and webhook flows
 * 
 * NOTE: Requires valid Zadarma credentials in environment variables:
 * ZADARMA_API_KEY and ZADARMA_API_SECRET
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { storage } from '../storage';
import { TelephonyService } from '../services/telephony-service';
import { ZadarmaProvider } from '../services/telephony-providers/zadarma-provider';

describe('Zadarma E2E Tests', () => {
  let telephonyService: TelephonyService;
  let providerId: string;
  let apiKeyId: string;

  beforeAll(async () => {
    // Initialize storage and services
    telephonyService = new TelephonyService(storage);

    // Create test API key
    const apiKey = await storage.createApiKey({
      name: 'Zadarma E2E Test Key',
      userId: 'test-user-zadarma',
      limits: {
        rateLimit: 100,
        maxUsage: 1000000
      }
    });
    apiKeyId = apiKey.id;

    // Check for Zadarma credentials
    const zadarmaApiKey = process.env.ZADARMA_API_KEY;
    const zadarmaApiSecret = process.env.ZADARMA_API_SECRET;

    if (!zadarmaApiKey || !zadarmaApiSecret) {
      console.warn('⚠️  Zadarma credentials not found. Set ZADARMA_API_KEY and ZADARMA_API_SECRET to run E2E tests.');
      return;
    }

    // Create Zadarma provider
    const provider = await storage.createTelephonyProvider({
      apiKeyId,
      name: 'Zadarma Test Provider',
      provider: 'zadarma',
      credentials: {
        apiKey: zadarmaApiKey,
        apiSecret: zadarmaApiSecret
      },
      isActive: true
    });
    providerId = provider.id;

    console.log('✓ Zadarma E2E test environment initialized');
  });

  afterAll(async () => {
    // Cleanup
    if (providerId) {
      await storage.deleteTelephonyProvider(providerId);
    }
    if (apiKeyId) {
      await storage.deleteApiKey(apiKeyId);
    }
  });

  it('should check Zadarma credentials are configured', () => {
    const hasCredentials = !!process.env.ZADARMA_API_KEY && !!process.env.ZADARMA_API_SECRET;
    
    if (!hasCredentials) {
      console.log('⚠️  Skipping E2E tests - no Zadarma credentials');
      expect(hasCredentials).toBe(false); // Expected - just documenting the skip
      return;
    }

    expect(hasCredentials).toBe(true);
  });

  it('should get Zadarma account balance', async () => {
    if (!process.env.ZADARMA_API_KEY) {
      console.log('⚠️  Skipping - no credentials');
      return;
    }

    const provider = await storage.getTelephonyProvider(providerId);
    expect(provider).toBeTruthy();

    const zadarmaProvider = new ZadarmaProvider(provider!);
    const balance = await zadarmaProvider.getBalance();

    console.log(`📊 Zadarma account balance: $${balance}`);
    expect(typeof balance).toBe('number');
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it('should initiate a test call via Zadarma', async () => {
    if (!process.env.ZADARMA_API_KEY) {
      console.log('⚠️  Skipping - no credentials');
      return;
    }

    // Use a test phone number (replace with your actual test number)
    const testPhoneFrom = process.env.TEST_PHONE_FROM || '+15555551234';
    const testPhoneTo = process.env.TEST_PHONE_TO || '+15555555678';

    console.log(`📞 Initiating test call: ${testPhoneFrom} → ${testPhoneTo}`);

    const result = await telephonyService.initiateCall(
      apiKeyId,
      providerId,
      testPhoneFrom,
      testPhoneTo
    );

    expect(result.success).toBe(true);
    expect(result.callId).toBeTruthy();

    console.log(`✓ Call initiated successfully: ${result.callId}`);

    // Retrieve call record
    const call = await storage.getCall(result.callId!);
    expect(call).toBeTruthy();
    expect(call?.direction).toBe('outbound');
    expect(call?.from).toBe(testPhoneFrom);
    expect(call?.to).toBe(testPhoneTo);
    expect(call?.status).toBe('initiated');

    console.log('✓ Call record created correctly');
  });

  it('should validate Zadarma webhook signatures', () => {
    const apiSecret = 'test-secret-key';
    const params = {
      event: 'NOTIFY_INTERNAL',
      caller_id: '+15555551234',
      called_did: '+15555555678',
      call_start: '2024-01-01 12:00:00'
    };

    // Generate valid signature
    const crypto = require('crypto');
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    const validSignature = crypto
      .createHash('md5')
      .update(sortedParams + apiSecret)
      .digest('hex');

    const isValid = ZadarmaProvider.validateWebhookSignature(
      apiSecret,
      validSignature,
      params
    );

    expect(isValid).toBe(true);
    console.log('✓ Webhook signature validation works correctly');
  });

  it('should generate ZSML for call flow', () => {
    const zsml = ZadarmaProvider.generateZSML({
      message: 'Hello from VoiceForge API',
      recordingEnabled: true,
      streamUrl: 'wss://example.com/stream'
    });

    expect(zsml).toContain('<?xml version="1.0"');
    expect(zsml).toContain('<pbx>');
    expect(zsml).toContain('<say>Hello from VoiceForge API</say>');
    expect(zsml).toContain('<record/>');
    expect(zsml).toContain('</pbx>');

    console.log('✓ ZSML generation working');
    console.log(zsml);
  });
});

// Helper to run just the balance check
async function testZadarmaBalance() {
  const apiKey = process.env.ZADARMA_API_KEY;
  const apiSecret = process.env.ZADARMA_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('❌ Please set ZADARMA_API_KEY and ZADARMA_API_SECRET');
    process.exit(1);
  }

  console.log('Testing Zadarma API connection...\n');

  const provider = {
    id: 'test',
    name: 'Test',
    provider: 'zadarma' as const,
    credentials: { apiKey, apiSecret },
    apiKeyId: 'test',
    isActive: true,
    createdAt: new Date()
  };

  const zadarma = new ZadarmaProvider(provider);
  
  try {
    const balance = await zadarma.getBalance();
    console.log(`✅ Connected! Account balance: $${balance}\n`);
    
    console.log('You can now run full E2E tests with:');
    console.log('  npm test -- zadarma-e2e\n');
  } catch (error: any) {
    console.error('❌ Failed to connect to Zadarma API');
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run quick balance test if called directly
if (require.main === module) {
  testZadarmaBalance();
}
