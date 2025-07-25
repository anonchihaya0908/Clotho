/**
 * PreviewService Tests
 * 验证预览服务的功能和解耦效果
 */

import { PreviewService } from '../visual-editor/clang-format/preview-service';
import { ConfigCategories } from '../common/types/config';

describe('PreviewService', () => {
    describe('generatePreviewCode', () => {
        it('should generate specific preview for AlignAfterOpenBracket', () => {
            const preview = PreviewService.generatePreviewCode(
                'AlignAfterOpenBracket',
                ConfigCategories.ALIGNMENT,
                'enum'
            );

            expect(preview).toContain('function(argument1,');
            expect(preview).toContain('argument2,');
            expect(preview).toContain('argument3);');
        });

        it('should generate specific preview for AlignConsecutiveAssignments', () => {
            const preview = PreviewService.generatePreviewCode(
                'AlignConsecutiveAssignments',
                ConfigCategories.ALIGNMENT,
                'enum'
            );

            expect(preview).toContain('int a = 1;');
            expect(preview).toContain('int bb = 2;');
            expect(preview).toContain('int ccc = 3;');
        });

        it('should generate brace preview for BraceWrapping options', () => {
            const preview = PreviewService.generatePreviewCode(
                'BraceWrapping',
                ConfigCategories.BRACES,
                'string'
            );

            expect(preview).toContain('if (condition) {');
            expect(preview).toContain('statement;');
            expect(preview).toContain('}');
        });

        it('should generate category-based preview when no specific match', () => {
            const preview = PreviewService.generatePreviewCode(
                'UnknownOption',
                ConfigCategories.SPACING,
                'boolean'
            );

            expect(preview).toContain('a = b + c;');
        });

        it('should generate default preview for unknown category', () => {
            const preview = PreviewService.generatePreviewCode(
                'UnknownOption',
                ConfigCategories.GENERAL,
                'boolean'
            );

            expect(preview).toContain('void function() {');
            expect(preview).toContain('if (condition) {');
        });
    });

    describe('isValidPreviewCode', () => {
        it('should validate balanced braces and parentheses', () => {
            const validCode = 'if (condition) { statement; }';
            expect(PreviewService.isValidPreviewCode(validCode)).toBe(true);
        });

        it('should reject unbalanced braces', () => {
            const invalidCode = 'if (condition) { statement;';
            expect(PreviewService.isValidPreviewCode(invalidCode)).toBe(false);
        });

        it('should reject empty code', () => {
            expect(PreviewService.isValidPreviewCode('')).toBe(false);
            expect(PreviewService.isValidPreviewCode('   ')).toBe(false);
        });
    });

    describe('getAllTemplates', () => {
        it('should return all template categories', () => {
            const templates = PreviewService.getAllTemplates();

            expect(templates).toHaveProperty('ALIGNMENT');
            expect(templates).toHaveProperty('BRACES');
            expect(templates).toHaveProperty('SPACING');
            expect(templates).toHaveProperty('INDENTATION');
            expect(templates).toHaveProperty('WRAPPING');
            expect(templates).toHaveProperty('COMMENTS');
            expect(templates).toHaveProperty('GENERAL');
        });
    });
});

// 集成测试：验证与配置选项的协同工作
describe('PreviewService Integration', () => {
    // 模拟配置选项
    const mockOptions = [
        {
            key: 'AlignAfterOpenBracket',
            category: ConfigCategories.ALIGNMENT,
            type: 'enum' as const,
        },
        {
            key: 'BreakBeforeBraces',
            category: ConfigCategories.BRACES,
            type: 'enum' as const,
        },
        {
            key: 'SpacesInParentheses',
            category: ConfigCategories.SPACING,
            type: 'boolean' as const,
        },
    ];

    it('should generate valid previews for all mock options', () => {
        mockOptions.forEach(option => {
            const preview = PreviewService.generatePreviewCode(
                option.key,
                option.category,
                option.type
            );

            expect(preview).toBeTruthy();
            expect(typeof preview).toBe('string');
            expect(PreviewService.isValidPreviewCode(preview)).toBe(true);
        });
    });

    it('should generate different previews for different options', () => {
        const previews = mockOptions.map(option =>
            PreviewService.generatePreviewCode(option.key, option.category, option.type)
        );

        // 验证每个预览都是唯一的
        const uniquePreviews = new Set(previews);
        expect(uniquePreviews.size).toBe(previews.length);
    });
});
