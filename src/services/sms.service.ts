/**
 * SMS Service - Story 3.8 (Task 3)
 * 
 * SMS notification delivery with:
 * - Twilio integration (AC: 1)
 * - Retry logic with exponential backoff (AC: 6)
 * - Daily quota check (20 SMS/farmer)
 * - Multi-language templates (5 languages)
 * - Delivery status tracking
 * 
 * @module sms-service
 */

import { prisma } from '../lib/prisma';
import { TemplateType } from '../generated/prisma/client';
import type { SmsDeliveryLog, NotificationStatus } from '../generated/prisma/client';
import { logger } from '../utils/logger';
// import twilio from 'twilio';  // Uncomment when Twilio is set up

// ============================================================================
// Types
// ============================================================================

export enum SupportedLanguage {
    ENGLISH = 'en',
    KANNADA = 'kn',
    HINDI = 'hi',
    TAMIL = 'ta',
    TELUGU = 'te',
}

export interface SmsSendParams {
    farmerId: string;
    phoneNumber: string;
    templateKey: TemplateType;
    templateParams: Record<string, string>;
    language?: string;
}

export interface SmsSendResult {
    success: boolean;
    messageId?: string;
    logId?: string;
    error?: string;
}

// ============================================================================
// SMS Service Class
// ============================================================================

export class SmsService {
    private readonly maxRetries = 3;
    private readonly retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s (exponential backoff)
    private readonly dailyQuota = 20;

    // Twilio client (mock for now)
    // private twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // private twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

    /**
     * Send SMS with retry logic (AC: 1, 6)
     */
    async sendSms(params: SmsSendParams): Promise<SmsSendResult> {
        const language = this.parseLanguage(params.language);
        const message = this.buildMessage(params.templateKey, params.templateParams, language);

        // Check daily quota
        const quotaExceeded = await this.checkQuota(params.farmerId);
        if (quotaExceeded) {
            logger.warn({ farmerId: params.farmerId }, 'SMS daily quota exceeded');
            return { success: false, error: 'Daily SMS quota exceeded' };
        }

        // Create delivery log
        const log = await this.createDeliveryLog(params, message);

        // Send with retries
        let lastError: string | undefined;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const result = await this.sendViaTwilio(params.phoneNumber, message);

                // Update log with success
                await this.updateDeliveryLog(log.id, {
                    status: 'SENT',
                    messageId: result.messageId,
                    sentAt: new Date(),
                });

                logger.info({
                    farmerId: params.farmerId,
                    templateKey: params.templateKey,
                    attempt: attempt + 1,
                    messageId: result.messageId,
                }, 'SMS sent successfully');

                return {
                    success: true,
                    messageId: result.messageId,
                    logId: log.id,
                };
            } catch (error: any) {
                lastError = error.message;
                logger.warn({
                    farmerId: params.farmerId,
                    attempt: attempt + 1,
                    error: error.message,
                }, 'SMS send attempt failed');

                // Update retry count
                await this.updateDeliveryLog(log.id, {
                    retryCount: attempt + 1,
                    errorMessage: error.message,
                });

                // Wait before retry (unless last attempt)
                if (attempt < this.maxRetries - 1) {
                    await this.sleep(this.retryDelays[attempt]);
                }
            }
        }

        // All retries failed
        await this.updateDeliveryLog(log.id, {
            status: 'FAILED',
            errorMessage: lastError,
        });

        logger.error({
            farmerId: params.farmerId,
            error: lastError,
        }, 'SMS send failed after all retries');

        return { success: false, logId: log.id, error: lastError };
    }

    /**
     * Check if farmer has exceeded daily SMS quota
     */
    private async checkQuota(farmerId: string): Promise<boolean> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await prisma.smsDeliveryLog.count({
            where: {
                farmerId,
                createdAt: { gte: today },
                status: { in: ['SENT', 'DELIVERED'] },
            },
        });

        return count >= this.dailyQuota;
    }

    /**
     * Create SMS delivery log record
     */
    private async createDeliveryLog(params: SmsSendParams, message: string): Promise<SmsDeliveryLog> {
        return prisma.smsDeliveryLog.create({
            data: {
                farmerId: params.farmerId,
                phoneNumber: params.phoneNumber,
                templateKey: params.templateKey,
                status: 'PENDING',
                retryCount: 0,
            },
        });
    }

    /**
     * Update SMS delivery log
     */
    private async updateDeliveryLog(
        logId: string,
        data: Partial<{
            status: NotificationStatus;
            messageId: string;
            sentAt: Date;
            deliveredAt: Date;
            retryCount: number;
            errorMessage: string;
        }>
    ): Promise<void> {
        await prisma.smsDeliveryLog.update({
            where: { id: logId },
            data,
        });
    }

    /**
     * Send SMS via Twilio (mock implementation)
     */
    private async sendViaTwilio(phoneNumber: string, message: string): Promise<{ messageId: string }> {
        // TODO: Replace with actual Twilio implementation
        // const result = await this.twilioClient.messages.create({
        //   body: message,
        //   from: this.twilioFromNumber,
        //   to: phoneNumber,
        // });
        // return { messageId: result.sid };

        // Mock implementation
        await this.sleep(100); // Simulate network delay

        // Simulate 10% failure for testing retry logic
        if (Math.random() < 0.1) {
            throw new Error('Simulated network error');
        }

        const mockMessageId = `twilio-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        logger.debug({ phoneNumber: phoneNumber.slice(-4), msgLength: message.length }, 'SMS sent (mock)');

        return { messageId: mockMessageId };
    }

    /**
     * Build SMS message from template (AC: 5 languages)
     */
    private buildMessage(
        templateKey: TemplateType,
        params: Record<string, string>,
        language: SupportedLanguage
    ): string {
        const template = this.getTemplate(templateKey, language);

        // Replace placeholders like {{crop_name}} with actual values
        let message = template;
        for (const [key, value] of Object.entries(params)) {
            message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }

        return message;
    }

    /**
     * Get SMS template for a given type and language
     */
    private getTemplate(templateKey: TemplateType, language: SupportedLanguage): string {
        const templates: Partial<Record<TemplateType, Record<SupportedLanguage, string>>> = {
            [TemplateType.ORDER_MATCHED]: {
                [SupportedLanguage.ENGLISH]: 'CropFresh: Buyer found for {{crop_name}}! ₹{{total_amount}} total. Accept in app now.',
                [SupportedLanguage.KANNADA]: 'CropFresh: {{crop_name}}ಗೆ ಖರೀದಿದಾರ ಸಿಕ್ಕಿದ್ದಾರೆ! ₹{{total_amount}}. ಆ್ಯಪ್‌ನಲ್ಲಿ ಒಪ್ಪಿಕೊಳ್ಳಿ.',
                [SupportedLanguage.HINDI]: 'CropFresh: {{crop_name}} के लिए खरीदार मिला! ₹{{total_amount}}. अभी ऐप में स्वीकार करें।',
                [SupportedLanguage.TAMIL]: 'CropFresh: {{crop_name}} வாங்குபவர் கிடைத்தார்! ₹{{total_amount}}. இப்போது ஆப்பில் ஏற்கவும்.',
                [SupportedLanguage.TELUGU]: 'CropFresh: {{crop_name}}కు కొనుగోలుదారు దొరికాడు! ₹{{total_amount}}. యాప్‌లో అంగీకరించండి.',
            },
            [TemplateType.PAYMENT_RECEIVED]: {
                [SupportedLanguage.ENGLISH]: 'CropFresh: ₹{{amount}} received for {{crop_name}}. UPI Ref: {{upi_id}}. Check your bank.',
                [SupportedLanguage.KANNADA]: 'CropFresh: {{crop_name}}ಗೆ ₹{{amount}} ಬಂದಿದೆ. UPI: {{upi_id}}. ಬ್ಯಾಂಕ್ ಪರಿಶೀಲಿಸಿ.',
                [SupportedLanguage.HINDI]: 'CropFresh: {{crop_name}} के लिए ₹{{amount}} मिला। UPI: {{upi_id}}। बैंक देखें।',
                [SupportedLanguage.TAMIL]: 'CropFresh: {{crop_name}} க்கு ₹{{amount}} வந்தது. UPI: {{upi_id}}. வங்கி பாருங்கள்.',
                [SupportedLanguage.TELUGU]: 'CropFresh: {{crop_name}}కు ₹{{amount}} వచ్చింది. UPI: {{upi_id}}. బ్యాంక్ చూడండి.',
            },
            [TemplateType.MATCH_EXPIRING]: {
                [SupportedLanguage.ENGLISH]: 'CropFresh: URGENT! Match for {{crop_name}} expiring in {{hours}}hrs. Open app to accept.',
                [SupportedLanguage.KANNADA]: 'CropFresh: ತುರ್ತು! {{crop_name}} ಮ್ಯಾಚ್ {{hours}} ಗಂಟೆಯಲ್ಲಿ ಮುಕ್ತಾಯ. ಒಪ್ಪಿಕೊಳ್ಳಿ.',
                [SupportedLanguage.HINDI]: 'CropFresh: जरूरी! {{crop_name}} का मैच {{hours}} घंटे में खत्म। ऐप खोलें।',
                [SupportedLanguage.TAMIL]: 'CropFresh: அவசரம்! {{crop_name}} மேட்ச் {{hours}} மணியில் முடியும். ஆப் திறக்கவும்.',
                [SupportedLanguage.TELUGU]: 'CropFresh: అత్యవసరం! {{crop_name}} మ్యాచ్ {{hours}} గంటల్లో ముగుస్తుంది. యాప్ తెరవండి.',
            },
            [TemplateType.ORDER_CANCELLED]: {
                [SupportedLanguage.ENGLISH]: 'CropFresh: {{crop_name}} order cancelled. Reason: {{reason}}. Your crop is relisted.',
                [SupportedLanguage.KANNADA]: 'CropFresh: {{crop_name}} ಆರ್ಡರ್ ರದ್ದಾಗಿದೆ. ಕಾರಣ: {{reason}}. ಮತ್ತೆ ಪಟ್ಟಿ ಮಾಡಲಾಗಿದೆ.',
                [SupportedLanguage.HINDI]: 'CropFresh: {{crop_name}} ऑर्डर रद्द। कारण: {{reason}}। फिर से लिस्ट हुआ।',
                [SupportedLanguage.TAMIL]: 'CropFresh: {{crop_name}} ஆர்டர் ரத்து. காரணம்: {{reason}}. மீண்டும் பட்டியலிடப்பட்டது.',
                [SupportedLanguage.TELUGU]: 'CropFresh: {{crop_name}} ఆర్డర్ రద్దయింది. కారణం: {{reason}}. మళ్ళీ జాబితా చేయబడింది.',
            },
            [TemplateType.QUALITY_DISPUTE]: {
                [SupportedLanguage.ENGLISH]: 'CropFresh: Quality issue reported for {{crop_name}}. Open app to view details and respond.',
                [SupportedLanguage.KANNADA]: 'CropFresh: {{crop_name}}ಗೆ ಗುಣಮಟ್ಟದ ಸಮಸ್ಯೆ. ವಿವರಗಳನ್ನು ನೋಡಲು ಆ್ಯಪ್ ತೆರೆಯಿರಿ.',
                [SupportedLanguage.HINDI]: 'CropFresh: {{crop_name}} में गुणवत्ता समस्या। विवरण देखने के लिए ऐप खोलें।',
                [SupportedLanguage.TAMIL]: 'CropFresh: {{crop_name}} தரப் பிரச்சினை. விவரங்களைப் பார்க்க ஆப் திறக்கவும்.',
                [SupportedLanguage.TELUGU]: 'CropFresh: {{crop_name}} నాణ్యత సమస్య. వివరాలు చూడటానికి యాప్ తెరవండి.',
            },
        };

        // Get template or fallback to English
        return (
            templates[templateKey]?.[language] ||
            templates[templateKey]?.[SupportedLanguage.ENGLISH] ||
            `CropFresh: Notification for ${templateKey}`
        );
    }

    /**
     * Parse language code
     */
    private parseLanguage(lang?: string): SupportedLanguage {
        const map: Record<string, SupportedLanguage> = {
            en: SupportedLanguage.ENGLISH,
            kn: SupportedLanguage.KANNADA,
            hi: SupportedLanguage.HINDI,
            ta: SupportedLanguage.TAMIL,
            te: SupportedLanguage.TELUGU,
        };
        return map[lang?.toLowerCase() ?? 'en'] || SupportedLanguage.ENGLISH;
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get SMS delivery statistics for a farmer
     */
    async getDeliveryStats(farmerId: string): Promise<{
        today: number;
        todayDelivered: number;
        todayFailed: number;
        remaining: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [sent, delivered, failed] = await Promise.all([
            prisma.smsDeliveryLog.count({
                where: { farmerId, createdAt: { gte: today } },
            }),
            prisma.smsDeliveryLog.count({
                where: { farmerId, createdAt: { gte: today }, status: 'DELIVERED' },
            }),
            prisma.smsDeliveryLog.count({
                where: { farmerId, createdAt: { gte: today }, status: 'FAILED' },
            }),
        ]);

        return {
            today: sent,
            todayDelivered: delivered,
            todayFailed: failed,
            remaining: Math.max(0, this.dailyQuota - sent),
        };
    }
}

// Export singleton instance
export const smsService = new SmsService();
