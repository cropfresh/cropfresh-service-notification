/**
 * SMS Templates for Match Notifications (Story 3.5 - AC1, AC7)
 * 
 * SITUATION: Farmers need SMS/push notifications for buyer matches
 * TASK: Define templates in multiple regional languages
 * ACTION: Create template registry with Kannada, Hindi, Tamil, Telugu, English
 * RESULT: Localized notifications for match communication
 * 
 * @module match-templates
 */

// ============================================================================
// Template Types
// ============================================================================

export enum MatchTemplateType {
    MATCH_FOUND = 'MATCH_FOUND',
    MATCH_ACCEPTED = 'MATCH_ACCEPTED',
    MATCH_EXPIRY_REMINDER = 'MATCH_EXPIRY_REMINDER',
    MATCH_EXPIRED = 'MATCH_EXPIRED',
}

export enum SupportedLanguage {
    ENGLISH = 'en',
    KANNADA = 'kn',
    HINDI = 'hi',
    TAMIL = 'ta',
    TELUGU = 'te',
}

export interface MatchTemplateVariables {
    farmer_name?: string;
    crop_name: string;
    quantity_kg: number;
    price_per_kg: number;
    total_amount: number;
    buyer_type: string;       // e.g., "Restaurant", "Retailer"
    buyer_location: string;   // e.g., "Koramangala, Bangalore"
    expiry_time?: string;     // e.g., "2 hours"
    delivery_date?: string;
    order_id?: string;
}

// ============================================================================
// Match Found Templates (AC1)
// ============================================================================

const MATCH_FOUND_TEMPLATES: Record<SupportedLanguage, string> = {
    [SupportedLanguage.ENGLISH]: `🎉 New Buyer Match!

Your {{quantity_kg}}kg {{crop_name}} has a buyer!
Buyer: {{buyer_type}} in {{buyer_location}}
Price: ₹{{price_per_kg}}/kg (Total: ₹{{total_amount}})

⏰ Respond within {{expiry_time}} or it expires.
Open app to Accept/Reject. -CropFresh`,

    [SupportedLanguage.KANNADA]: `🎉 ಹೊಸ ಖರೀದಿದಾರ ಹೊಂದಾಣಿಕೆ!

ನಿಮ್ಮ {{quantity_kg}}kg {{crop_name}} ಗೆ ಖರೀದಿದಾರ ಇದ್ದಾರೆ!
ಖರೀದಿದಾರ: {{buyer_location}} ನಲ್ಲಿ {{buyer_type}}
ಬೆಲೆ: ₹{{price_per_kg}}/kg (ಒಟ್ಟು: ₹{{total_amount}})

⏰ {{expiry_time}} ಒಳಗೆ ಪ್ರತಿಕ್ರಿಯಿಸಿ.
ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯಿರಿ. -CropFresh`,

    [SupportedLanguage.HINDI]: `🎉 नया खरीदार मिला!

आपके {{quantity_kg}}kg {{crop_name}} का खरीदार मिला!
खरीदार: {{buyer_location}} में {{buyer_type}}
कीमत: ₹{{price_per_kg}}/kg (कुल: ₹{{total_amount}})

⏰ {{expiry_time}} में जवाब दें।
ऐप खोलकर स्वीकार/अस्वीकार करें। -CropFresh`,

    [SupportedLanguage.TAMIL]: `🎉 புதிய வாங்குபவர் கிடைத்தது!

உங்கள் {{quantity_kg}}kg {{crop_name}} க்கு வாங்குபவர் உள்ளார்!
வாங்குபவர்: {{buyer_location}} இல் {{buyer_type}}
விலை: ₹{{price_per_kg}}/kg (மொத்தம்: ₹{{total_amount}})

⏰ {{expiry_time}} க்குள் பதிலளிக்கவும்.
ஆப்பைத் திறக்கவும். -CropFresh`,

    [SupportedLanguage.TELUGU]: `🎉 కొత్త కొనుగోలుదారు దొరికారు!

మీ {{quantity_kg}}kg {{crop_name}} కి కొనుగోలుదారు ఉన్నారు!
కొనుగోలుదారు: {{buyer_location}} లో {{buyer_type}}
ధర: ₹{{price_per_kg}}/kg (మొత్తం: ₹{{total_amount}})

⏰ {{expiry_time}} లోపు స్పందించండి.
యాప్ తెరవండి. -CropFresh`,
};

// ============================================================================
// Match Accepted Templates (AC3)
// ============================================================================

const MATCH_ACCEPTED_TEMPLATES: Record<SupportedLanguage, string> = {
    [SupportedLanguage.ENGLISH]: `✅ Match Accepted!

Order #{{order_id}} confirmed.
{{quantity_kg}}kg {{crop_name}} @ ₹{{price_per_kg}}/kg
Total: ₹{{total_amount}}

Delivery: {{delivery_date}}
Prepare your produce! -CropFresh`,

    [SupportedLanguage.KANNADA]: `✅ ಹೊಂದಾಣಿಕೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!

ಆರ್ಡರ್ #{{order_id}} ದೃಢಪಡಿಸಲಾಗಿದೆ.
{{quantity_kg}}kg {{crop_name}} @ ₹{{price_per_kg}}/kg
ಒಟ್ಟು: ₹{{total_amount}}

ವಿತರಣೆ: {{delivery_date}}
ನಿಮ್ಮ ಉತ್ಪನ್ನವನ್ನು ಸಿದ್ಧಪಡಿಸಿ! -CropFresh`,

    [SupportedLanguage.HINDI]: `✅ मैच स्वीकृत!

ऑर्डर #{{order_id}} पुष्टि हुई।
{{quantity_kg}}kg {{crop_name}} @ ₹{{price_per_kg}}/kg
कुल: ₹{{total_amount}}

डिलीवरी: {{delivery_date}}
अपनी उपज तैयार करें! -CropFresh`,

    [SupportedLanguage.TAMIL]: `✅ பொருத்தம் ஏற்றுக்கொள்ளப்பட்டது!

ஆர்டர் #{{order_id}} உறுதிப்படுத்தப்பட்டது.
{{quantity_kg}}kg {{crop_name}} @ ₹{{price_per_kg}}/kg
மொத்தம்: ₹{{total_amount}}

டெலிவரி: {{delivery_date}}
உங்கள் விளைபொருளை தயார் செய்யுங்கள்! -CropFresh`,

    [SupportedLanguage.TELUGU]: `✅ మ్యాచ్ ఆమోదించబడింది!

ఆర్డర్ #{{order_id}} నిర్ధారించబడింది.
{{quantity_kg}}kg {{crop_name}} @ ₹{{price_per_kg}}/kg
మొత్తం: ₹{{total_amount}}

డెలివరీ: {{delivery_date}}
మీ ఉత్పత్తిని సిద్ధం చేయండి! -CropFresh`,
};

// ============================================================================
// Match Expiry Reminder Templates (AC7)
// ============================================================================

const MATCH_EXPIRY_REMINDER_TEMPLATES: Record<SupportedLanguage, string> = {
    [SupportedLanguage.ENGLISH]: `⏰ Match Expiring Soon!

Your {{crop_name}} match expires in {{expiry_time}}!
₹{{total_amount}} waiting for you.

Open app now to accept. -CropFresh`,

    [SupportedLanguage.KANNADA]: `⏰ ಹೊಂದಾಣಿಕೆ ಶೀಘ್ರದಲ್ಲೇ ಮುಗಿಯುತ್ತದೆ!

ನಿಮ್ಮ {{crop_name}} ಹೊಂದಾಣಿಕೆ {{expiry_time}} ನಲ್ಲಿ ಮುಗಿಯುತ್ತದೆ!
₹{{total_amount}} ನಿಮಗಾಗಿ ಕಾಯುತ್ತಿದೆ.

ಈಗ ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯಿರಿ. -CropFresh`,

    [SupportedLanguage.HINDI]: `⏰ मैच जल्द समाप्त होगा!

आपका {{crop_name}} मैच {{expiry_time}} में समाप्त होगा!
₹{{total_amount}} आपका इंतजार कर रहा है।

अभी ऐप खोलें। -CropFresh`,

    [SupportedLanguage.TAMIL]: `⏰ பொருத்தம் விரைவில் முடிவடையும்!

உங்கள் {{crop_name}} பொருத்தம் {{expiry_time}} இல் முடிவடையும்!
₹{{total_amount}} உங்களுக்காக காத்திருக்கிறது.

இப்போது ஆப் திறக்கவும். -CropFresh`,

    [SupportedLanguage.TELUGU]: `⏰ మ్యాచ్ త్వరలో ముగుస్తుంది!

మీ {{crop_name}} మ్యాచ్ {{expiry_time}} లో ముగుస్తుంది!
₹{{total_amount}} మీ కోసం వేచి ఉంది.

ఇప్పుడు యాప్ తెరవండి. -CropFresh`,
};

// ============================================================================
// Template Functions
// ============================================================================

/**
 * Get SMS template for a given type and language
 */
export function getMatchTemplate(
    type: MatchTemplateType,
    language: SupportedLanguage = SupportedLanguage.ENGLISH
): string {
    const templates: Record<MatchTemplateType, Record<SupportedLanguage, string>> = {
        [MatchTemplateType.MATCH_FOUND]: MATCH_FOUND_TEMPLATES,
        [MatchTemplateType.MATCH_ACCEPTED]: MATCH_ACCEPTED_TEMPLATES,
        [MatchTemplateType.MATCH_EXPIRY_REMINDER]: MATCH_EXPIRY_REMINDER_TEMPLATES,
        [MatchTemplateType.MATCH_EXPIRED]: MATCH_EXPIRY_REMINDER_TEMPLATES, // Reuse
    };

    const templateSet = templates[type];
    if (!templateSet) {
        throw new Error(`Unknown template type: ${type}`);
    }

    return templateSet[language] || templateSet[SupportedLanguage.ENGLISH];
}

/**
 * Substitute variables into a template
 */
export function substituteMatchVariables(template: string, variables: MatchTemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
    }

    return result;
}

/**
 * Build complete SMS for match found (AC1)
 */
export function buildMatchFoundSMS(
    language: SupportedLanguage,
    variables: MatchTemplateVariables
): string {
    const template = getMatchTemplate(MatchTemplateType.MATCH_FOUND, language);
    return substituteMatchVariables(template, variables);
}

/**
 * Build complete SMS for match accepted (AC3)
 */
export function buildMatchAcceptedSMS(
    language: SupportedLanguage,
    variables: MatchTemplateVariables
): string {
    const template = getMatchTemplate(MatchTemplateType.MATCH_ACCEPTED, language);
    return substituteMatchVariables(template, variables);
}

/**
 * Build complete SMS for match expiry reminder (AC7)
 */
export function buildMatchExpirySMS(
    language: SupportedLanguage,
    variables: MatchTemplateVariables
): string {
    const template = getMatchTemplate(MatchTemplateType.MATCH_EXPIRY_REMINDER, language);
    return substituteMatchVariables(template, variables);
}

/**
 * Detect language from ISO code string
 */
export function parseLanguage(code: string): SupportedLanguage {
    const normalized = code.toLowerCase().slice(0, 2);
    switch (normalized) {
        case 'kn':
        case 'ka':
            return SupportedLanguage.KANNADA;
        case 'hi':
            return SupportedLanguage.HINDI;
        case 'ta':
            return SupportedLanguage.TAMIL;
        case 'te':
            return SupportedLanguage.TELUGU;
        default:
            return SupportedLanguage.ENGLISH;
    }
}
