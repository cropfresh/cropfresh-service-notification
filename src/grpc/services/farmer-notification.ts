/**
 * Farmer Notification gRPC Handlers - Story 3.8
 * 
 * Implements farmer-specific notification gRPC methods:
 * - SendFarmerNotification (smart routing)
 * - GetFarmerNotifications (paginated list)
 * - MarkNotificationRead / MarkAllNotificationsRead
 * - GetNotificationPreferences / UpdateNotificationPreferences
 * - RegisterDeviceToken / UnregisterDeviceToken
 */

import { Logger } from 'pino';
import { notificationRepository } from '../../repositories/notification.repository';
import { preferencesRepository } from '../../repositories/preferences.repository';
import { deviceTokenRepository } from '../../repositories/device-token.repository';
import { farmerNotificationService } from '../../services/farmer-notification.service';
import { TemplateType } from '../../generated/prisma/client';

export function farmerNotificationHandlers(logger: Logger) {
    return {
        /**
         * SendFarmerNotification - Smart routing (AC: 1, 2)
         * Routes to SMS for critical, Push for all based on preferences
         */
        async SendFarmerNotification(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'SendFarmerNotification',
                farmerId: request.farmer_id,
                type: request.type,
            }, 'Sending farmer notification');

            try {
                const result = await farmerNotificationService.sendNotification({
                    farmerId: request.farmer_id,
                    phoneNumber: request.phone_number,
                    type: request.type as TemplateType,
                    title: request.title,
                    body: request.body,
                    deeplink: request.deeplink,
                    metadata: request.metadata || {},
                    language: request.language,
                    forceSms: request.force_sms,
                });

                callback(null, {
                    success: result.success,
                    notification_id: result.notificationId,
                    sms_sent: result.smsSuccess,
                    sms_message_id: result.smsMessageId,
                    push_sent: result.pushSuccess,
                    push_success_count: result.pushSuccessCount,
                    error_message: result.error || '',
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to send farmer notification');
                callback(null, {
                    success: false,
                    error_message: error.message,
                });
            }
        },

        /**
         * GetFarmerNotifications - Paginated list (AC: 3)
         */
        async GetFarmerNotifications(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'GetFarmerNotifications',
                farmerId: request.farmer_id,
                page: request.page,
                limit: request.limit,
            }, 'Getting farmer notifications');

            try {
                const result = await notificationRepository.findByFarmerId({
                    farmerId: request.farmer_id,
                    page: request.page || 1,
                    limit: request.limit || 20,
                    unreadOnly: request.unread_only,
                    type: request.type,
                });

                const notifications = result.notifications.map(n => ({
                    id: n.id,
                    farmer_id: n.farmerId,
                    type: n.type,
                    title: n.title,
                    body: n.body,
                    deeplink: n.deeplink || '',
                    metadata: n.metadata || {},
                    is_read: n.isRead,
                    created_at: n.createdAt.toISOString(),
                }));

                callback(null, {
                    notifications,
                    unread_count: result.unreadCount,
                    total: result.total,
                    page: result.page,
                    has_more: result.hasMore,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to get farmer notifications');
                callback({
                    code: 13, // INTERNAL
                    message: error.message,
                });
            }
        },

        /**
         * GetUnreadCount - Badge count (AC: 3)
         */
        async GetUnreadCount(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            try {
                const count = await notificationRepository.getUnreadCount(request.farmer_id);
                callback(null, { count });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to get unread count');
                callback(null, { count: 0 });
            }
        },

        /**
         * MarkNotificationRead - Single notification (AC: 3)
         */
        async MarkNotificationRead(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'MarkNotificationRead',
                notificationId: request.notification_id,
                farmerId: request.farmer_id,
            }, 'Marking notification as read');

            try {
                const notification = await notificationRepository.markAsRead(
                    request.notification_id,
                    request.farmer_id
                );

                callback(null, {
                    success: !!notification,
                    notification_id: request.notification_id,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to mark notification as read');
                callback(null, { success: false });
            }
        },

        /**
         * MarkAllNotificationsRead - All notifications (AC: 3)
         */
        async MarkAllNotificationsRead(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'MarkAllNotificationsRead',
                farmerId: request.farmer_id,
            }, 'Marking all notifications as read');

            try {
                const count = await notificationRepository.markAllAsRead(request.farmer_id);
                callback(null, { success: true, updated_count: count });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to mark all notifications as read');
                callback(null, { success: false, updated_count: 0 });
            }
        },

        /**
         * DeleteNotification - Remove notification (AC: 3)
         */
        async DeleteNotification(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            try {
                const deleted = await notificationRepository.delete(
                    request.notification_id,
                    request.farmer_id
                );

                callback(null, { success: deleted });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to delete notification');
                callback(null, { success: false });
            }
        },

        /**
         * GetNotificationPreferences - Get user prefs (AC: 4)
         */
        async GetNotificationPreferences(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'GetNotificationPreferences',
                farmerId: request.farmer_id,
            }, 'Getting notification preferences');

            try {
                const prefs = await preferencesRepository.findByFarmerId(request.farmer_id);

                callback(null, {
                    farmer_id: prefs.farmerId,
                    sms_enabled: prefs.smsEnabled,
                    push_enabled: prefs.pushEnabled,
                    quiet_hours_start: prefs.quietHoursStart,
                    quiet_hours_end: prefs.quietHoursEnd,
                    quiet_hours_enabled: prefs.quietHoursEnabled,
                    notification_level: prefs.notificationLevel,
                    order_updates: prefs.orderUpdates,
                    payment_alerts: prefs.paymentAlerts,
                    educational_content: prefs.educationalContent,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to get preferences');
                callback({
                    code: 13,
                    message: error.message,
                });
            }
        },

        /**
         * UpdateNotificationPreferences - Update user prefs (AC: 4)
         */
        async UpdateNotificationPreferences(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'UpdateNotificationPreferences',
                farmerId: request.farmer_id,
            }, 'Updating notification preferences');

            try {
                const prefs = await preferencesRepository.update({
                    farmerId: request.farmer_id,
                    smsEnabled: request.sms_enabled,
                    pushEnabled: request.push_enabled,
                    quietHoursStart: request.quiet_hours_start,
                    quietHoursEnd: request.quiet_hours_end,
                    quietHoursEnabled: request.quiet_hours_enabled,
                    notificationLevel: request.notification_level,
                    orderUpdates: request.order_updates,
                    paymentAlerts: request.payment_alerts,
                    educationalContent: request.educational_content,
                });

                callback(null, {
                    success: true,
                    farmer_id: prefs.farmerId,
                    sms_enabled: prefs.smsEnabled,
                    push_enabled: prefs.pushEnabled,
                    quiet_hours_start: prefs.quietHoursStart,
                    quiet_hours_end: prefs.quietHoursEnd,
                    quiet_hours_enabled: prefs.quietHoursEnabled,
                    notification_level: prefs.notificationLevel,
                    order_updates: prefs.orderUpdates,
                    payment_alerts: prefs.paymentAlerts,
                    educational_content: prefs.educationalContent,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to update preferences');
                callback(null, { success: false });
            }
        },

        /**
         * RegisterDeviceToken - Store FCM token (AC: 7)
         */
        async RegisterDeviceToken(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'RegisterDeviceToken',
                farmerId: request.farmer_id,
                deviceType: request.device_type,
            }, 'Registering device token');

            try {
                const token = await deviceTokenRepository.upsert({
                    farmerId: request.farmer_id,
                    fcmToken: request.fcm_token,
                    deviceType: request.device_type,
                });

                callback(null, {
                    success: true,
                    token_id: token.id,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to register device token');
                callback(null, { success: false });
            }
        },

        /**
         * UnregisterDeviceToken - Remove FCM token (AC: 7)
         */
        async UnregisterDeviceToken(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'UnregisterDeviceToken',
                farmerId: request.farmer_id,
            }, 'Unregistering device token');

            try {
                await deviceTokenRepository.deactivate(request.farmer_id, request.fcm_token);
                callback(null, { success: true });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to unregister device token');
                callback(null, { success: false });
            }
        },
        /**
         * DispatchEvent - Handle business events (AC: 1-2, Task 7)
         * Routes order, payment, logistics events to notification handlers
         */
        async DispatchEvent(
            call: any,
            callback: (error: any, response?: any) => void
        ) {
            const request = call.request;

            logger.info({
                method: 'DispatchEvent',
                eventType: request.event_type,
                eventId: request.event_id,
            }, 'Dispatching event');

            try {
                const { dispatchEvent } = await import('../../services/event-handlers');
                const success = await dispatchEvent(request.event_type, request.payload);

                callback(null, {
                    success,
                    event_id: request.event_id,
                });
            } catch (error: any) {
                logger.error({ error: error.message }, 'Failed to dispatch event');
                callback(null, { success: false, error_message: error.message });
            }
        },
    };
}
