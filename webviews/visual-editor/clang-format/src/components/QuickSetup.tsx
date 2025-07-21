import React, { useRef, useEffect } from 'react';
import { CLANG_FORMAT_OPTIONS, ClangFormatOption, isOptionDisabledForLanguage } from '../data/clangFormatOptions';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import './QuickSetup.css';

// 确保 C++ 语言已注册
if (!hljs.getLanguage('cpp')) {
    hljs.registerLanguage('cpp', cpp);
}

interface QuickSetupProps {
    config: Record<string, any>;
    onChange: (key: string, value: any) => void;
}

// 快速设置的常用配置项 - 基于完整选项数据库
const getQuickConfigItem = (key: string): ClangFormatOption | undefined => {
    return CLANG_FORMAT_OPTIONS.find(option => option.key === key);
};

const QUICK_CONFIG_CATEGORIES = [
    {
        category: '基础样式',
        icon: '🎨',
        keys: ['BasedOnStyle', 'Language']
    },
    {
        category: '缩进设置',
        icon: '↹',
        keys: ['IndentWidth', 'UseTab', 'TabWidth', 'ContinuationIndentWidth']
    },
    {
        category: '大括号样式',
        icon: '{}',
        keys: ['BreakBeforeBraces', 'Cpp11BracedListStyle', 'AllowShortBlocksOnASingleLine']
    },
    {
        category: '行长度',
        icon: '📏',
        keys: ['ColumnLimit', 'BreakStringLiterals', 'AllowShortFunctionsOnASingleLine']
    },
    {
        category: '空格设置',
        icon: '␣',
        keys: ['SpaceBeforeParens', 'SpaceAfterCStyleCast', 'SpacesInParentheses', 'SpaceBeforeAssignmentOperators']
    },
    {
        category: '指针和引用',
        icon: '*&',
        keys: ['PointerAlignment', 'ReferenceAlignment', 'DerivePointerAlignment']
    }
];

// 微观预览组件
const MicroPreview: React.FC<{ code: string }> = ({ code }) => {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current && code) {
            try {
                codeRef.current.removeAttribute('data-highlighted');
                codeRef.current.className = 'language-cpp hljs';

                const result = hljs.highlight(code, {
                    language: 'cpp',
                    ignoreIllegals: true
                });

                codeRef.current.innerHTML = result.value;
            } catch (error) {
                console.error('Quick setup highlight error:', error);
                codeRef.current.textContent = code;
            }
        }
    }, [code]);

    return (
        <div className="quick-micro-preview">
            <div className="preview-label">Preview:</div>
            <pre className="quick-code-preview">
                <code
                    ref={codeRef}
                    className="language-cpp"
                >
                    {/* 内容将通过 innerHTML 设置 */}
                </code>
            </pre>
        </div>
    );
};

export const QuickSetup: React.FC<QuickSetupProps> = ({ config, onChange }) => {
    // 生成默认预览代码
    const generateDefaultPreview = (option: ClangFormatOption) => {
        // 获取当前选择的语言
        const currentLanguage = config['Language'] || option.defaultValue || 'Cpp';

        const generateLanguageExample = (key: string) => {
            switch (currentLanguage) {
                case 'ObjC':
                    switch (key) {
                        case 'BasedOnStyle':
                            return `// Based on ${config[option.key] || option.defaultValue} style\n@interface Example : NSObject\n@end\n\n@implementation Example\n- (void)method {\n}\n@end`;
                        case 'IndentWidth':
                            const objcIndent = ' '.repeat(config[option.key] || option.defaultValue || 4);
                            return `if (condition) {\n${objcIndent}[self doSomething];\n}`;
                        case 'UseTab':
                            const objcUseTab = config[option.key] || option.defaultValue;
                            const objcTabIndent = objcUseTab === 'Never' ? '    ' : '\t';
                            return `@interface MyClass : NSObject\n${objcTabIndent}- (void)method;\n@end`;
                        default:
                            return `// ${option.key} example\n@interface Example : NSObject\n- (void)method;\n@end`;
                    }

                default: // Cpp
                    switch (key) {
                        case 'BasedOnStyle':
                            return `// Based on ${config[option.key] || option.defaultValue} style\nclass Example {\npublic:\n    void method();\n};`;
                        case 'IndentWidth':
                            const cppIndent = ' '.repeat(config[option.key] || option.defaultValue || 2);
                            return `if (condition) {\n${cppIndent}doSomething();\n}`;
                        case 'UseTab':
                            const cppUseTab = config[option.key] || option.defaultValue;
                            const cppTabIndent = cppUseTab === 'Never' ? '    ' : '\t';
                            return `class MyClass {\npublic:\n${cppTabIndent}void method();\n};`;
                        case 'TabWidth':
                            return `function() {\n\treturn value; // Tab width: ${config[option.key] || option.defaultValue}\n}`;
                        case 'ColumnLimit':
                            const limit = config[option.key] || option.defaultValue || 80;
                            const longLine = 'void longFunctionNameWithManyParameters(int param1, int param2, int param3);';
                            return longLine.length > limit ? longLine.substring(0, limit - 3) + '...' : longLine;
                        case 'BreakBeforeBraces':
                            const braceStyle = config[option.key] || option.defaultValue;
                            return braceStyle === 'Attach'
                                ? `if (condition) {\n    statement;\n}`
                                : `if (condition)\n{\n    statement;\n}`;
                        case 'SpaceBeforeParens':
                            const spaceStyle = config[option.key] || option.defaultValue;
                            return spaceStyle === 'Never'
                                ? `if(condition)\nfor(int i = 0; i < 10; ++i)`
                                : `if (condition)\nfor (int i = 0; i < 10; ++i)`;
                        case 'PointerAlignment':
                            const ptrAlign = config[option.key] || option.defaultValue;
                            return ptrAlign === 'Left'
                                ? `int* ptr;\nchar* name;`
                                : ptrAlign === 'Right'
                                    ? `int *ptr;\nchar *name;`
                                    : `int * ptr;\nchar * name;`;
                        default:
                            return `// ${option.key} example\nclass Example {\npublic:\n    void method();\n};`;
                    }
            }
        };

        return generateLanguageExample(option.key);
    };
    const renderConfigItem = (option: ClangFormatOption) => {
        const value = config[option.key];
        const currentLanguage = config['Language'] || 'Cpp';
        const isDisabled = isOptionDisabledForLanguage(option.key, currentLanguage);

        switch (option.type) {
            case 'boolean':
                return (
                    <div className="quick-config-item">
                        <label className={`quick-checkbox-wrapper ${isDisabled ? 'disabled' : ''}`}>
                            <input
                                type="checkbox"
                                checked={Boolean(value !== undefined ? value : option.defaultValue)}
                                disabled={isDisabled}
                                onChange={(e) => onChange(option.key, e.target.checked)}
                            />
                            <span className="quick-checkbox"></span>
                            {option.name}
                        </label>
                        <div className="item-description">{option.description}</div>
                        <MicroPreview code={generateDefaultPreview(option)} />
                    </div>
                );

            case 'number':
                return (
                    <div className="quick-config-item">
                        <label className="input-label">{option.name}</label>
                        <input
                            type="number"
                            value={value !== undefined ? value : (option.defaultValue || '')}
                            min={option.min}
                            max={option.max}
                            disabled={isDisabled}
                            className={`quick-number-input ${isDisabled ? 'disabled' : ''}`}
                            onChange={(e) => onChange(option.key, parseInt(e.target.value) || 0)}
                            placeholder={`默认: ${option.defaultValue || ''}`}
                        />
                        <div className="item-description">{option.description}</div>
                        <MicroPreview code={generateDefaultPreview(option)} />
                    </div>
                );

            case 'enum':
                return (
                    <div className="quick-config-item">
                        <label className="input-label">{option.name}</label>
                        <select
                            value={value !== undefined ? value : (option.defaultValue || '')}
                            disabled={isDisabled}
                            onChange={(e) => onChange(option.key, e.target.value)}
                            className={`quick-select-input ${isDisabled ? 'disabled' : ''}`}
                        >
                            {option.enumValues?.map((enumValue: string) => (
                                <option key={enumValue} value={enumValue}>
                                    {enumValue}
                                </option>
                            ))}
                        </select>
                        <div className="item-description">{option.description}</div>
                        <MicroPreview code={generateDefaultPreview(option)} />
                    </div>
                );

            case 'string':
                return (
                    <div className="quick-config-item">
                        <label className="input-label">{option.name}</label>
                        <input
                            type="text"
                            value={value !== undefined ? value : (option.defaultValue || '')}
                            disabled={isDisabled}
                            onChange={(e) => onChange(option.key, e.target.value)}
                            className={`quick-text-input ${isDisabled ? 'disabled' : ''}`}
                            placeholder={`默认: ${option.defaultValue || ''}`}
                        />
                        <div className="item-description">{option.description}</div>
                        <MicroPreview code={generateDefaultPreview(option)} />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="quick-setup">
            <div className="quick-setup-header">
                <h3>⚡ 快速设置</h3>
                <p>为普通用户提供的最常用配置选项</p>
            </div>

            <div className="quick-categories">
                {QUICK_CONFIG_CATEGORIES.map((category) => (
                    <div key={category.category} className="quick-category">
                        <div className="category-header">
                            <span className="category-icon">{category.icon}</span>
                            <h4 className="category-title">{category.category}</h4>
                        </div>
                        <div className="category-items">
                            {category.keys.map((key) => {
                                const option = getQuickConfigItem(key);
                                const currentLanguage = config['Language'] || 'Cpp';
                                const isDisabled = option ? isOptionDisabledForLanguage(option.key, currentLanguage) : false;

                                return option ? (
                                    <div key={key} className={isDisabled ? 'disabled-option' : ''}>
                                        {renderConfigItem(option)}
                                        {isDisabled && (
                                            <div className="disabled-notice">
                                                对 {currentLanguage} 不可用
                                            </div>
                                        )}
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
