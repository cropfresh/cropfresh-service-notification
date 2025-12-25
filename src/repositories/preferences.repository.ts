/**
 * Preferences Repository - Story 3.8 (Task 2)
 * 
 * CRUD operations for farmer notification preferences.
 * Implements AC4: User-configurable notification preferences
 */

import { prisma } from '../lib/prisma';
import type { FarmerNotificationPreferences, NotificationLevel } from '../generated/prisma/client';

export interface PreferencesInput {
    farmerId: string;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursEnabled?: boolean;
    notificationLevel?: NotificationLevel;
    orderUpdates?: boolean;
    paymentAlerts?: boolean;
    educationalContent?: boolean;
}

export class PreferencesRepository {
    /**
     * Get preferences for a farmer, create defaults if not exists
     */
    async findByFarmerId(farmerId: string): Promise<FarmerNotificationPreferences> {
        let preferences = await prisma.farmerNotificationPreferences.findUnique({
            where: { farmerId },
        });

        if (!preferences) {
            // Create default preferences
            preferences = await prisma.farmerNotificationPreferences.create({
                data: {
                    farmerId,
                    smsEnabled: true,
                    pushEnabled: true,
                    quietHoursStart: '22:00',
                    quietHoursEnd: '06:00',
                    quietHoursEnabled: true,
                    notificationLevel: 'ALL',
                    orderUpdates: true,
                    paymentAlerts: true,
                    educationalContent: true,
                },
            });
        }

        return preferences;
    }

    /**
     * Update preferences for a farmer (upsert)
     */
    async update(input: PreferencesInput): Promise<FarmerNotificationPreferences> {
        return prisma.farmerNotificationPreferences.upsert({
            where: { farmerId: input.farmerId },
            update: {
                smsEnabled: input.smsEnabled,
                pushEnabled: input.pushEnabled,
                quietHoursStart: input.quietHoursStart,
                quietHoursEnd: input.quietHoursEnd,
                quietHoursEnabled: input.quietHoursEnabled,
                notificationLevel: input.notificationLevel,
                orderUpdates: input.orderUpdates,
                paymentAlerts: input.paymentAlerts,
                educationalContent: input.educationalContent,
            },
            create: {
                farmerId: input.farmerId,
                smsEnabled: input.smsEnabled ?? true,
                pushEnabled: input.pushEnabled ?? true,
                quietHoursStart: input.quietHoursStart ?? '22:00',
                quietHoursEnd: input.quietHoursEnd ?? '06:00',
                quietHoursEnabled: input.quietHoursEnabled ?? true,
                notificationLevel: input.notificationLevel ?? 'ALL',
                orderUpdates: input.orderUpdates ?? true,
                paymentAlerts: input.paymentAlerts ?? true,
                educationalContent: input.educationalContent ?? true,
            },
        });
    }

    /**
     * Check if current time is within quiet hours for a farmer
     */
    async isQuietHoursActive(farmerId: string): Promise<boolean> {
        const preferences = await this.findByFarmerId(farmerId);

        if (!preferences.quietHoursEnabled) {
            return false;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [startHours, startMins] = preferences.quietHoursStart.split(':').map(Number);
        const [endHours, endMins] = preferences.quietHoursEnd.split(':').map(Number);

        const startMinutes = startHours * 60 + startMins;
        const endMinutes = endHours * 60 + endMins;

        // Handle overnight quiet hours (e.g., 22:00 to 06:00)
        if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        } else {
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }
    }

    /**
     * Check if a notification type should be sent based on preferences
     */
    async shouldSendNotification(
        farmerId: string,
        isCritical: boolean,
        category: 'order' | 'payment' | 'educational'
    ): Promise<{ sms: boolean; push: boolean }> {
        const preferences = await this.findByFarmerId(farmerId);

        // Muted - no notifications
        if (preferences.notificationLevel === 'MUTE') {
            return { sms: false, push: false };
        }

        // Critical only mode - only critical notifications
        if (preferences.notificationLevel === 'CRITICAL' && !isCritical) {
            return { sms: false, push: false };
        }

        // Check category preferences
        let categoryAllowed = true;
        switch (category) {
            case 'order':
                categoryAllowed = preferences.orderUpdates;
                break;
            case 'payment':
                categoryAllowed = preferences.paymentAlerts;
                break;
            case 'educational':
                categoryAllowed = preferences.educationalContent;
                break;
        }

        if (!categoryAllowed && !isCritical) {
            return { sms: false, push: false };
        }

        // Check quiet hours for push
        const isQuietHours = await this.isQuietHoursActive(farmerId);

        return {
            sms: preferences.smsEnabled && isCritical, // SMS only for critical
            push: preferences.pushEnabled && (!isQuietHours || isCritical),
        };
    }
}

// Export singleton instance
export const preferencesRepository = new PreferencesRepository();
