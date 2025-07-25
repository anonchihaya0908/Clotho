/**
 * 测试新的配置选项数据库
 */

import { CLANG_FORMAT_OPTIONS, DEFAULT_CLANG_FORMAT_CONFIG, MACRO_PREVIEW_CODE } from './clang-format-options-database';
import { ConfigCategories } from '../../../common/types/config';

/**
 * 验证数据库完整性的测试函数
 */
export function testDatabase(): void {
    console.log('🧪 测试 Clang-Format 配置选项数据库...');
    
    // 测试1: 验证选项数量
    console.log(`📊 总配置选项数量: ${CLANG_FORMAT_OPTIONS.length}`);
    
    // 测试2: 验证分类覆盖
    const categories = Object.values(ConfigCategories);
    const usedCategories = new Set(CLANG_FORMAT_OPTIONS.map(opt => opt.category));
    console.log(`📂 定义的分类数量: ${categories.length}`);
    console.log(`📂 使用的分类数量: ${usedCategories.size}`);
    
    // 测试3: 验证每个分类的选项数量
    categories.forEach(category => {
        const count = CLANG_FORMAT_OPTIONS.filter(opt => opt.category === category).length;
        console.log(`  - ${category}: ${count} 个选项`);
    });
    
    // 测试4: 验证预览模板覆盖率
    const withPreview = CLANG_FORMAT_OPTIONS.filter(opt => opt.previewTemplate).length;
    const previewCoverage = (withPreview / CLANG_FORMAT_OPTIONS.length * 100).toFixed(1);
    console.log(`🎨 预览模板覆盖率: ${withPreview}/${CLANG_FORMAT_OPTIONS.length} (${previewCoverage}%)`);
    
    // 测试5: 验证必需字段
    const missingFields = CLANG_FORMAT_OPTIONS.filter(opt => 
        !opt.key || !opt.name || !opt.description || !opt.category || !opt.type || !opt.version
    );
    if (missingFields.length > 0) {
        console.error('❌ 发现缺少必需字段的选项:', missingFields.map(opt => opt.key));
    } else {
        console.log('✅ 所有选项都包含必需字段');
    }
    
    // 测试6: 验证默认配置
    console.log('⚙️ 默认配置:', DEFAULT_CLANG_FORMAT_CONFIG);
    
    // 测试7: 验证宏观预览代码
    console.log(`📄 宏观预览代码长度: ${MACRO_PREVIEW_CODE.length} 字符`);
    
    // 测试8: 验证重复键名
    const keys = CLANG_FORMAT_OPTIONS.map(opt => opt.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
        console.error('❌ 发现重复的配置键名');
    } else {
        console.log('✅ 所有配置键名都是唯一的');
    }
    
    // 测试9: 验证版本信息
    const versions = new Set(CLANG_FORMAT_OPTIONS.map(opt => opt.version));
    console.log(`📋 支持的 clang-format 版本: ${Array.from(versions).sort().join(', ')}`);
    
    // 测试10: 验证已弃用选项
    const deprecated = CLANG_FORMAT_OPTIONS.filter(opt => opt.deprecated).length;
    console.log(`⚠️ 已弃用选项数量: ${deprecated}`);
    
    console.log('🎉 数据库测试完成！');
}

/**
 * 按分类统计选项
 */
export function getStatsByCategory(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    Object.values(ConfigCategories).forEach(category => {
        stats[category] = CLANG_FORMAT_OPTIONS.filter(opt => opt.category === category).length;
    });
    
    return stats;
}

/**
 * 获取特定类型的选项数量
 */
export function getStatsByType(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    ['boolean', 'number', 'string', 'enum'].forEach(type => {
        stats[type] = CLANG_FORMAT_OPTIONS.filter(opt => opt.type === type).length;
    });
    
    return stats;
}

/**
 * 查找特定选项
 */
export function findOption(key: string) {
    return CLANG_FORMAT_OPTIONS.find(opt => opt.key === key);
}

/**
 * 搜索选项
 */
export function searchOptions(query: string) {
    const lowerQuery = query.toLowerCase();
    return CLANG_FORMAT_OPTIONS.filter(opt =>
        opt.key.toLowerCase().includes(lowerQuery) ||
        opt.name.toLowerCase().includes(lowerQuery) ||
        opt.description.toLowerCase().includes(lowerQuery)
    );
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    testDatabase();
}
