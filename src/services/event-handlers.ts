/**
 * Event Handlers - Story 3.8 (Task 7)
 * 
 * Subscribes to business events and dispatches notifications:
 * - Order events: matched, delivered, cancelled (AC: 1)
 * - Payment events: payment received (AC: 1)
 * - Logistics events: hauler pickup, in transit (AC: 2)
 * 
 * Implements idempotency to prevent duplicate notifications.
 * 
 * @module event-handlers
 */

import { prisma } from '../lib/prisma';
import { farmerNotificationService } from './farmer-notification.service';
import { logger } from '../utils/logger';
import { TemplateType } from '../generated/prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface OrderMatchedEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    phoneNumber: string;
    cropName: string;
    quantity: number;
    pricePerKg: number;
    totalAmount: number;
    buyerName?: string;
    expiresAt: Date;
    language?: string;
}

export interface PaymentReceivedEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    phoneNumber: string;
    cropName: string;
    amount: number;
    upiId: string;
    transactionId: string;
    language?: string;
}

export interface OrderDeliveredEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    cropName: string;
    quantity: number;
    dropPointName: string;
    language?: string;
}

export interface OrderCancelledEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    phoneNumber: string;
    cropName: string;
    reason: string;
    language?: string;
}

export interface MatchExpiringEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    phoneNumber: string;
    cropName: string;
    hoursRemaining: number;
    language?: string;
}

export interface HaulerEnRouteEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    haulerName: string;
    haulerPhone?: string;
    etaMinutes: number;
    language?: string;
}

export interface PickupCompleteEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    cropName: string;
    quantity: number;
    dropPointName: string;
    language?: string;
}

export interface DropPointAssignedEvent {
    eventId: string;
    orderId: string;
    farmerId: string;
    dropPointName: string;
    dropPointAddress: string;
    timeWindowStart: string;
    timeWindowEnd: string;
    language?: string;
}

// ============================================================================
// Processed Events Cache (Idempotency)
// ============================================================================

// In-memory cache for recently processed events (for quick checks)
// For production, use Redis or database table
const processedEvents = new Set<string>();
const MAX_CACHE_SIZE = 10000;

async function isEventProcessed(eventId: string): Promise<boolean> {
    // Check in-memory cache first
    if (processedEvents.has(eventId)) {
        return true;
    }

    // Check database for persistence
    try {
        const existing = await prisma.farmerNotification.findFirst({
            where: {
                metadata: {
                    path: ['event_id'],
                    equals: eventId,
                },
            },
            select: { id: true },
        });
        return existing !== null;
    } catch {
        // If query fails, assume not processed
        return false;
    }
}

function markEventProcessed(eventId: string): void {
    // Add to cache
    processedEvents.add(eventId);

    // Cleanup if cache gets too large
    if (processedEvents.size > MAX_CACHE_SIZE) {
        const entries = Array.from(processedEvents);
        const toRemove = entries.slice(0, 1000);
        toRemove.forEach(e => processedEvents.delete(e));
    }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle order matched event (AC: 1 - Critical, SMS + Push)
 */
export async function handleOrderMatched(event: OrderMatchedEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    // Idempotency check
    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Order matched event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing order matched event');

    try {
        const result = await farmerNotificationService.sendMatchNotification({
            farmerId: event.farmerId,
            phoneNumber: event.phoneNumber,
            cropName: event.cropName,
            quantity: event.quantity,
            totalAmount: event.totalAmount,
            orderId: event.orderId,
            language: event.language,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Order matched notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send order matched notification');
        return false;
    }
}

/**
 * Handle payment received event (AC: 1 - Critical, SMS + Push)
 */
export async function handlePaymentReceived(event: PaymentReceivedEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Payment received event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing payment received event');

    try {
        const result = await farmerNotificationService.sendPaymentNotification({
            farmerId: event.farmerId,
            phoneNumber: event.phoneNumber,
            cropName: event.cropName,
            amount: event.amount,
            upiId: event.upiId,
            orderId: event.orderId,
            language: event.language,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Payment notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send payment notification');
        return false;
    }
}

/**
 * Handle match expiring event (AC: 1 - Critical, SMS + Push)
 */
export async function handleMatchExpiring(event: MatchExpiringEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Match expiring event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing match expiring event');

    try {
        const result = await farmerNotificationService.sendMatchExpiringNotification({
            farmerId: event.farmerId,
            phoneNumber: event.phoneNumber,
            cropName: event.cropName,
            hoursRemaining: event.hoursRemaining,
            orderId: event.orderId,
            language: event.language,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Match expiring notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send match expiring notification');
        return false;
    }
}

/**
 * Handle order cancelled event (AC: 1 - Critical, SMS + Push)
 */
export async function handleOrderCancelled(event: OrderCancelledEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Order cancelled event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing order cancelled event');

    try {
        const result = await farmerNotificationService.sendNotification({
            farmerId: event.farmerId,
            phoneNumber: event.phoneNumber,
            type: 'ORDER_CANCELLED' as TemplateType,
            title: '❌ Order Cancelled',
            body: `Your ${event.cropName} order was cancelled. Reason: ${event.reason}`,
            deeplink: `/orders/${event.orderId}`,
            metadata: {
                event_id: event.eventId,
                order_id: event.orderId,
                crop_name: event.cropName,
                reason: event.reason,
            },
            language: event.language,
            forceSms: true,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Order cancelled notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send order cancelled notification');
        return false;
    }
}

/**
 * Handle hauler en route event (AC: 2 - Important, Push only)
 */
export async function handleHaulerEnRoute(event: HaulerEnRouteEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Hauler en route event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing hauler en route event');

    try {
        const result = await farmerNotificationService.sendHaulerEnRouteNotification({
            farmerId: event.farmerId,
            haulerName: event.haulerName,
            etaMinutes: event.etaMinutes,
            orderId: event.orderId,
            language: event.language,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Hauler en route notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send hauler en route notification');
        return false;
    }
}

/**
 * Handle pickup complete event (AC: 2 - Important, Push only)
 */
export async function handlePickupComplete(event: PickupCompleteEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Pickup complete event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing pickup complete event');

    try {
        const result = await farmerNotificationService.sendNotification({
            farmerId: event.farmerId,
            type: 'PICKUP_COMPLETE' as TemplateType,
            title: '📦 Pickup Complete',
            body: `${event.quantity}kg ${event.cropName} collected from ${event.dropPointName}`,
            deeplink: `/orders/${event.orderId}`,
            metadata: {
                event_id: event.eventId,
                order_id: event.orderId,
                crop_name: event.cropName,
                quantity: String(event.quantity),
                drop_point_name: event.dropPointName,
            },
            language: event.language,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Pickup complete notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send pickup complete notification');
        return false;
    }
}

/**
 * Handle order delivered event (AC: 2 - Important, Push only)
 */
export async function handleOrderDelivered(event: OrderDeliveredEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Order delivered event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing order delivered event');

    try {
        const result = await farmerNotificationService.sendNotification({
            farmerId: event.farmerId,
            type: 'DELIVERED' as TemplateType,
            title: '✅ Delivered Successfully',
            body: `Your ${event.quantity}kg ${event.cropName} has been delivered to the buyer!`,
            deeplink: `/orders/${event.orderId}`,
            metadata: {
                event_id: event.eventId,
                order_id: event.orderId,
                crop_name: event.cropName,
                quantity: String(event.quantity),
            },
            language: event.language,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Order delivered notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send order delivered notification');
        return false;
    }
}

/**
 * Handle drop point assigned event (AC: 2 - Important, Push only)
 */
export async function handleDropPointAssigned(event: DropPointAssignedEvent): Promise<boolean> {
    const logContext = { eventId: event.eventId, orderId: event.orderId, farmerId: event.farmerId };

    if (await isEventProcessed(event.eventId)) {
        logger.info(logContext, 'Drop point assigned event already processed, skipping');
        return false;
    }

    logger.info(logContext, 'Processing drop point assigned event');

    try {
        const timeWindow = `${event.timeWindowStart} - ${event.timeWindowEnd}`;
        const result = await farmerNotificationService.sendDropPointAssignmentNotification({
            farmerId: event.farmerId,
            dropPointName: event.dropPointName,
            timeWindow: timeWindow,
            orderId: event.orderId,
            language: event.language,
        });

        markEventProcessed(event.eventId);
        logger.info({ ...logContext, success: result.success }, 'Drop point assigned notification sent');
        return result.success;
    } catch (error: any) {
        logger.error({ ...logContext, error: error.message }, 'Failed to send drop point assigned notification');
        return false;
    }
}

// ============================================================================
// Event Dispatcher (for gRPC/HTTP endpoints)
// ============================================================================

export type EventType =
    | 'ORDER_MATCHED'
    | 'PAYMENT_RECEIVED'
    | 'MATCH_EXPIRING'
    | 'ORDER_CANCELLED'
    | 'HAULER_EN_ROUTE'
    | 'PICKUP_COMPLETE'
    | 'ORDER_DELIVERED'
    | 'DROP_POINT_ASSIGNED';

/**
 * Dispatch event to appropriate handler
 */
export async function dispatchEvent(eventType: EventType, payload: unknown): Promise<boolean> {
    switch (eventType) {
        case 'ORDER_MATCHED':
            return handleOrderMatched(payload as OrderMatchedEvent);
        case 'PAYMENT_RECEIVED':
            return handlePaymentReceived(payload as PaymentReceivedEvent);
        case 'MATCH_EXPIRING':
            return handleMatchExpiring(payload as MatchExpiringEvent);
        case 'ORDER_CANCELLED':
            return handleOrderCancelled(payload as OrderCancelledEvent);
        case 'HAULER_EN_ROUTE':
            return handleHaulerEnRoute(payload as HaulerEnRouteEvent);
        case 'PICKUP_COMPLETE':
            return handlePickupComplete(payload as PickupCompleteEvent);
        case 'ORDER_DELIVERED':
            return handleOrderDelivered(payload as OrderDeliveredEvent);
        case 'DROP_POINT_ASSIGNED':
            return handleDropPointAssigned(payload as DropPointAssignedEvent);
        default:
            logger.warn({ eventType }, 'Unknown event type');
            return false;
    }
}

// Export for testing
export const _testUtils = {
    clearProcessedEvents: () => processedEvents.clear(),
    getProcessedEventsCount: () => processedEvents.size,
};
