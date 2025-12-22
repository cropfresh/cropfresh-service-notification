/**
 * SMS Templates for Drop Point Notifications (Story 3.4 - Task 4.1-4.2)
 * 
 * SITUATION: Farmers need SMS confirmation for drop point assignment
 * TASK: Define templates in multiple regional languages
 * ACTION: Create template registry with Kannada, Hindi, Tamil, Telugu, English
 * RESULT: Localized SMS for farmer communication
 * 
 * @module droppoint-templates
 */

// ============================================================================
// Template Types
// ============================================================================

export enum DropPointTemplateType {
    ASSIGNMENT_CONFIRMATION = 'DROP_POINT_ASSIGNMENT',
    CHANGE_NOTIFICATION = 'DROP_POINT_CHANGE',
}

export enum SupportedLanguage {
    ENGLISH = 'en',
    KANNADA = 'kn',
    HINDI = 'hi',
    TAMIL = 'ta',
    TELUGU = 'te',
}

export interface TemplateVariables {
    farmer_name?: string;
    crop_name: string;
    quantity_kg: number;
    drop_point_name: string;
    drop_point_address: string;
    pickup_date: string;      // e.g., "Tomorrow" or "Dec 23"
    pickup_time_window: string; // e.g., "7-9 AM"
    distance_km?: number;
    change_reason?: string;
    old_drop_point_name?: string;
}

// ============================================================================
// Template Registry
// ============================================================================

const ASSIGNMENT_TEMPLATES: Record<SupportedLanguage, string> = {
    [SupportedLanguage.ENGLISH]: `Your {{quantity_kg}}kg {{crop_name}} listing confirmed!

Deliver to: {{drop_point_name}}
Address: {{drop_point_address}}
When: {{pickup_date}} {{pickup_time_window}}

Bring required crates. -CropFresh`,

    [SupportedLanguage.KANNADA]: `ನಿಮ್ಮ {{quantity_kg}}kg {{crop_name}} ಪಟ್ಟಿ ದೃಢಪಡಿಸಲಾಗಿದೆ!

ತಲುಪಿಸಿ: {{drop_point_name}}
ವಿಳಾಸ: {{drop_point_address}}
ಯಾವಾಗ: {{pickup_date}} {{pickup_time_window}}

ಅಗತ್ಯ ಪೆಟ್ಟಿಗೆಗಳನ್ನು ತನ್ನಿ. -CropFresh`,

    [SupportedLanguage.HINDI]: `आपकी {{quantity_kg}}kg {{crop_name}} लिस्टिंग पुष्टि हुई!

डिलीवर करें: {{drop_point_name}}
पता: {{drop_point_address}}
कब: {{pickup_date}} {{pickup_time_window}}

जरूरी क्रेट लाएं। -CropFresh`,

    [SupportedLanguage.TAMIL]: `உங்கள் {{quantity_kg}}kg {{crop_name}} பட்டியல் உறுதிப்படுத்தப்பட்டது!

டெலிவரி: {{drop_point_name}}
முகவரி: {{drop_point_address}}
எப்போது: {{pickup_date}} {{pickup_time_window}}

தேவையான கூடைகளை கொண்டு வாருங்கள். -CropFresh`,

    [SupportedLanguage.TELUGU]: `మీ {{quantity_kg}}kg {{crop_name}} లిస్టింగ్ నిర్ధారించబడింది!

డెలివర్ చేయండి: {{drop_point_name}}
చిరునామా: {{drop_point_address}}
ఎప్పుడు: {{pickup_date}} {{pickup_time_window}}

అవసరమైన క్రేట్లు తీసుకురండి. -CropFresh`,
};

const CHANGE_TEMPLATES: Record<SupportedLanguage, string> = {
    [SupportedLanguage.ENGLISH]: `⚠️ Drop Point Changed!

OLD: {{old_drop_point_name}} (cancelled)
NEW: {{drop_point_name}}
Address: {{drop_point_address}}
When: {{pickup_date}} {{pickup_time_window}}
Reason: {{change_reason}}

-CropFresh`,

    [SupportedLanguage.KANNADA]: `⚠️ ಡ್ರಾಪ್ ಪಾಯಿಂಟ್ ಬದಲಾಯಿಸಲಾಗಿದೆ!

ಹಳೆಯ: {{old_drop_point_name}} (ರದ್ದಾಗಿದೆ)
ಹೊಸ: {{drop_point_name}}
ವಿಳಾಸ: {{drop_point_address}}
ಯಾವಾಗ: {{pickup_date}} {{pickup_time_window}}
ಕಾರಣ: {{change_reason}}

-CropFresh`,

    [SupportedLanguage.HINDI]: `⚠️ ड्रॉप पॉइंट बदल गया!

पुराना: {{old_drop_point_name}} (रद्द)
नया: {{drop_point_name}}
पता: {{drop_point_address}}
कब: {{pickup_date}} {{pickup_time_window}}
कारण: {{change_reason}}

-CropFresh`,

    [SupportedLanguage.TAMIL]: `⚠️ டிராப் பாயிண்ட் மாற்றப்பட்டது!

பழையது: {{old_drop_point_name}} (ரத்து)
புதியது: {{drop_point_name}}
முகவரி: {{drop_point_address}}
எப்போது: {{pickup_date}} {{pickup_time_window}}
காரணம்: {{change_reason}}

-CropFresh`,

    [SupportedLanguage.TELUGU]: `⚠️ డ్రాప్ పాయింట్ మారింది!

పాతది: {{old_drop_point_name}} (రద్దు)
కొత్తది: {{drop_point_name}}
చిరునామా: {{drop_point_address}}
ఎప్పుడు: {{pickup_date}} {{pickup_time_window}}
కారణం: {{change_reason}}

-CropFresh`,
};

// ============================================================================
// Template Functions
// ============================================================================

/**
 * Get SMS template for a given type and language
 */
export function getTemplate(
    type: DropPointTemplateType,
    language: SupportedLanguage = SupportedLanguage.ENGLISH
): string {
    switch (type) {
        case DropPointTemplateType.ASSIGNMENT_CONFIRMATION:
            return ASSIGNMENT_TEMPLATES[language] || ASSIGNMENT_TEMPLATES[SupportedLanguage.ENGLISH];
        case DropPointTemplateType.CHANGE_NOTIFICATION:
            return CHANGE_TEMPLATES[language] || CHANGE_TEMPLATES[SupportedLanguage.ENGLISH];
        default:
            throw new Error(`Unknown template type: ${type}`);
    }
}

/**
 * Substitute variables into a template
 */
export function substituteVariables(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
    }

    return result;
}

/**
 * Build complete SMS message for drop point assignment (AC4)
 */
export function buildAssignmentSMS(
    language: SupportedLanguage,
    variables: TemplateVariables
): string {
    const template = getTemplate(DropPointTemplateType.ASSIGNMENT_CONFIRMATION, language);
    return substituteVariables(template, variables);
}

/**
 * Build complete SMS message for drop point change (AC6)
 */
export function buildChangeSMS(
    language: SupportedLanguage,
    variables: TemplateVariables
): string {
    const template = getTemplate(DropPointTemplateType.CHANGE_NOTIFICATION, language);
    return substituteVariables(template, variables);
}

/**
 * Detect language from ISO code string
 */
export function parseLanguage(code: string): SupportedLanguage {
    const normalized = code.toLowerCase().slice(0, 2);
    switch (normalized) {
        case 'kn':
        case 'ka': // alternate code
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
