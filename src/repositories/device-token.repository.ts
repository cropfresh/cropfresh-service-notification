/**
 * Device Token Repository - Story 3.8 (Task 2)
 * 
 * CRUD operations for device FCM tokens.
 * Implements AC7: Push notification handling
 */

import { prisma } from '../lib/prisma';
import type { DeviceToken } from '../generated/prisma/client';

export interface DeviceTokenInput {
    farmerId: string;
    fcmToken: string;
    deviceType?: string;
}

export class DeviceTokenRepository {
    /**
     * Register or update a device token
     */
    async upsert(input: DeviceTokenInput): Promise<DeviceToken> {
        return prisma.deviceToken.upsert({
            where: {
                farmerId_fcmToken: {
                    farmerId: input.farmerId,
                    fcmToken: input.fcmToken,
                },
            },
            update: {
                isActive: true,
                deviceType: input.deviceType,
            },
            create: {
                farmerId: input.farmerId,
                fcmToken: input.fcmToken,
                deviceType: input.deviceType,
                isActive: true,
            },
        });
    }

    /**
     * Get all active tokens for a farmer
     */
    async findActiveByFarmerId(farmerId: string): Promise<DeviceToken[]> {
        return prisma.deviceToken.findMany({
            where: {
                farmerId,
                isActive: true,
            },
        });
    }

    /**
     * Deactivate a specific token
     */
    async deactivate(farmerId: string, fcmToken: string): Promise<boolean> {
        const result = await prisma.deviceToken.updateMany({
            where: {
                farmerId,
                fcmToken,
            },
            data: {
                isActive: false,
            },
        });
        return result.count > 0;
    }

    /**
     * Deactivate all tokens for a farmer (logout all devices)
     */
    async deactivateAll(farmerId: string): Promise<number> {
        const result = await prisma.deviceToken.updateMany({
            where: {
                farmerId,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });
        return result.count;
    }

    /**
     * Mark token as invalid (e.g., FCM returned invalid token error)
     */
    async markInvalid(fcmToken: string): Promise<boolean> {
        const result = await prisma.deviceToken.updateMany({
            where: {
                fcmToken,
            },
            data: {
                isActive: false,
            },
        });
        return result.count > 0;
    }

    /**
     * Delete old inactive tokens (cleanup job)
     */
    async deleteInactiveOlderThan(days: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await prisma.deviceToken.deleteMany({
            where: {
                isActive: false,
                updatedAt: {
                    lt: cutoffDate,
                },
            },
        });
        return result.count;
    }
}

// Export singleton instance
export const deviceTokenRepository = new DeviceTokenRepository();
