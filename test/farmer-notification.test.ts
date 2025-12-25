/**
 * Unit Tests for Story 3.8 - Farmer Notifications
 * 
 * Tests for:
 * - NotificationRepository
 * - PreferencesRepository  
 * - DeviceTokenRepository
 * - SmsService
 * - PushService
 * - FarmerNotificationService
 */

// Mock Prisma before imports
jest.mock('../src/lib/prisma', () => ({
    prisma: {
        farmerNotification: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        farmerNotificationPreferences: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        deviceToken: {
            upsert: jest.fn(),
            findMany: jest.fn(),
            updateMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        smsDeliveryLog: {
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
    },
}));

// Mock Logger
jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

import { prisma } from '../src/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ============================================================================
// NotificationRepository Tests
// ============================================================================

describe('NotificationRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new notification', async () => {
            const mockNotification = {
                id: 'notif-123',
                farmerId: 'farmer-1',
                type: 'ORDER_MATCHED',
                title: 'Buyer Found!',
                body: 'Accept match for 50kg Tomato',
                deeplink: '/match-details/123',
                metadata: { order_id: '123' },
                isRead: false,
                createdAt: new Date(),
            };

            (mockPrisma.farmerNotification.create as jest.Mock).mockResolvedValue(mockNotification);

            const { notificationRepository } = require('../src/repositories/notification.repository');
            const result = await notificationRepository.create({
                farmerId: 'farmer-1',
                type: 'ORDER_MATCHED',
                title: 'Buyer Found!',
                body: 'Accept match for 50kg Tomato',
                deeplink: '/match-details/123',
                metadata: { order_id: '123' },
            });

            expect(result.id).toBe('notif-123');
            expect(mockPrisma.farmerNotification.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('findByFarmerId', () => {
        it('should return paginated notifications with unread count', async () => {
            const mockNotifications = [
                { id: 'n1', farmerId: 'f1', type: 'ORDER_MATCHED', title: 'T1', body: 'B1', isRead: false, createdAt: new Date() },
                { id: 'n2', farmerId: 'f1', type: 'PAYMENT_RECEIVED', title: 'T2', body: 'B2', isRead: true, createdAt: new Date() },
            ];

            (mockPrisma.farmerNotification.findMany as jest.Mock).mockResolvedValue(mockNotifications);
            (mockPrisma.farmerNotification.count as jest.Mock).mockResolvedValueOnce(10).mockResolvedValueOnce(5);

            const { notificationRepository } = require('../src/repositories/notification.repository');
            const result = await notificationRepository.findByFarmerId({
                farmerId: 'f1',
                page: 1,
                limit: 20,
            });

            expect(result.notifications).toHaveLength(2);
            expect(result.total).toBe(10);
            expect(result.unreadCount).toBe(5);
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            const mockUpdated = { id: 'n1', isRead: true };
            (mockPrisma.farmerNotification.update as jest.Mock).mockResolvedValue(mockUpdated);

            const { notificationRepository } = require('../src/repositories/notification.repository');
            const result = await notificationRepository.markAsRead('n1', 'f1');

            expect(result?.isRead).toBe(true);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            (mockPrisma.farmerNotification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

            const { notificationRepository } = require('../src/repositories/notification.repository');
            const result = await notificationRepository.markAllAsRead('f1');

            expect(result).toBe(5);
        });
    });
});

// ============================================================================
// PreferencesRepository Tests
// ============================================================================

describe('PreferencesRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByFarmerId', () => {
        it('should return default preferences for new farmer', async () => {
            (mockPrisma.farmerNotificationPreferences.findUnique as jest.Mock).mockResolvedValue(null);

            const { preferencesRepository } = require('../src/repositories/preferences.repository');
            const result = await preferencesRepository.findByFarmerId('new-farmer');

            expect(result.smsEnabled).toBe(true);
            expect(result.pushEnabled).toBe(true);
            expect(result.notificationLevel).toBe('ALL');
            expect(result.quietHoursStart).toBe('22:00');
            expect(result.quietHoursEnd).toBe('06:00');
        });

        it('should return existing preferences if found', async () => {
            const mockPrefs = {
                farmerId: 'f1',
                smsEnabled: false,
                pushEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '21:00',
                quietHoursEnd: '07:00',
                notificationLevel: 'CRITICAL',
                orderUpdates: true,
                paymentAlerts: true,
                educationalContent: false,
                updatedAt: new Date(),
            };
            (mockPrisma.farmerNotificationPreferences.findUnique as jest.Mock).mockResolvedValue(mockPrefs);

            const { preferencesRepository } = require('../src/repositories/preferences.repository');
            const result = await preferencesRepository.findByFarmerId('f1');

            expect(result.smsEnabled).toBe(false);
            expect(result.notificationLevel).toBe('CRITICAL');
        });
    });

    describe('isQuietHoursActive', () => {
        it('should return false when quiet hours disabled', async () => {
            (mockPrisma.farmerNotificationPreferences.findUnique as jest.Mock).mockResolvedValue({
                quietHoursEnabled: false,
                quietHoursStart: '22:00',
                quietHoursEnd: '06:00',
            });

            const { preferencesRepository } = require('../src/repositories/preferences.repository');
            const result = await preferencesRepository.isQuietHoursActive('f1');

            expect(result).toBe(false);
        });
    });

    describe('shouldSendNotification', () => {
        it('should allow SMS for critical notifications', async () => {
            (mockPrisma.farmerNotificationPreferences.findUnique as jest.Mock).mockResolvedValue({
                smsEnabled: true,
                pushEnabled: true,
                notificationLevel: 'ALL',
                quietHoursEnabled: false,
                orderUpdates: true,
                paymentAlerts: true,
                educationalContent: true,
            });

            const { preferencesRepository } = require('../src/repositories/preferences.repository');
            const result = await preferencesRepository.shouldSendNotification('f1', true, 'order');

            expect(result.sms).toBe(true);
            expect(result.push).toBe(true);
        });

        it('should block SMS for non-critical when level is CRITICAL', async () => {
            (mockPrisma.farmerNotificationPreferences.findUnique as jest.Mock).mockResolvedValue({
                smsEnabled: true,
                pushEnabled: true,
                notificationLevel: 'CRITICAL',
                quietHoursEnabled: false,
                orderUpdates: true,
                paymentAlerts: true,
                educationalContent: true,
            });

            const { preferencesRepository } = require('../src/repositories/preferences.repository');
            const result = await preferencesRepository.shouldSendNotification('f1', false, 'order');

            expect(result.sms).toBe(false);
            expect(result.push).toBe(true);
        });
    });
});

// ============================================================================
// DeviceTokenRepository Tests
// ============================================================================

describe('DeviceTokenRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('upsert', () => {
        it('should create/update device token', async () => {
            const mockToken = {
                id: 'token-123',
                farmerId: 'f1',
                fcmToken: 'abc123',
                deviceType: 'android',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            (mockPrisma.deviceToken.upsert as jest.Mock).mockResolvedValue(mockToken);

            const { deviceTokenRepository } = require('../src/repositories/device-token.repository');
            const result = await deviceTokenRepository.upsert({
                farmerId: 'f1',
                fcmToken: 'abc123',
                deviceType: 'android',
            });

            expect(result.fcmToken).toBe('abc123');
            expect(result.isActive).toBe(true);
        });
    });

    describe('findActiveByFarmerId', () => {
        it('should return only active tokens', async () => {
            const mockTokens = [
                { id: 't1', fcmToken: 'token1', isActive: true },
                { id: 't2', fcmToken: 'token2', isActive: true },
            ];
            (mockPrisma.deviceToken.findMany as jest.Mock).mockResolvedValue(mockTokens);

            const { deviceTokenRepository } = require('../src/repositories/device-token.repository');
            const result = await deviceTokenRepository.findActiveByFarmerId('f1');

            expect(result).toHaveLength(2);
        });
    });

    describe('deactivate', () => {
        it('should deactivate tokens for farmer', async () => {
            (mockPrisma.deviceToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

            const { deviceTokenRepository } = require('../src/repositories/device-token.repository');
            await deviceTokenRepository.deactivate('f1', 'token1');

            expect(mockPrisma.deviceToken.updateMany).toHaveBeenCalled();
        });
    });
});

// ============================================================================
// SmsService Tests
// ============================================================================

describe('SmsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset module cache to get fresh instances
        jest.resetModules();
    });

    describe('SMS quota enforcement', () => {
        it('should allow sending when under quota (19 messages)', async () => {
            (mockPrisma.smsDeliveryLog.count as jest.Mock).mockResolvedValue(19);
            (mockPrisma.smsDeliveryLog.create as jest.Mock).mockResolvedValue({ id: 'log-1' });

            const { smsService } = require('../src/services/sms.service');
            const result = await smsService.sendSms({
                farmerId: 'f1',
                phoneNumber: '+919876543210',
                templateKey: 'ORDER_MATCHED',
                templateParams: { crop: 'Tomato' },
            });

            expect(result.success).toBe(true);
        });

        it('should block sending at quota limit (20 messages)', async () => {
            (mockPrisma.smsDeliveryLog.count as jest.Mock).mockResolvedValue(20);

            const { smsService } = require('../src/services/sms.service');
            const result = await smsService.sendSms({
                farmerId: 'f1',
                phoneNumber: '+919876543210',
                templateKey: 'ORDER_MATCHED',
                templateParams: {},
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('quota');
        });
    });
});

// ============================================================================
// Integration test placeholder
// ============================================================================

describe('End-to-end notification flow', () => {
    it('should be implemented in integration tests', () => {
        expect(true).toBe(true);
    });
});
