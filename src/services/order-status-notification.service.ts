/**
 * Order Status Notification Service - Story 3.6 (AC: 2, 4)
 * 
 * SITUATION: Farmers need real-time notifications for order status changes
 * TASK: Send push notifications and SMS for each status transition
 * ACTION: Integrate with FCM and SMS gateway, use localized templates
 * RESULT: Farmers receive timely notifications in their preferred language
 * 
 * @module order-status-notification-service
 */

import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export enum OrderTrackingStatus {
    LISTED = 'LISTED',
    MATCHED = 'MATCHED',
    PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
    AT_DROP_POINT = 'AT_DROP_POINT',
    IN_TRANSIT = 'IN_TRANSIT',
    DELIVERED = 'DELIVERED',
    PAID = 'PAID'
}

export enum SupportedLanguage {
    ENGLISH = 'en',
    KANNADA = 'kn',
    HINDI = 'hi',
    TAMIL = 'ta',
    TELUGU = 'te'
}

export interface OrderStatusNotificationPayload {
    farmerId: number;
    farmerPhone: string;
    farmerLanguage: string;
    farmerFcmToken?: string;
    orderId: string;
    cropName: string;
    quantityKg: number;
    totalAmount: number;
    previousStatus: OrderTrackingStatus;
    newStatus: OrderTrackingStatus;
    haulerName?: string;
    haulerPhone?: string;
    eta?: string;
    upiTransactionId?: string;
}

export interface DelayNotificationPayload {
    farmerId: number;
    farmerPhone: string;
    farmerLanguage: string;
    farmerFcmToken?: string;
    orderId: string;
    cropName: string;
    delayMinutes: number;
    reason: string;
    newEta?: string;
}

export interface NotificationResult {
    success: boolean;
    smsId?: string;
    pushId?: string;
    error?: string;
}

// ============================================================================
// Order Status Notification Service
// ============================================================================

export class OrderStatusNotificationService {
    /**
     * STAR: Send status change notification (AC2)
     * Situation: Order status has transitioned to a new state
     * Task: Notify farmer via push and SMS
     * Action: Build localized message and send via FCM/SMS
     */
    async sendStatusChangeNotification(payload: OrderStatusNotificationPayload): Promise<NotificationResult> {
        const language = this.parseLanguage(payload.farmerLanguage);

        try {
            // Build SMS message based on status
            const smsMessage = this.buildStatusSMS(language, payload);

            // Build Push notification
            const pushPayload = {
                notification: {
                    title: this.getStatusPushTitle(payload.newStatus, language),
                    body: this.getStatusPushBody(payload, language),
                },
                data: {
                    type: 'ORDER_STATUS_UPDATE',
                    orderId: payload.orderId,
                    status: payload.newStatus,
                    deepLink: `/orders/${payload.orderId}`,
                },
            };

            // Send notifications
            const smsResult = await this.sendSMS(payload.farmerPhone, smsMessage);
            const pushResult = payload.farmerFcmToken
                ? await this.sendPushNotification(payload.farmerFcmToken, pushPayload)
                : { success: true, id: undefined };

            logger.info({
                orderId: payload.orderId,
                farmerId: payload.farmerId,
                status: payload.newStatus,
                smsSent: smsResult.success,
                pushSent: pushResult.success,
            }, 'Order status notification sent');

            return {
                success: smsResult.success || pushResult.success,
                smsId: smsResult.id ?? undefined,
                pushId: pushResult.id ?? undefined,
            };
        } catch (error: any) {
            logger.error({ error, orderId: payload.orderId }, 'Failed to send status notification');
            return { success: false, error: error.message };
        }
    }

    /**
     * STAR: Send delay notification (AC4)
     * Situation: Order is delayed during transit
     * Task: Notify farmer about delay with urgency
     * Action: Send SMS and push with delay details
     */
    async sendDelayNotification(payload: DelayNotificationPayload): Promise<NotificationResult> {
        const language = this.parseLanguage(payload.farmerLanguage);

        try {
            const smsMessage = this.buildDelaySMS(language, payload);

            const pushPayload = {
                notification: {
                    title: this.getDelayPushTitle(language),
                    body: `${payload.cropName} delayed ${payload.delayMinutes} min - ${payload.reason}`,
                },
                data: {
                    type: 'ORDER_DELAY',
                    orderId: payload.orderId,
                    delayMinutes: String(payload.delayMinutes),
                    deepLink: `/orders/${payload.orderId}`,
                },
            };

            const smsResult = await this.sendSMS(payload.farmerPhone, smsMessage);
            const pushResult = payload.farmerFcmToken
                ? await this.sendPushNotification(payload.farmerFcmToken, pushPayload)
                : { success: true, id: undefined };

            logger.info({
                orderId: payload.orderId,
                farmerId: payload.farmerId,
                delayMinutes: payload.delayMinutes,
            }, 'Delay notification sent');

            return {
                success: smsResult.success || pushResult.success,
                smsId: smsResult.id ?? undefined,
                pushId: pushResult.id ?? undefined,
            };
        } catch (error: any) {
            logger.error({ error, orderId: payload.orderId }, 'Failed to send delay notification');
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // SMS Message Builders (5 Languages - AC2)
    // =========================================================================

    private buildStatusSMS(language: SupportedLanguage, payload: OrderStatusNotificationPayload): string {
        const templates: Record<OrderTrackingStatus, Record<SupportedLanguage, (p: OrderStatusNotificationPayload) => string>> = {
            [OrderTrackingStatus.LISTED]: {
                [SupportedLanguage.ENGLISH]: (p) => `CropFresh: Your ${p.cropName} (${p.quantityKg}kg) is listed for sale.`,
                [SupportedLanguage.KANNADA]: (p) => `CropFresh: ನಿಮ್ಮ ${p.cropName} (${p.quantityKg}ಕೆಜಿ) ಪಟ್ಟಿ ಮಾಡಲಾಗಿದೆ.`,
                [SupportedLanguage.HINDI]: (p) => `CropFresh: आपका ${p.cropName} (${p.quantityKg}kg) लिस्ट हो गया।`,
                [SupportedLanguage.TAMIL]: (p) => `CropFresh: உங்கள் ${p.cropName} (${p.quantityKg}kg) பட்டியலிடப்பட்டது.`,
                [SupportedLanguage.TELUGU]: (p) => `CropFresh: మీ ${p.cropName} (${p.quantityKg}kg) జాబితాలో ఉంది.`,
            },
            [OrderTrackingStatus.MATCHED]: {
                [SupportedLanguage.ENGLISH]: (p) => `CropFresh: Buyer found for ${p.cropName}! ₹${p.totalAmount} total. Check app now.`,
                [SupportedLanguage.KANNADA]: (p) => `CropFresh: ${p.cropName}ಗೆ ಖರೀದಿದಾರ ಸಿಕ್ಕಿದ್ದಾರೆ! ₹${p.totalAmount}. ಆ್ಯಪ್ ನೋಡಿ.`,
                [SupportedLanguage.HINDI]: (p) => `CropFresh: ${p.cropName} के लिए खरीदार मिला! ₹${p.totalAmount}। ऐप देखें।`,
                [SupportedLanguage.TAMIL]: (p) => `CropFresh: ${p.cropName} வாங்குபவர் கிடைத்தார்! ₹${p.totalAmount}. ஆப் பாருங்கள்.`,
                [SupportedLanguage.TELUGU]: (p) => `CropFresh: ${p.cropName}కు కొనుగోలుదారు! ₹${p.totalAmount}. యాప్ చూడండి.`,
            },
            [OrderTrackingStatus.PICKUP_SCHEDULED]: {
                [SupportedLanguage.ENGLISH]: (p) => `CropFresh: Pickup scheduled for ${p.cropName}. Deliver to drop point by ${p.eta || 'tomorrow 9AM'}.`,
                [SupportedLanguage.KANNADA]: (p) => `CropFresh: ${p.cropName} ಪಿಕಪ್ ನಿಗದಿ. ${p.eta || 'ನಾಳೆ 9ಗಂಟೆ'}ಗೆ ಡ್ರಾಪ್ ಪಾಯಿಂಟ್ಗೆ ತನ್ನಿ.`,
                [SupportedLanguage.HINDI]: (p) => `CropFresh: ${p.cropName} पिकअप निर्धारित। ${p.eta || 'कल 9AM'} तक ड्रॉप पॉइंट लाएं।`,
                [SupportedLanguage.TAMIL]: (p) => `CropFresh: ${p.cropName} பிக்அப் திட்டமிடப்பட்டது. ${p.eta || 'நாளை 9AM'} வரை கொண்டு வாருங்கள்.`,
                [SupportedLanguage.TELUGU]: (p) => `CropFresh: ${p.cropName} పికప్ షెడ్యూల్. ${p.eta || 'రేపు 9AM'} లోపల తీసుకురండి.`,
            },
            [OrderTrackingStatus.AT_DROP_POINT]: {
                [SupportedLanguage.ENGLISH]: (p) => `CropFresh: ${p.cropName} received at drop point. Awaiting pickup.`,
                [SupportedLanguage.KANNADA]: (p) => `CropFresh: ${p.cropName} ಡ್ರಾಪ್ ಪಾಯಿಂಟ್ನಲ್ಲಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಪಿಕಪ್ ಕಾಯುತ್ತಿದೆ.`,
                [SupportedLanguage.HINDI]: (p) => `CropFresh: ${p.cropName} ड्रॉप पॉइंट पर प्राप्त। पिकअप का इंतजार।`,
                [SupportedLanguage.TAMIL]: (p) => `CropFresh: ${p.cropName} டிராப் பாயிண்டில் பெறப்பட்டது. பிக்அப் காத்திருக்கிறது.`,
                [SupportedLanguage.TELUGU]: (p) => `CropFresh: ${p.cropName} డ్రాప్ పాయింట్‌లో అందింది. పికప్ కోసం వేచి ఉంది.`,
            },
            [OrderTrackingStatus.IN_TRANSIT]: {
                [SupportedLanguage.ENGLISH]: (p) => `CropFresh: ${p.cropName} is on the way! Hauler: ${p.haulerName || 'Driver'} (${p.haulerPhone || ''}).`,
                [SupportedLanguage.KANNADA]: (p) => `CropFresh: ${p.cropName} ಹೊರಟಿದೆ! ಹಾಲರ್: ${p.haulerName || 'ಡ್ರೈವರ್'} (${p.haulerPhone || ''}).`,
                [SupportedLanguage.HINDI]: (p) => `CropFresh: ${p.cropName} रास्ते में! ड्राइवर: ${p.haulerName || 'Driver'} (${p.haulerPhone || ''}).`,
                [SupportedLanguage.TAMIL]: (p) => `CropFresh: ${p.cropName} பயணத்தில்! ஓட்டுநர்: ${p.haulerName || 'Driver'} (${p.haulerPhone || ''}).`,
                [SupportedLanguage.TELUGU]: (p) => `CropFresh: ${p.cropName} మార్గంలో! డ్రైవర్: ${p.haulerName || 'Driver'} (${p.haulerPhone || ''}).`,
            },
            [OrderTrackingStatus.DELIVERED]: {
                [SupportedLanguage.ENGLISH]: (p) => `CropFresh: ${p.cropName} delivered! ₹${p.totalAmount} payment processing.`,
                [SupportedLanguage.KANNADA]: (p) => `CropFresh: ${p.cropName} ತಲುಪಿದೆ! ₹${p.totalAmount} ಪಾವತಿ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿ.`,
                [SupportedLanguage.HINDI]: (p) => `CropFresh: ${p.cropName} पहुंच गया! ₹${p.totalAmount} भुगतान प्रक्रिया में।`,
                [SupportedLanguage.TAMIL]: (p) => `CropFresh: ${p.cropName} வந்துவிட்டது! ₹${p.totalAmount} பணம் செயல்படுத்தப்படுகிறது.`,
                [SupportedLanguage.TELUGU]: (p) => `CropFresh: ${p.cropName} చేరింది! ₹${p.totalAmount} చెల్లింపు ప్రాసెస్‌లో.`,
            },
            [OrderTrackingStatus.PAID]: {
                [SupportedLanguage.ENGLISH]: (p) => `CropFresh: ₹${p.totalAmount} paid to your account! UPI Ref: ${p.upiTransactionId || 'N/A'}`,
                [SupportedLanguage.KANNADA]: (p) => `CropFresh: ₹${p.totalAmount} ನಿಮ್ಮ ಖಾತೆಗೆ ಬಂದಿದೆ! UPI: ${p.upiTransactionId || 'N/A'}`,
                [SupportedLanguage.HINDI]: (p) => `CropFresh: ₹${p.totalAmount} आपके खाते में! UPI Ref: ${p.upiTransactionId || 'N/A'}`,
                [SupportedLanguage.TAMIL]: (p) => `CropFresh: ₹${p.totalAmount} உங்கள் கணக்கில்! UPI: ${p.upiTransactionId || 'N/A'}`,
                [SupportedLanguage.TELUGU]: (p) => `CropFresh: ₹${p.totalAmount} మీ ఖాతాలో! UPI Ref: ${p.upiTransactionId || 'N/A'}`,
            },
        };

        const template = templates[payload.newStatus]?.[language] || templates[payload.newStatus]?.[SupportedLanguage.ENGLISH];
        return template?.(payload) || `CropFresh: Order ${payload.orderId} status: ${payload.newStatus}`;
    }

    private buildDelaySMS(language: SupportedLanguage, payload: DelayNotificationPayload): string {
        const templates: Record<SupportedLanguage, (p: DelayNotificationPayload) => string> = {
            [SupportedLanguage.ENGLISH]: (p) => `CropFresh: ${p.cropName} delayed ${p.delayMinutes} min. Reason: ${p.reason}. New ETA: ${p.newEta || 'TBD'}`,
            [SupportedLanguage.KANNADA]: (p) => `CropFresh: ${p.cropName} ${p.delayMinutes} ನಿಮಿಷ ತಡ. ಕಾರಣ: ${p.reason}. ಹೊಸ ETA: ${p.newEta || 'TBD'}`,
            [SupportedLanguage.HINDI]: (p) => `CropFresh: ${p.cropName} ${p.delayMinutes} मिनट देरी। कारण: ${p.reason}। नया ETA: ${p.newEta || 'TBD'}`,
            [SupportedLanguage.TAMIL]: (p) => `CropFresh: ${p.cropName} ${p.delayMinutes} நிமிடம் தாமதம். காரணம்: ${p.reason}. புதிய ETA: ${p.newEta || 'TBD'}`,
            [SupportedLanguage.TELUGU]: (p) => `CropFresh: ${p.cropName} ${p.delayMinutes} నిమి ఆలస్యం. కారణం: ${p.reason}. కొత్త ETA: ${p.newEta || 'TBD'}`,
        };

        return templates[language]?.(payload) || templates[SupportedLanguage.ENGLISH](payload);
    }

    // =========================================================================
    // Push Notification Helpers
    // =========================================================================

    private getStatusPushTitle(status: OrderTrackingStatus, language: SupportedLanguage): string {
        const titles: Record<OrderTrackingStatus, Record<SupportedLanguage, string>> = {
            [OrderTrackingStatus.LISTED]: {
                [SupportedLanguage.ENGLISH]: '📝 Crop Listed',
                [SupportedLanguage.KANNADA]: '📝 ಪಟ್ಟಿ ಮಾಡಲಾಗಿದೆ',
                [SupportedLanguage.HINDI]: '📝 सूचीबद्ध',
                [SupportedLanguage.TAMIL]: '📝 பட்டியலிடப்பட்டது',
                [SupportedLanguage.TELUGU]: '📝 జాబితా',
            },
            [OrderTrackingStatus.MATCHED]: {
                [SupportedLanguage.ENGLISH]: '🎉 Buyer Matched!',
                [SupportedLanguage.KANNADA]: '🎉 ಖರೀದಿದಾರ ಸಿಕ್ಕಿದ್ದಾರೆ!',
                [SupportedLanguage.HINDI]: '🎉 खरीदार मिला!',
                [SupportedLanguage.TAMIL]: '🎉 வாங்குபவர் கிடைத்தார்!',
                [SupportedLanguage.TELUGU]: '🎉 కొనుగోలుదారు!',
            },
            [OrderTrackingStatus.PICKUP_SCHEDULED]: {
                [SupportedLanguage.ENGLISH]: '📅 Pickup Scheduled',
                [SupportedLanguage.KANNADA]: '📅 ಪಿಕಪ್ ನಿಗದಿ',
                [SupportedLanguage.HINDI]: '📅 पिकअप निर्धारित',
                [SupportedLanguage.TAMIL]: '📅 பிக்அப் திட்டம்',
                [SupportedLanguage.TELUGU]: '📅 పికప్ షెడ్యూల్',
            },
            [OrderTrackingStatus.AT_DROP_POINT]: {
                [SupportedLanguage.ENGLISH]: '📦 At Drop Point',
                [SupportedLanguage.KANNADA]: '📦 ಡ್ರಾಪ್ ಪಾಯಿಂಟ್',
                [SupportedLanguage.HINDI]: '📦 ड्रॉप पॉइंट पर',
                [SupportedLanguage.TAMIL]: '📦 டிராப் பாயிண்ட்',
                [SupportedLanguage.TELUGU]: '📦 డ్రాప్ పాయింట్',
            },
            [OrderTrackingStatus.IN_TRANSIT]: {
                [SupportedLanguage.ENGLISH]: '🚛 In Transit',
                [SupportedLanguage.KANNADA]: '🚛 ಸಾಗಣೆಯಲ್ಲಿ',
                [SupportedLanguage.HINDI]: '🚛 रास्ते में',
                [SupportedLanguage.TAMIL]: '🚛 பயணத்தில்',
                [SupportedLanguage.TELUGU]: '🚛 మార్గంలో',
            },
            [OrderTrackingStatus.DELIVERED]: {
                [SupportedLanguage.ENGLISH]: '✅ Delivered!',
                [SupportedLanguage.KANNADA]: '✅ ತಲುಪಿದೆ!',
                [SupportedLanguage.HINDI]: '✅ पहुंच गया!',
                [SupportedLanguage.TAMIL]: '✅ வந்துவிட்டது!',
                [SupportedLanguage.TELUGU]: '✅ చేరింది!',
            },
            [OrderTrackingStatus.PAID]: {
                [SupportedLanguage.ENGLISH]: '💰 Payment Received!',
                [SupportedLanguage.KANNADA]: '💰 ಹಣ ಬಂದಿದೆ!',
                [SupportedLanguage.HINDI]: '💰 भुगतान मिला!',
                [SupportedLanguage.TAMIL]: '💰 பணம் வந்தது!',
                [SupportedLanguage.TELUGU]: '💰 డబ్బు వచ్చింది!',
            },
        };

        return titles[status]?.[language] || titles[status]?.[SupportedLanguage.ENGLISH] || 'CropFresh Update';
    }

    private getStatusPushBody(payload: OrderStatusNotificationPayload, language: SupportedLanguage): string {
        return `${payload.cropName} (${payload.quantityKg}kg) - ₹${payload.totalAmount}`;
    }

    private getDelayPushTitle(language: SupportedLanguage): string {
        const titles: Record<SupportedLanguage, string> = {
            [SupportedLanguage.ENGLISH]: '⚠️ Order Delayed',
            [SupportedLanguage.KANNADA]: '⚠️ ತಡವಾಗಿದೆ',
            [SupportedLanguage.HINDI]: '⚠️ देरी हुई',
            [SupportedLanguage.TAMIL]: '⚠️ தாமதம்',
            [SupportedLanguage.TELUGU]: '⚠️ ఆలస్యం',
        };
        return titles[language] || titles[SupportedLanguage.ENGLISH];
    }

    private parseLanguage(lang: string): SupportedLanguage {
        const map: Record<string, SupportedLanguage> = {
            en: SupportedLanguage.ENGLISH,
            kn: SupportedLanguage.KANNADA,
            hi: SupportedLanguage.HINDI,
            ta: SupportedLanguage.TAMIL,
            te: SupportedLanguage.TELUGU,
        };
        return map[lang?.toLowerCase()] || SupportedLanguage.ENGLISH;
    }

    // =========================================================================
    // External Gateways (Mock)
    // =========================================================================

    private async sendSMS(phone: string, message: string): Promise<{ success: boolean; id: string | undefined }> {
        // TODO: Integrate with actual SMS gateway (Twilio/MSG91)
        logger.info({ phone: phone.slice(-4), messageLength: message.length }, 'SMS sent (mock)');
        return { success: true, id: `sms-${Date.now()}` };
    }

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
export const orderStatusNotificationService = new OrderStatusNotificationService();
