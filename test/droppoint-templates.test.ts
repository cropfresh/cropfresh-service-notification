/**
 * Drop Point SMS Templates - Unit Tests (Story 3.4)
 * 
 * Tests multi-language SMS template generation and variable substitution.
 * Covers Task 9.4: SMS delivery with template substitution
 */

import {
    getTemplate,
    substituteVariables,
    buildAssignmentSMS,
    buildChangeSMS,
    parseLanguage,
    DropPointTemplateType,
    SupportedLanguage,
    TemplateVariables,
} from '../src/templates/droppoint-templates';

// ============================================================================
// Test Suite
// ============================================================================

describe('DropPoint SMS Templates', () => {

    // --------------------------------------------------------------------------
    // getTemplate
    // --------------------------------------------------------------------------

    describe('getTemplate', () => {
        it('should return English template by default', () => {
            // Act
            const template = getTemplate(DropPointTemplateType.ASSIGNMENT_CONFIRMATION);

            // Assert
            expect(template).toContain('Deliver to');
            expect(template).toContain('-CropFresh');
        });

        it('should return Kannada template when requested', () => {
            // Act
            const template = getTemplate(
                DropPointTemplateType.ASSIGNMENT_CONFIRMATION,
                SupportedLanguage.KANNADA
            );

            // Assert
            expect(template).toContain('ತಲುಪಿಸಿ');
            expect(template).toContain('-CropFresh');
        });

        it('should return Hindi template when requested', () => {
            // Act
            const template = getTemplate(
                DropPointTemplateType.ASSIGNMENT_CONFIRMATION,
                SupportedLanguage.HINDI
            );

            // Assert
            expect(template).toContain('डिलीवर करें');
        });

        it('should return Tamil template when requested', () => {
            // Act
            const template = getTemplate(
                DropPointTemplateType.ASSIGNMENT_CONFIRMATION,
                SupportedLanguage.TAMIL
            );

            // Assert
            expect(template).toContain('டெலிவரி');
        });

        it('should return Telugu template when requested', () => {
            // Act
            const template = getTemplate(
                DropPointTemplateType.ASSIGNMENT_CONFIRMATION,
                SupportedLanguage.TELUGU
            );

            // Assert
            expect(template).toContain('డెలివర్ చేయండి');
        });

        it('should return change notification template', () => {
            // Act
            const template = getTemplate(DropPointTemplateType.CHANGE_NOTIFICATION);

            // Assert
            expect(template).toContain('Changed');
            expect(template).toContain('{{old_drop_point_name}}');
            expect(template).toContain('{{change_reason}}');
        });
    });

    // --------------------------------------------------------------------------
    // substituteVariables
    // --------------------------------------------------------------------------

    describe('substituteVariables', () => {
        it('should replace all placeholders with values', () => {
            // Arrange
            const template = 'Deliver {{quantity_kg}}kg {{crop_name}} to {{drop_point_name}}';
            const variables: TemplateVariables = {
                quantity_kg: 50,
                crop_name: 'Tomatoes',
                drop_point_name: 'Kolar Main',
                drop_point_address: 'Near KSRTC',
                pickup_date: 'Tomorrow',
                pickup_time_window: '7-9 AM',
            };

            // Act
            const result = substituteVariables(template, variables);

            // Assert
            expect(result).toBe('Deliver 50kg Tomatoes to Kolar Main');
        });

        it('should handle missing variables gracefully', () => {
            // Arrange
            const template = '{{farmer_name}}, your listing is confirmed at {{drop_point_name}}';
            const variables: TemplateVariables = {
                crop_name: 'Tomatoes',
                quantity_kg: 50,
                drop_point_name: 'Kolar Main',
                drop_point_address: 'Test',
                pickup_date: 'Tomorrow',
                pickup_time_window: '7-9 AM',
            };

            // Act
            const result = substituteVariables(template, variables);

            // Assert
            expect(result).toContain('Kolar Main');
            expect(result).not.toContain('{{drop_point_name}}'); // Replaced
        });
    });

    // --------------------------------------------------------------------------
    // buildAssignmentSMS
    // --------------------------------------------------------------------------

    describe('buildAssignmentSMS', () => {
        const mockVariables: TemplateVariables = {
            crop_name: 'Tomatoes',
            quantity_kg: 50,
            drop_point_name: 'Kolar Main Point',
            drop_point_address: 'Near KSRTC Bus Stand, Kolar',
            pickup_date: 'Tomorrow',
            pickup_time_window: '7-9 AM',
            distance_km: 3.2,
        };

        it('should build complete English SMS', () => {
            // Act
            const sms = buildAssignmentSMS(SupportedLanguage.ENGLISH, mockVariables);

            // Assert
            expect(sms).toContain('50kg Tomatoes');
            expect(sms).toContain('Kolar Main Point');
            expect(sms).toContain('Tomorrow 7-9 AM');
            expect(sms).toContain('-CropFresh');
        });

        it('should build complete Kannada SMS', () => {
            // Act
            const sms = buildAssignmentSMS(SupportedLanguage.KANNADA, mockVariables);

            // Assert
            expect(sms).toContain('50kg Tomatoes');
            expect(sms).toContain('Kolar Main Point');
            expect(sms).toContain('ಅಗತ್ಯ ಪೆಟ್ಟಿಗೆಗಳನ್ನು ತನ್ನಿ');
        });

        it('should keep SMS under 320 characters for SMS segment', () => {
            // Act
            const sms = buildAssignmentSMS(SupportedLanguage.ENGLISH, mockVariables);

            // Assert - 2 SMS segments max (320 chars with Unicode)
            expect(sms.length).toBeLessThan(320);
        });
    });

    // --------------------------------------------------------------------------
    // buildChangeSMS
    // --------------------------------------------------------------------------

    describe('buildChangeSMS', () => {
        const changeVariables: TemplateVariables = {
            crop_name: 'Tomatoes',
            quantity_kg: 50,
            drop_point_name: 'Mulbagal Point',
            drop_point_address: 'Main Road, Mulbagal',
            pickup_date: 'Tomorrow',
            pickup_time_window: '8-10 AM',
            old_drop_point_name: 'Kolar Main Point',
            change_reason: 'Capacity full',
        };

        it('should include old and new drop point names', () => {
            // Act
            const sms = buildChangeSMS(SupportedLanguage.ENGLISH, changeVariables);

            // Assert
            expect(sms).toContain('Kolar Main Point');
            expect(sms).toContain('Mulbagal Point');
            expect(sms).toContain('Capacity full');
        });

        it('should include warning indicator', () => {
            // Act
            const sms = buildChangeSMS(SupportedLanguage.ENGLISH, changeVariables);

            // Assert
            expect(sms).toContain('⚠️');
            expect(sms).toContain('Changed');
        });
    });

    // --------------------------------------------------------------------------
    // parseLanguage
    // --------------------------------------------------------------------------

    describe('parseLanguage', () => {
        it('should parse "kn" as Kannada', () => {
            expect(parseLanguage('kn')).toBe(SupportedLanguage.KANNADA);
            expect(parseLanguage('kn-IN')).toBe(SupportedLanguage.KANNADA);
        });

        it('should parse "hi" as Hindi', () => {
            expect(parseLanguage('hi')).toBe(SupportedLanguage.HINDI);
            expect(parseLanguage('hi-IN')).toBe(SupportedLanguage.HINDI);
        });

        it('should parse "ta" as Tamil', () => {
            expect(parseLanguage('ta')).toBe(SupportedLanguage.TAMIL);
        });

        it('should parse "te" as Telugu', () => {
            expect(parseLanguage('te')).toBe(SupportedLanguage.TELUGU);
        });

        it('should default to English for unknown codes', () => {
            expect(parseLanguage('fr')).toBe(SupportedLanguage.ENGLISH);
            expect(parseLanguage('unknown')).toBe(SupportedLanguage.ENGLISH);
        });
    });
});
