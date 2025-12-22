/**
 * Match Notification Service (Story 3.5 - AC1, AC3, AC7)
 * 
 * SITUATION: Farmers need real-time notifications about buyer matches
 * TASK: Send push notifications and SMS for match events
 * ACTION: Integrate with FCM and SMS gateway, use localized templates
 * RESULT: Farmers receive timely notifications in their preferred language
 * 
 * @module match-notification-service
 */

import { logger } from '../utils/logger';
import {
    SupportedLanguage,
    MatchTemplateVariables,
    buildMatchFoundSMS,
    buildMatchAcceptedSMS,
    buildMatchExpirySMS,
    parseLanguage,
} from '../templates/match-templates';

// ============================================================================
// Types
// ============================================================================

export interface MatchNotificationPayload {
    farmerId: number;
    farmerPhone: string;
    farmerLanguage: string;
    farmerFcmToken?: string;
    matchId: string;
    cropName: string;
    quantityKg: number;
    pricePerKg: number;
    totalAmount: number;
    buyerType: string;
    buyerLocation: string;
    expiryTime?: string;
    deliveryDate?: string;
    orderId?: string;
}

export interface NotificationResult {
    success: boolean;
    smsId?: string;
    pushId?: string;
    error?: string;
}

// ============================================================================
// Match Notification Service
// ============================================================================

export class MatchNotificationService {
    /**
     * STAR: Send Match Found Notification (AC1)
     * Situation: A buyer match has been made for a farmer's listing
     * Task: Notify the farmer via push notification and SMS
     * Action: Build localized messages and send via FCM/SMS gateways
     * Result: Farmer is informed and can respond promptly
     */
    async sendMatchFoundNotification(payload: MatchNotificationPayload): Promise<NotificationResult> {
        const language = parseLanguage(payload.farmerLanguage);
        const variables = this.buildTemplateVariables(payload);

        try {
            // Build SMS message
            const smsMessage = buildMatchFoundSMS(language, variables);

            // Build Push notification payload
            const pushPayload = {
                notification: {
                    title: this.getPushTitle('MATCH_FOUND', language),
                    body: `${payload.quantityKg}kg ${payload.cropName} - ₹${payload.totalAmount}`,
                },
                data: {
                    type: 'MATCH_FOUND',
                    matchId: payload.matchId,
                    deepLink: `/matches/${payload.matchId}`,
                },
            };

            // Send notifications (mock implementation)
            const smsResult = await this.sendSMS(payload.farmerPhone, smsMessage);
            const pushResult = payload.farmerFcmToken
                ? await this.sendPushNotification(payload.farmerFcmToken, pushPayload)
                : { success: true, id: undefined };

            logger.info({
                matchId: payload.matchId,
                farmerId: payload.farmerId,
                smsSent: smsResult.success,
                pushSent: pushResult.success,
            }, 'Match found notification sent');

            return {
                success: smsResult.success || pushResult.success,
                smsId: smsResult.id ?? undefined,
                pushId: pushResult.id ?? undefined,
            };
        } catch (error: any) {
            logger.error({ error, matchId: payload.matchId }, 'Failed to send match found notification');
            return { success: false, error: error.message };
        }
    }

    /**
     * STAR: Send Match Accepted Confirmation (AC3)
     */
    async sendMatchAcceptedNotification(payload: MatchNotificationPayload): Promise<NotificationResult> {
        const language = parseLanguage(payload.farmerLanguage);
        const variables = this.buildTemplateVariables(payload);

        try {
            const smsMessage = buildMatchAcceptedSMS(language, variables);

            const pushPayload = {
                notification: {
                    title: this.getPushTitle('MATCH_ACCEPTED', language),
                    body: `Order #${payload.orderId} confirmed - ₹${payload.totalAmount}`,
                },
                data: {
                    type: 'MATCH_ACCEPTED',
                    matchId: payload.matchId,
                    orderId: payload.orderId,
                    deepLink: `/orders/${payload.orderId}`,
                },
            };

            const smsResult = await this.sendSMS(payload.farmerPhone, smsMessage);
            const pushResult = payload.farmerFcmToken
                ? await this.sendPushNotification(payload.farmerFcmToken, pushPayload)
                : { success: true, id: undefined };

            logger.info({
                matchId: payload.matchId,
                orderId: payload.orderId,
                farmerId: payload.farmerId,
            }, 'Match accepted notification sent');

            return {
                success: smsResult.success || pushResult.success,
                smsId: smsResult.id ?? undefined,
                pushId: pushResult.id ?? undefined,
            };
        } catch (error: any) {
            logger.error({ error, matchId: payload.matchId }, 'Failed to send match accepted notification');
            return { success: false, error: error.message };
        }
    }

    /**
     * STAR: Send Match Expiry Reminder (AC7)
     * Situation: Match is expiring soon (2 hours before)
     */
    async sendMatchExpiryReminder(payload: MatchNotificationPayload): Promise<NotificationResult> {
        const language = parseLanguage(payload.farmerLanguage);
        const variables = this.buildTemplateVariables(payload);

        try {
            const smsMessage = buildMatchExpirySMS(language, variables);

            const pushPayload = {
                notification: {
                    title: this.getPushTitle('MATCH_EXPIRY', language),
                    body: `${payload.cropName} match expires in ${payload.expiryTime}!`,
                },
                data: {
                    type: 'MATCH_EXPIRY_REMINDER',
                    matchId: payload.matchId,
                    deepLink: `/matches/${payload.matchId}`,
                },
            };

            const smsResult = await this.sendSMS(payload.farmerPhone, smsMessage);
            const pushResult = payload.farmerFcmToken
                ? await this.sendPushNotification(payload.farmerFcmToken, pushPayload)
                : { success: true, id: undefined };

            logger.info({
                matchId: payload.matchId,
                farmerId: payload.farmerId,
                expiryTime: payload.expiryTime,
            }, 'Match expiry reminder sent');

            return {
                success: smsResult.success || pushResult.success,
                smsId: smsResult.id ?? undefined,
                pushId: pushResult.id ?? undefined,
            };
        } catch (error: any) {
            logger.error({ error, matchId: payload.matchId }, 'Failed to send match expiry reminder');
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    private buildTemplateVariables(payload: MatchNotificationPayload): MatchTemplateVariables {
        return {
            crop_name: payload.cropName,
            quantity_kg: payload.quantityKg,
            price_per_kg: payload.pricePerKg,
            total_amount: payload.totalAmount,
            buyer_type: payload.buyerType,
            buyer_location: payload.buyerLocation,
            expiry_time: payload.expiryTime,
            delivery_date: payload.deliveryDate,
            order_id: payload.orderId,
        };
    }

    private getPushTitle(type: string, language: SupportedLanguage): string {
        const titles: Record<string, Record<SupportedLanguage, string>> = {
            MATCH_FOUND: {
                [SupportedLanguage.ENGLISH]: '🎉 New Buyer Match!',
                [SupportedLanguage.KANNADA]: '🎉 ಹೊಸ ಖರೀದಿದಾರ!',
                [SupportedLanguage.HINDI]: '🎉 नया खरीदार!',
                [SupportedLanguage.TAMIL]: '🎉 புதிய வாங்குபவர்!',
                [SupportedLanguage.TELUGU]: '🎉 కొత్త కొనుగోలుదారు!',
            },
            MATCH_ACCEPTED: {
                [SupportedLanguage.ENGLISH]: '✅ Order Confirmed!',
                [SupportedLanguage.KANNADA]: '✅ ಆರ್ಡರ್ ದೃಢಪಟ್ಟಿದೆ!',
                [SupportedLanguage.HINDI]: '✅ ऑर्डर पुष्टि!',
                [SupportedLanguage.TAMIL]: '✅ ஆர்டர் உறுதி!',
                [SupportedLanguage.TELUGU]: '✅ ఆర్డర్ నిర్ధారణ!',
            },
            MATCH_EXPIRY: {
                [SupportedLanguage.ENGLISH]: '⏰ Match Expiring!',
                [SupportedLanguage.KANNADA]: '⏰ ಮುಕ್ತಾಯವಾಗುತ್ತಿದೆ!',
                [SupportedLanguage.HINDI]: '⏰ समय समाप्त!',
                [SupportedLanguage.TAMIL]: '⏰ காலாவதி!',
                [SupportedLanguage.TELUGU]: '⏰ ముగుస్తోంది!',
            },
        };

        return titles[type]?.[language] || titles[type]?.[SupportedLanguage.ENGLISH] || 'CropFresh';
    }

    /**
     * Send SMS via gateway (mock implementation)
     * In production, integrate with Twilio, MSG91, or similar
     */
    private async sendSMS(phone: string, message: string): Promise<{ success: boolean; id: string | undefined }> {
        // TODO: Integrate with actual SMS gateway
        logger.info({ phone: phone.slice(-4), messageLength: message.length }, 'SMS sent (mock)');
        return { success: true, id: `sms-${Date.now()}` };
    }

    /**
     * Send push notification via FCM (mock implementation)
     */
    private async sendPushNotification(
        fcmToken: string,
        payload: any
    ): Promise<{ success: boolean; id: string | undefined }> {
        // TODO: Integrate with Firebase Admin SDK
        logger.info({ tokenPrefix: fcmToken.slice(0, 10), type: payload.data?.type }, 'Push sent (mock)');
        return { success: true, id: `push-${Date.now()}` };
    }
}

// Export singleton instance
export const matchNotificationService = new MatchNotificationService();
