import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

/**
 * Notification Service gRPC Handlers
 * Implements NotificationService proto methods
 */
export function notificationServiceHandlers(logger: Logger) {
    return {
        /**
         * Send SMS notification
         */
        async SendSMS(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;
            const notificationId = uuidv4();

            logger.info({
                method: 'SendSMS',
                phone: request.phone_number?.slice(0, 6) + '****', // Redact phone
                language: request.language,
                reference_id: request.reference_id,
            }, 'Sending SMS notification');

            try {
                // TODO: Integrate with Twilio/AWS SNS
                // For Phase 1, mock the SMS send
                const providerMessageId = `mock_sms_${uuidv4().slice(0, 8)}`;

                logger.info({
                    notification_id: notificationId,
                    provider_message_id: providerMessageId,
                }, 'SMS sent successfully (mock)');

                callback(null, {
                    notification_id: notificationId,
                    status: 2, // SENT
                    provider_message_id: providerMessageId,
                    error_message: '',
                });
            } catch (error: any) {
                logger.error({ error }, 'Failed to send SMS');
                callback(null, {
                    notification_id: notificationId,
                    status: 4, // FAILED
                    provider_message_id: '',
                    error_message: error.message,
                });
            }
        },

        /**
         * Send push notification
         */
        async SendPush(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;
            const notificationId = uuidv4();

            logger.info({
                method: 'SendPush',
                user_id: request.user_id,
                title: request.title,
                deep_link: request.deep_link,
            }, 'Sending push notification');

            try {
                // TODO: Integrate with Firebase Cloud Messaging
                // For Phase 1, mock the push send
                const providerMessageId = `mock_fcm_${uuidv4().slice(0, 8)}`;

                logger.info({
                    notification_id: notificationId,
                    provider_message_id: providerMessageId,
                }, 'Push notification sent successfully (mock)');

                callback(null, {
                    notification_id: notificationId,
                    status: 2, // SENT
                    provider_message_id: providerMessageId,
                    error_message: '',
                });
            } catch (error: any) {
                logger.error({ error }, 'Failed to send push notification');
                callback(null, {
                    notification_id: notificationId,
                    status: 4, // FAILED
                    provider_message_id: '',
                    error_message: error.message,
                });
            }
        },

        /**
         * Send templated notification (SMS + Push)
         */
        async SendTemplatedNotification(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'SendTemplatedNotification',
                user_id: request.user_id,
                template_type: request.template_type,
                language: request.language,
                channels: request.channels,
            }, 'Sending templated notification');

            const results: any[] = [];

            try {
                // Process each channel
                for (const channel of request.channels || []) {
                    const notificationId = uuidv4();

                    // TODO: Look up template by template_type and language
                    // TODO: Substitute template_vars into template
                    // TODO: Send via appropriate channel

                    results.push({
                        channel: channel,
                        notification_id: notificationId,
                        status: 2, // SENT (mock)
                        error_message: '',
                    });
                }

                callback(null, { results });
            } catch (error: any) {
                logger.error({ error }, 'Failed to send templated notification');
                callback({
                    code: 13, // INTERNAL
                    message: error.message,
                });
            }
        },

        /**
         * Get delivery status
         */
        async GetDeliveryStatus(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'GetDeliveryStatus',
                notification_id: request.notification_id,
            }, 'Getting delivery status');

            try {
                // TODO: Look up notification in database
                // For now, return mock delivered status

                callback(null, {
                    notification_id: request.notification_id,
                    channel: 1, // SMS
                    status: 3, // DELIVERED
                    sent_at: new Date().toISOString(),
                    delivered_at: new Date().toISOString(),
                    error_message: '',
                });
            } catch (error: any) {
                logger.error({ error }, 'Failed to get delivery status');
                callback({
                    code: 5, // NOT_FOUND
                    message: `Notification not found: ${request.notification_id}`,
                });
            }
        },

        /**
         * Send batch notifications
         */
        async SendBatchNotification(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;
            const items = request.items || [];

            logger.info({
                method: 'SendBatchNotification',
                batch_size: items.length,
            }, 'Sending batch notifications');

            const results: any[] = [];
            let successful = 0;
            let failed = 0;

            try {
                for (const item of items) {
                    const channelResults: any[] = [];

                    for (const channel of item.channels || []) {
                        const notificationId = uuidv4();

                        // Mock send for Phase 1
                        channelResults.push({
                            channel: channel,
                            notification_id: notificationId,
                            status: 2, // SENT
                            error_message: '',
                        });
                    }

                    results.push({
                        user_id: item.user_id,
                        channel_results: channelResults,
                    });
                    successful++;
                }

                callback(null, {
                    total: items.length,
                    successful,
                    failed,
                    results,
                });
            } catch (error: any) {
                logger.error({ error }, 'Failed to send batch notifications');
                callback({
                    code: 13, // INTERNAL
                    message: error.message,
                });
            }
        },
    };
}
