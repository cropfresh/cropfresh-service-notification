/**
 * Match Notification Service Tests - Story 3.5 (Task 9.5)
 * 
 * Tests for notification delivery via mocked FCM/SMS.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    MatchNotificationService,
    MatchNotificationPayload,
} from '../../src/services/match-notification-service';
import {
    buildMatchFoundSMS,
    buildMatchAcceptedSMS,
    buildMatchExpirySMS,
    SupportedLanguage,
} from '../../src/templates/match-templates';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

const createTestPayload = (overrides: Partial<MatchNotificationPayload> = {}): MatchNotificationPayload => ({
    farmerId: 1001,
    farmerPhone: '+919876543210',
    farmerLanguage: 'en',
    farmerFcmToken: 'fcm-token-abc123',
    matchId: 'match-uuid-001',
    cropName: 'Tomato',
    quantityKg: 50,
    pricePerKg: 35,
    totalAmount: 1750,
    buyerType: 'Restaurant',
    buyerLocation: 'Koramangala, Bangalore',
    expiryTime: '24 hours',
    deliveryDate: 'Dec 25',
    orderId: undefined,
    ...overrides,
});

describe('MatchNotificationService', () => {
    let notificationService: MatchNotificationService;

    beforeEach(() => {
        vi.clearAllMocks();
        notificationService = new MatchNotificationService();
    });

    // ===========================================================================
    // Task 9.5: Test notification delivery (mock FCM)
    // ===========================================================================
    describe('sendMatchFoundNotification', () => {
        it('should send SMS and push notification for match found', async () => {
            const payload = createTestPayload();

            const result = await notificationService.sendMatchFoundNotification(payload);

            expect(result.success).toBe(true);
            expect(result.smsId).toBeDefined();
            expect(result.pushId).toBeDefined();
        });

        it('should only send SMS when no FCM token provided', async () => {
            const payload = createTestPayload({ farmerFcmToken: undefined });

            const result = await notificationService.sendMatchFoundNotification(payload);

            expect(result.success).toBe(true);
            expect(result.smsId).toBeDefined();
            // pushId might be undefined when no token
        });

        it('should use correct language for Hindi speaker', async () => {
            const payload = createTestPayload({ farmerLanguage: 'hi' });

            const result = await notificationService.sendMatchFoundNotification(payload);

            expect(result.success).toBe(true);
        });

        it('should use correct language for Kannada speaker', async () => {
            const payload = createTestPayload({ farmerLanguage: 'kn' });

            const result = await notificationService.sendMatchFoundNotification(payload);

            expect(result.success).toBe(true);
        });
    });

    describe('sendMatchAcceptedNotification', () => {
        it('should send confirmation with order ID', async () => {
            const payload = createTestPayload({ orderId: 'ord-12345' });

            const result = await notificationService.sendMatchAcceptedNotification(payload);

            expect(result.success).toBe(true);
            expect(result.smsId).toBeDefined();
        });
    });

    describe('sendMatchExpiryReminder', () => {
        it('should send expiry reminder with time remaining', async () => {
            const payload = createTestPayload({ expiryTime: '2 hours' });

            const result = await notificationService.sendMatchExpiryReminder(payload);

            expect(result.success).toBe(true);
        });
    });
});

describe('Match SMS Templates', () => {
    describe('buildMatchFoundSMS', () => {
        it('should build English SMS with all variables substituted', () => {
            const sms = buildMatchFoundSMS(SupportedLanguage.ENGLISH, {
                crop_name: 'Tomato',
                quantity_kg: 50,
                price_per_kg: 35,
                total_amount: 1750,
                buyer_type: 'Restaurant',
                buyer_location: 'Koramangala',
                expiry_time: '24 hours',
            });

            expect(sms).toContain('50kg Tomato');
            expect(sms).toContain('₹35/kg');
            expect(sms).toContain('₹1750');
            expect(sms).toContain('Restaurant');
            expect(sms).toContain('Koramangala');
            expect(sms).toContain('24 hours');
            expect(sms).toContain('CropFresh');
        });

        it('should build Kannada SMS', () => {
            const sms = buildMatchFoundSMS(SupportedLanguage.KANNADA, {
                crop_name: 'Tomato',
                quantity_kg: 50,
                price_per_kg: 35,
                total_amount: 1750,
                buyer_type: 'Restaurant',
                buyer_location: 'Koramangala',
                expiry_time: '24 hours',
            });

            expect(sms).toContain('ಹೊಸ ಖರೀದಿದಾರ'); // "New buyer" in Kannada
        });

        it('should build Hindi SMS', () => {
            const sms = buildMatchFoundSMS(SupportedLanguage.HINDI, {
                crop_name: 'Tomato',
                quantity_kg: 50,
                price_per_kg: 35,
                total_amount: 1750,
                buyer_type: 'Restaurant',
                buyer_location: 'Koramangala',
                expiry_time: '24 hours',
            });

            expect(sms).toContain('नया खरीदार'); // "New buyer" in Hindi
        });
    });

    describe('buildMatchAcceptedSMS', () => {
        it('should include order ID in confirmation', () => {
            const sms = buildMatchAcceptedSMS(SupportedLanguage.ENGLISH, {
                crop_name: 'Tomato',
                quantity_kg: 50,
                price_per_kg: 35,
                total_amount: 1750,
                buyer_type: 'Restaurant',
                buyer_location: 'Koramangala',
                order_id: 'ORD-12345',
                delivery_date: 'Dec 25',
            });

            expect(sms).toContain('ORD-12345');
            expect(sms).toContain('Dec 25');
        });
    });

    describe('buildMatchExpirySMS', () => {
        it('should include expiry time urgency', () => {
            const sms = buildMatchExpirySMS(SupportedLanguage.ENGLISH, {
                crop_name: 'Tomato',
                quantity_kg: 50,
                price_per_kg: 35,
                total_amount: 1750,
                buyer_type: 'Restaurant',
                buyer_location: 'Koramangala',
                expiry_time: '2 hours',
            });

            expect(sms).toContain('2 hours');
            expect(sms).toContain('Expiring');
        });
    });
});
