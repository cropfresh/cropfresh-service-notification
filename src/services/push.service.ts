/**
 * Push Notification Service - Story 3.8 (Task 4)
 * 
 * FCM push notification delivery with:
 * - Firebase Admin SDK integration (AC: 2, 7)
 * - Device token management
 * - Quiet hours filtering (AC: 4)
 * - Deep link generation
 * - Badge count synchronization
 * 
 * @module push-service
 */

import { TemplateType } from '../generated/prisma/client';
import type { DeviceToken } from '../generated/prisma/client';
import { logger } from '../utils/logger';
import { deviceTokenRepository } from '../repositories/device-token.repository';
import { preferencesRepository } from '../repositories/preferences.repository';
// import * as admin from 'firebase-admin';  // Uncomment when Firebase is set up

// ============================================================================
// Types
// ============================================================================

export enum SupportedLanguage {
    ENGLISH = 'en',
    KANNADA = 'kn',
    HINDI = 'hi',
    TAMIL = 'ta',
    TELUGU = 'te',
}

export interface PushNotificationParams {
    farmerId: string;
    type: TemplateType;
    title: string;
    body: string;
    deeplink?: string;
    metadata?: Record<string, string>;
    language?: string;
    highPriority?: boolean;
    bypassQuietHours?: boolean;
}

export interface PushSendResult {
    success: boolean;
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
    error?: string;
}

// ============================================================================
// Push Service Class
// ============================================================================

export class PushService {
    // Firebase Admin (mock for now)
    // private firebaseApp: admin.app.App;

    constructor() {
        // Initialize Firebase Admin SDK
        // this.firebaseApp = admin.initializeApp({
        //   credential: admin.credential.cert(serviceAccount),
        // });
    }

    /**
     * Send push notification to a farmer (all devices) (AC: 2, 7)
     */
    async sendToFarmer(params: PushNotificationParams): Promise<PushSendResult> {
        // Check quiet hours (unless bypassed for critical notifications)
        if (!params.bypassQuietHours) {
            const isQuietHours = await preferencesRepository.isQuietHoursActive(params.farmerId);
            if (isQuietHours) {
                logger.debug({ farmerId: params.farmerId }, 'Push skipped - quiet hours active');
                return { success: true, successCount: 0, failureCount: 0, invalidTokens: [] };
            }
        }

        // Get active device tokens
        const tokens = await deviceTokenRepository.findActiveByFarmerId(params.farmerId);
        if (tokens.length === 0) {
            logger.debug({ farmerId: params.farmerId }, 'No active device tokens found');
            return { success: true, successCount: 0, failureCount: 0, invalidTokens: [] };
        }

        // Build push payload
        const payload = this.buildPayload(params);

        // Send to all devices
        const results = await Promise.allSettled(
            tokens.map((token) => this.sendToDevice(token.fcmToken, payload, params.highPriority))
        );

        // Process results
        let successCount = 0;
        let failureCount = 0;
        const invalidTokens: string[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                successCount++;
            } else {
                failureCount++;
                const error = result.status === 'rejected' ? result.reason.message : result.value.error;

                // Mark invalid tokens
                if (this.isInvalidTokenError(error)) {
                    invalidTokens.push(tokens[index].fcmToken);
                }
            }
        });

        // Deactivate invalid tokens
        if (invalidTokens.length > 0) {
            await Promise.all(
                invalidTokens.map((token) => deviceTokenRepository.markInvalid(token))
            );
            logger.info({ count: invalidTokens.length }, 'Deactivated invalid FCM tokens');
        }

        logger.info({
            farmerId: params.farmerId,
            type: params.type,
            successCount,
            failureCount,
        }, 'Push notification sent');

        return {
            success: successCount > 0,
            successCount,
            failureCount,
            invalidTokens,
        };
    }

    /**
     * Send push to a specific device token
     */
    private async sendToDevice(
        token: string,
        payload: any,
        highPriority?: boolean
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            // TODO: Replace with actual Firebase Admin SDK
            // const message: admin.messaging.Message = {
            //   token,
            //   notification: payload.notification,
            //   data: payload.data,
            //   android: {
            //     priority: highPriority ? 'high' : 'normal',
            //   },
            //   apns: {
            //     headers: {
            //       'apns-priority': highPriority ? '10' : '5',
            //     },
            //   },
            // };
            // const messageId = await admin.messaging().send(message);
            // return { success: true, messageId };

            // Mock implementation
            await this.mockDelay();

            // Simulate 5% failure
            if (Math.random() < 0.05) {
                throw new Error('messaging/invalid-registration-token');
            }

            const mockMessageId = `fcm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            logger.debug({ tokenPrefix: token.slice(0, 10) }, 'Push sent (mock)');

            return { success: true, messageId: mockMessageId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Build FCM payload from parameters
     */
    private buildPayload(params: PushNotificationParams): any {
        const deeplink = params.deeplink || this.getDefaultDeeplink(params.type);

        return {
            notification: {
                title: params.title,
                body: params.body,
            },
            data: {
                type: params.type,
                deeplink,
                notification_id: `notif-${Date.now()}`,
                ...params.metadata,
            },
        };
    }

    /**
     * Get default deeplink for notification type
     */
    private getDefaultDeeplink(type: TemplateType): string {
        const deeplinkMap: Partial<Record<TemplateType, string>> = {
            [TemplateType.ORDER_MATCHED]: '/match-details',
            [TemplateType.PAYMENT_RECEIVED]: '/earnings',
            [TemplateType.MATCH_EXPIRING]: '/match-details',
            [TemplateType.ORDER_CANCELLED]: '/orders',
            [TemplateType.QUALITY_DISPUTE]: '/orders',
            [TemplateType.HAULER_EN_ROUTE]: '/orders',
            [TemplateType.PICKUP_COMPLETE]: '/orders',
            [TemplateType.DELIVERED]: '/orders',
            [TemplateType.DROP_POINT_ASSIGNMENT]: '/drop-point',
            [TemplateType.MATCH_EXPIRED]: '/listings',
            [TemplateType.EDUCATIONAL_CONTENT]: '/tips',
        };

        return deeplinkMap[type] || '/notifications';
    }

    /**
     * Check if error indicates an invalid token
     */
    private isInvalidTokenError(error?: string): boolean {
        if (!error) return false;
        const invalidTokenErrors = [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
            'messaging/invalid-argument',
        ];
        return invalidTokenErrors.some((e) => error.includes(e));
    }

    /**
     * Register device token
     */
    async registerToken(farmerId: string, fcmToken: string, deviceType?: string): Promise<boolean> {
        try {
            await deviceTokenRepository.upsert({
                farmerId,
                fcmToken,
                deviceType,
            });
            logger.info({ farmerId, deviceType }, 'Device token registered');
            return true;
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to register device token');
            return false;
        }
    }

    /**
     * Unregister device token
     */
    async unregisterToken(farmerId: string, fcmToken: string): Promise<boolean> {
        try {
            await deviceTokenRepository.deactivate(farmerId, fcmToken);
            logger.info({ farmerId }, 'Device token unregistered');
            return true;
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to unregister device token');
            return false;
        }
    }

    /**
     * Get push notification title templates
     */
    getTitle(type: TemplateType, language: SupportedLanguage): string {
        const titles: Partial<Record<TemplateType, Record<SupportedLanguage, string>>> = {
            [TemplateType.ORDER_MATCHED]: {
                [SupportedLanguage.ENGLISH]: '🎉 Buyer Found!',
                [SupportedLanguage.KANNADA]: '🎉 ಖರೀದಿದಾರ ಸಿಕ್ಕಿದ್ದಾರೆ!',
                [SupportedLanguage.HINDI]: '🎉 खरीदार मिला!',
                [SupportedLanguage.TAMIL]: '🎉 வாங்குபவர் கிடைத்தார்!',
                [SupportedLanguage.TELUGU]: '🎉 కొనుగోలుదారు దొరికాడు!',
            },
            [TemplateType.PAYMENT_RECEIVED]: {
                [SupportedLanguage.ENGLISH]: '💰 Payment Received',
                [SupportedLanguage.KANNADA]: '💰 ಹಣ ಬಂದಿದೆ',
                [SupportedLanguage.HINDI]: '💰 भुगतान मिला',
                [SupportedLanguage.TAMIL]: '💰 பணம் வந்தது',
                [SupportedLanguage.TELUGU]: '💰 చెల్లింపు వచ్చింది',
            },
            [TemplateType.MATCH_EXPIRING]: {
                [SupportedLanguage.ENGLISH]: '⏰ Match Expiring Soon',
                [SupportedLanguage.KANNADA]: '⏰ ಮ್ಯಾಚ್ ಮುಕ್ತಾಯ',
                [SupportedLanguage.HINDI]: '⏰ मैच खत्म होगा',
                [SupportedLanguage.TAMIL]: '⏰ மேட்ச் முடியப்போகிறது',
                [SupportedLanguage.TELUGU]: '⏰ మ్యాచ్ ముగుస్తుంది',
            },
            [TemplateType.ORDER_CANCELLED]: {
                [SupportedLanguage.ENGLISH]: '❌ Order Cancelled',
                [SupportedLanguage.KANNADA]: '❌ ಆರ್ಡರ್ ರದ್ದು',
                [SupportedLanguage.HINDI]: '❌ ऑर्डर रद्द',
                [SupportedLanguage.TAMIL]: '❌ ஆர்டர் ரத்து',
                [SupportedLanguage.TELUGU]: '❌ ఆర్డర్ రద్దు',
            },
            [TemplateType.HAULER_EN_ROUTE]: {
                [SupportedLanguage.ENGLISH]: '🚛 Hauler On The Way',
                [SupportedLanguage.KANNADA]: '🚛 ಹಾಲರ್ ಬರುತ್ತಿದ್ದಾರೆ',
                [SupportedLanguage.HINDI]: '🚛 हॉलर रास्ते में',
                [SupportedLanguage.TAMIL]: '🚛 ஹாலர் வரும்',
                [SupportedLanguage.TELUGU]: '🚛 హాలర్ వస్తున్నాడు',
            },
            [TemplateType.DELIVERED]: {
                [SupportedLanguage.ENGLISH]: '✅ Delivered',
                [SupportedLanguage.KANNADA]: '✅ ತಲುಪಿದೆ',
                [SupportedLanguage.HINDI]: '✅ पहुंच गया',
                [SupportedLanguage.TAMIL]: '✅ வந்துவிட்டது',
                [SupportedLanguage.TELUGU]: '✅ చేరింది',
            },
        };

        return (
            titles[type]?.[language] ||
            titles[type]?.[SupportedLanguage.ENGLISH] ||
            'CropFresh Notification'
        );
    }

    /**
     * Mock delay for development
     */
    private mockDelay(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, 50));
    }
}

// Export singleton instance
export const pushService = new PushService();
