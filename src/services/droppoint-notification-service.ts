/**
 * Drop Point Notification Service (Story 3.4 - Task 4.3-4.4)
 * 
 * SITUATION: Farmers need SMS/Push for drop point assignment and changes
 * TASK: Send notifications using templates in farmer's language
 * ACTION: Build message from template, send via SMS and push
 * RESULT: Farmers receive localized notifications about drop points
 * 
 * @module droppoint-notification-service
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import {
    buildAssignmentSMS,
    buildChangeSMS,
    parseLanguage,
    SupportedLanguage,
    TemplateVariables,
} from '../templates/droppoint-templates';

// ============================================================================
// Types
// ============================================================================

export interface DropPointNotificationInput {
    farmerId: number;
    phoneNumber: string;
    language: string;
    cropName: string;
    quantityKg: number;
    dropPointName: string;
    dropPointAddress: string;
    pickupDate: string;
    pickupTimeWindow: string;
    distanceKm?: number;
}

export interface DropPointChangeNotificationInput extends DropPointNotificationInput {
    oldDropPointName: string;
    changeReason: string;
}

export interface NotificationResult {
    notificationId: string;
    channel: 'SMS' | 'PUSH';
    status: 'SENT' | 'FAILED';
    errorMessage?: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class DropPointNotificationService {

    /**
     * Send SMS and push notification for new drop point assignment (AC4)
     */
    async sendAssignmentNotification(
        input: DropPointNotificationInput
    ): Promise<NotificationResult[]> {
        const results: NotificationResult[] = [];
        const language = parseLanguage(input.language);

        const variables: TemplateVariables = {
            crop_name: input.cropName,
            quantity_kg: input.quantityKg,
            drop_point_name: input.dropPointName,
            drop_point_address: input.dropPointAddress,
            pickup_date: input.pickupDate,
            pickup_time_window: input.pickupTimeWindow,
            distance_km: input.distanceKm,
        };

        // Build SMS message
        const smsMessage = buildAssignmentSMS(language, variables);

        logger.info({
            farmerId: input.farmerId,
            phone: input.phoneNumber.slice(0, 6) + '****',
            language,
            dropPoint: input.dropPointName,
        }, 'Sending drop point assignment notification');

        // Send SMS (mock in Phase 1)
        const smsResult = await this.sendSMS(input.phoneNumber, smsMessage);
        results.push(smsResult);

        // Send Push notification
        const pushResult = await this.sendPush(
            input.farmerId,
            'Drop Point Assigned',
            `Deliver to ${input.dropPointName} ${input.pickupDate} ${input.pickupTimeWindow}`,
            `/drop-point-assignment?farmerId=${input.farmerId}`
        );
        results.push(pushResult);

        return results;
    }

    /**
     * Send SMS and push notification for drop point change (AC6)
     */
    async sendChangeNotification(
        input: DropPointChangeNotificationInput
    ): Promise<NotificationResult[]> {
        const results: NotificationResult[] = [];
        const language = parseLanguage(input.language);

        const variables: TemplateVariables = {
            crop_name: input.cropName,
            quantity_kg: input.quantityKg,
            drop_point_name: input.dropPointName,
            drop_point_address: input.dropPointAddress,
            pickup_date: input.pickupDate,
            pickup_time_window: input.pickupTimeWindow,
            old_drop_point_name: input.oldDropPointName,
            change_reason: input.changeReason,
        };

        // Build SMS message
        const smsMessage = buildChangeSMS(language, variables);

        logger.info({
            farmerId: input.farmerId,
            phone: input.phoneNumber.slice(0, 6) + '****',
            language,
            oldDropPoint: input.oldDropPointName,
            newDropPoint: input.dropPointName,
            reason: input.changeReason,
        }, 'Sending drop point change notification');

        // Send SMS (mock in Phase 1)
        const smsResult = await this.sendSMS(input.phoneNumber, smsMessage);
        results.push(smsResult);

        // Send Push notification with higher priority
        const pushResult = await this.sendPush(
            input.farmerId,
            '⚠️ Drop Point Changed',
            `New location: ${input.dropPointName}. Reason: ${input.changeReason}`,
            `/drop-point-assignment?farmerId=${input.farmerId}&changed=true`
        );
        results.push(pushResult);

        return results;
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    /**
     * Send SMS message (mock implementation for Phase 1)
     */
    private async sendSMS(phoneNumber: string, message: string): Promise<NotificationResult> {
        const notificationId = uuidv4();

        try {
            // TODO: Phase 2 - Integrate with Twilio/AWS SNS
            // const twilioClient = new Twilio(ACCOUNT_SID, AUTH_TOKEN);
            // await twilioClient.messages.create({
            //     to: phoneNumber,
            //     from: TWILIO_PHONE,
            //     body: message,
            // });

            logger.info({
                notificationId,
                phoneRedacted: phoneNumber.slice(0, 6) + '****',
                messageLength: message.length,
            }, 'SMS sent (mock)');

            return {
                notificationId,
                channel: 'SMS',
                status: 'SENT',
            };
        } catch (error: any) {
            logger.error({ error, notificationId }, 'Failed to send SMS');
            return {
                notificationId,
                channel: 'SMS',
                status: 'FAILED',
                errorMessage: error.message,
            };
        }
    }

    /**
     * Send push notification (mock implementation for Phase 1)
     */
    private async sendPush(
        userId: number,
        title: string,
        body: string,
        deepLink: string
    ): Promise<NotificationResult> {
        const notificationId = uuidv4();

        try {
            // TODO: Phase 2 - Integrate with Firebase Cloud Messaging
            // const fcm = admin.messaging();
            // await fcm.sendToTopic(`user_${userId}`, {
            //     notification: { title, body },
            //     data: { deepLink },
            // });

            logger.info({
                notificationId,
                userId,
                title,
                deepLink,
            }, 'Push notification sent (mock)');

            return {
                notificationId,
                channel: 'PUSH',
                status: 'SENT',
            };
        } catch (error: any) {
            logger.error({ error, notificationId }, 'Failed to send push notification');
            return {
                notificationId,
                channel: 'PUSH',
                status: 'FAILED',
                errorMessage: error.message,
            };
        }
    }
}

// Export singleton instance
export const dropPointNotificationService = new DropPointNotificationService();
