/**
 * Notification Repository - Story 3.8 (Task 2)
 * 
 * CRUD operations for farmer notifications table.
 * Implements AC3: In-app notification center
 */

import { prisma } from '../lib/prisma';
import type { FarmerNotification, TemplateType } from '../generated/prisma/client';

export interface CreateNotificationInput {
    farmerId: string;
    type: TemplateType;
    title: string;
    body: string;
    deeplink?: string;
    metadata?: Record<string, unknown>;
}

export interface NotificationFilter {
    farmerId: string;
    unreadOnly?: boolean;
    type?: TemplateType;
    page?: number;
    limit?: number;
}

export interface PaginatedNotifications {
    notifications: FarmerNotification[];
    unreadCount: number;
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

export class NotificationRepository {
    /**
     * Create a new notification record
     */
    async create(input: CreateNotificationInput): Promise<FarmerNotification> {
        return prisma.farmerNotification.create({
            data: {
                farmerId: input.farmerId,
                type: input.type,
                title: input.title,
                body: input.body,
                deeplink: input.deeplink,
                metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
                isRead: false,
            },
        });
    }

    /**
     * Get paginated notifications for a farmer (AC3)
     */
    async findByFarmerId(filter: NotificationFilter): Promise<PaginatedNotifications> {
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {
            farmerId: filter.farmerId,
        };

        if (filter.unreadOnly) {
            where.isRead = false;
        }

        if (filter.type) {
            where.type = filter.type;
        }

        // Execute count and find in parallel
        const [notifications, total, unreadCount] = await Promise.all([
            prisma.farmerNotification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.farmerNotification.count({ where }),
            prisma.farmerNotification.count({
                where: {
                    farmerId: filter.farmerId,
                    isRead: false,
                },
            }),
        ]);

        return {
            notifications,
            unreadCount,
            page,
            limit,
            total,
            hasMore: skip + notifications.length < total,
        };
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(farmerId: string): Promise<number> {
        return prisma.farmerNotification.count({
            where: {
                farmerId,
                isRead: false,
            },
        });
    }

    /**
     * Find notification by ID
     */
    async findById(id: string): Promise<FarmerNotification | null> {
        return prisma.farmerNotification.findUnique({
            where: { id },
        });
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(id: string, farmerId: string): Promise<boolean> {
        const result = await prisma.farmerNotification.updateMany({
            where: {
                id,
                farmerId,
            },
            data: {
                isRead: true,
            },
        });
        return result.count > 0;
    }

    /**
     * Mark all notifications as read for a farmer
     */
    async markAllAsRead(farmerId: string): Promise<number> {
        const result = await prisma.farmerNotification.updateMany({
            where: {
                farmerId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
        return result.count;
    }

    /**
     * Delete a notification
     */
    async delete(id: string, farmerId: string): Promise<boolean> {
        const result = await prisma.farmerNotification.deleteMany({
            where: {
                id,
                farmerId,
            },
        });
        return result.count > 0;
    }

    /**
     * Delete old notifications (cleanup job)
     */
    async deleteOlderThan(days: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await prisma.farmerNotification.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
                isRead: true,
            },
        });
        return result.count;
    }
}

// Export singleton instance
export const notificationRepository = new NotificationRepository();
