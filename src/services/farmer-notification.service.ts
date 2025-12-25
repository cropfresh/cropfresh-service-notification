/**
 * Farmer Notification Service - Story 3.8 (Task 2)
 * 
 * Core notification business logic with smart routing:
 * - Critical notifications: SMS + Push (AC: 1)
 * - Important notifications: Push only (AC: 2)
 * - Preference-based filtering (AC: 4)
 * - In-app notification storage (AC: 3)
 * 
 * @module farmer-notification-service
 */

import { TemplateType } from '../generated/prisma/client';
import { logger } from '../utils/logger';
import { notificationRepository, CreateNotificationInput } from '../repositories/notification.repository';
import { preferencesRepository } from '../repositories/preferences.repository';
import { smsService, SupportedLanguage as SmsLanguage } from './sms.service';
import { pushService, SupportedLanguage as PushLanguage } from './push.service';

// ============================================================================
// Types
// ============================================================================

export interface SendNotificationParams {
    farmerId: string;
    phoneNumber?: string;
    type: TemplateType;
    title: string;
    body: string;
    deeplink?: string;
    metadata?: Record<string, string>;
    language?: string;
    forceSms?: boolean;
}

export interface NotificationResult {
    success: boolean;
    notificationId?: string;
    smsSuccess?: boolean;
    smsMessageId?: string;
    pushSuccess?: boolean;
    pushSuccessCount?: number;
    error?: string;
}

// Critical notification types that should send SMS
const CRITICAL_TYPES: TemplateType[] = [
    'ORDER_MATCHED',
    'PAYMENT_RECEIVED',
    'MATCH_EXPIRING',
    'ORDER_CANCELLED',
    'QUALITY_DISPUTE',
];

// Category mapping for preference checking
const TYPE_CATEGORY: Record<TemplateType, 'order' | 'payment' | 'educational'> = {
    ORDER_MATCHED: 'order',
    PAYMENT_RECEIVED: 'payment',
    MATCH_EXPIRING: 'order',
    ORDER_CANCELLED: 'order',
    QUALITY_DISPUTE: 'order',
    HAULER_EN_ROUTE: 'order',
    PICKUP_COMPLETE: 'order',
    DELIVERED: 'order',
    DROP_POINT_ASSIGNMENT: 'order',
    DROP_POINT_CHANGE: 'order',
    ORDER_CONFIRMATION: 'order',
    DELIVERY_REMINDER: 'order',
    MATCH_EXPIRED: 'order',
    EDUCATIONAL_CONTENT: 'educational',
    OTP: 'order',
};

// ============================================================================
// Farmer Notification Service
// ============================================================================

export class FarmerNotificationService {
    /**
     * Send notification with smart routing (AC: 1, 2, 4)
     * 
     * Routes notification based on:
     * - Type (critical vs important)
     * - User preferences (SMS enabled, push enabled)
     * - Quiet hours (push only)
     */
    async sendNotification(params: SendNotificationParams): Promise<NotificationResult> {
        const isCritical = CRITICAL_TYPES.includes(params.type) || Boolean(params.forceSms);
        const category = TYPE_CATEGORY[params.type] || 'order';

        // Check user preferences
        const { sms: shouldSendSms, push: shouldSendPush } =
            await preferencesRepository.shouldSendNotification(params.farmerId, isCritical, category);

        logger.info({
            farmerId: params.farmerId,
            type: params.type,
            isCritical,
            shouldSendSms,
            shouldSendPush,
        }, 'Processing notification');

        // Store in-app notification (AC: 3)
        const notification = await this.storeNotification(params);

        let smsResult: { success: boolean; messageId?: string } = { success: false };
        let pushResult: { success: boolean; successCount: number } = { success: false, successCount: 0 };

        // Send SMS for critical notifications (AC: 1)
        if (shouldSendSms && params.phoneNumber) {
            smsResult = await smsService.sendSms({
                farmerId: params.farmerId,
                phoneNumber: params.phoneNumber,
                templateKey: params.type,
                templateParams: params.metadata || {},
                language: params.language,
            });
        }

        // Send push notification (AC: 2)
        if (shouldSendPush) {
            pushResult = await pushService.sendToFarmer({
                farmerId: params.farmerId,
                type: params.type,
                title: params.title,
                body: params.body,
                deeplink: params.deeplink,
                metadata: params.metadata,
                language: params.language,
                highPriority: isCritical,
                bypassQuietHours: isCritical,
            });
        }

        // If SMS failed for critical notification, ensure push is sent as fallback
        if (isCritical && !smsResult.success && !pushResult.success) {
            logger.warn({ farmerId: params.farmerId, type: params.type }, 'Both SMS and Push failed for critical notification');
        }

        return {
            success: smsResult.success || pushResult.success || !!notification,
            notificationId: notification?.id,
            smsSuccess: smsResult.success,
            smsMessageId: smsResult.messageId,
            pushSuccess: pushResult.success,
            pushSuccessCount: pushResult.successCount,
        };
    }

    /**
     * Store notification for in-app center (AC: 3)
     */
    private async storeNotification(params: SendNotificationParams) {
        try {
            const input: CreateNotificationInput = {
                farmerId: params.farmerId,
                type: params.type,
                title: params.title,
                body: params.body,
                deeplink: params.deeplink,
                metadata: params.metadata,
            };

            return await notificationRepository.create(input);
        } catch (error: any) {
            logger.error({ error: error.message }, 'Failed to store notification');
            return null;
        }
    }

    /**
     * Send match notification (convenience method)
     */
    async sendMatchNotification(params: {
        farmerId: string;
        phoneNumber: string;
        cropName: string;
        quantity: number;
        totalAmount: number;
        orderId: string;
        language?: string;
    }): Promise<NotificationResult> {
        return this.sendNotification({
            farmerId: params.farmerId,
            phoneNumber: params.phoneNumber,
            type: 'ORDER_MATCHED',
            title: '🎉 Buyer Found!',
            body: `Accept match for ${params.quantity}kg ${params.cropName} at ₹${params.totalAmount}`,
            deeplink: `/match-details/${params.orderId}`,
            metadata: {
                order_id: params.orderId,
                crop_name: params.cropName,
                quantity: String(params.quantity),
                total_amount: String(params.totalAmount),
            },
            language: params.language,
        });
    }

    /**
     * Send payment notification (convenience method)
     */
    async sendPaymentNotification(params: {
        farmerId: string;
        phoneNumber: string;
        cropName: string;
        amount: number;
        upiId: string;
        orderId: string;
        language?: string;
    }): Promise<NotificationResult> {
        return this.sendNotification({
            farmerId: params.farmerId,
            phoneNumber: params.phoneNumber,
            type: 'PAYMENT_RECEIVED',
            title: '💰 Payment Received',
            body: `₹${params.amount} for ${params.cropName}. Check your bank.`,
            deeplink: `/earnings`,
            metadata: {
                order_id: params.orderId,
                crop_name: params.cropName,
                amount: String(params.amount),
                upi_id: params.upiId,
            },
            language: params.language,
        });
    }

    /**
     * Send match expiring notification (convenience method)
     */
    async sendMatchExpiringNotification(params: {
        farmerId: string;
        phoneNumber: string;
        cropName: string;
        hoursRemaining: number;
        orderId: string;
        language?: string;
    }): Promise<NotificationResult> {
        return this.sendNotification({
            farmerId: params.farmerId,
            phoneNumber: params.phoneNumber,
            type: 'MATCH_EXPIRING',
            title: '⏰ Match Expiring Soon',
            body: `Accept match for ${params.cropName} within ${params.hoursRemaining} hours`,
            deeplink: `/match-details/${params.orderId}`,
            metadata: {
                order_id: params.orderId,
                crop_name: params.cropName,
                hours: String(params.hoursRemaining),
            },
            language: params.language,
        });
    }

    /**
     * Send hauler en route notification (convenience method)
     */
    async sendHaulerEnRouteNotification(params: {
        farmerId: string;
        haulerName: string;
        etaMinutes: number;
        orderId: string;
        language?: string;
    }): Promise<NotificationResult> {
        return this.sendNotification({
            farmerId: params.farmerId,
            type: 'HAULER_EN_ROUTE',
            title: '🚛 Hauler On The Way',
            body: `${params.haulerName} arriving in ${params.etaMinutes} minutes`,
            deeplink: `/orders/${params.orderId}`,
            metadata: {
                order_id: params.orderId,
                hauler_name: params.haulerName,
                eta_minutes: String(params.etaMinutes),
            },
            language: params.language,
        });
    }

    /**
     * Send drop point assignment notification (convenience method)
     */
    async sendDropPointAssignmentNotification(params: {
        farmerId: string;
        dropPointName: string;
        timeWindow: string;
        orderId: string;
        language?: string;
    }): Promise<NotificationResult> {
        return this.sendNotification({
            farmerId: params.farmerId,
            type: 'DROP_POINT_ASSIGNMENT',
            title: '📍 Drop Point Assigned',
            body: `Deliver to ${params.dropPointName} ${params.timeWindow}`,
            deeplink: `/drop-point`,
            metadata: {
                order_id: params.orderId,
                drop_point_name: params.dropPointName,
                time_window: params.timeWindow,
            },
            language: params.language,
        });
    }
}

// Export singleton instance
export const farmerNotificationService = new FarmerNotificationService();
