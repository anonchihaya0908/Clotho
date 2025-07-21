import React, { useRef, useEffect, useState } from 'react';
import { CLANG_FORMAT_OPTIONS, ClangFormatOption } from '../data/clangFormatOptions';
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
        keys: ['BasedOnStyle']
    },
    {
        category: '缩进设置',
        icon: '↹',
        keys: ['IndentWidth', 'UseTab', 'TabWidth', 'ContinuationIndentWidth']
    },
    {
        category: '大括号样式',
        icon: '{}',
        keys: ['BreakBeforeBraces', 'Cpp11BracedListStyle', 'AllowShortBlocksOnASingleLine', 'AllowShortFunctionsOnASingleLine', 'AllowShortIfStatementsOnASingleLine', 'AllowShortLoopsOnASingleLine']
    },
    {
        category: '行长度与换行',
        icon: '📏',
        keys: ['ColumnLimit', 'BreakStringLiterals', 'AlwaysBreakAfterReturnType', 'AlwaysBreakBeforeMultilineStrings', 'BinPackArguments', 'BinPackParameters']
    },
    {
        category: '空格设置',
        icon: '␣',
        keys: ['SpaceBeforeParens', 'SpaceAfterCStyleCast', 'SpacesInParentheses', 'SpaceBeforeAssignmentOperators', 'SpacesInSquareBrackets', 'SpacesInAngles', 'SpaceAfterTemplateKeyword']
    },
    {
        category: '指针和引用',
        icon: '*&',
        keys: ['PointerAlignment', 'ReferenceAlignment', 'DerivePointerAlignment']
    },
    {
        category: '构造函数和继承',
        icon: '🏗️',
        keys: ['BreakConstructorInitializers', 'ConstructorInitializerAllOnOneLineOrOnePerLine', 'ConstructorInitializerIndentWidth', 'BreakInheritanceList']
    },
    {
        category: '注释与文档',
        icon: '💬',
        keys: ['AlignTrailingComments', 'ReflowComments', 'FixNamespaceComments', 'SpacesBeforeTrailingComments']
    },
    {
        category: '排序与组织',
        icon: '📑',
        keys: ['SortIncludes', 'SortUsingDeclarations', 'IncludeBlocks']
    }
];

// 微观预览组件 - 支持Markdown格式
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

    // 生成Markdown格式的代码
    const generateMarkdownCode = () => {
        return `\`\`\`cpp\n${code}\n\`\`\``;
    };

    return (
        <div className="quick-micro-preview">
            <div className="preview-label">
                Preview:
                <button
                    className="copy-markdown-btn"
                    onClick={() => navigator.clipboard?.writeText(generateMarkdownCode())}
                    title="复制Markdown代码"
                >
                    📋 MD
                </button>
            </div>
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
    // 折叠状态管理
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['基础样式', '缩进设置', '大括号样式', '空格设置']) // 默认展开常用分类
    );

    // 切换分类展开状态
    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };
    // 生成默认预览代码 - 仅支持 C/C++
    const generateDefaultPreview = (option: ClangFormatOption) => {
        try {
            const generateCppExample = (key: string) => {
                switch (key) {
                    case 'BasedOnStyle':
                        return `// Based on ${config[option.key] || option.defaultValue} style\nclass Example {\npublic:\n    void method();\n};`;
                    case 'IndentWidth':
                        const indentValue = config[option.key] || option.defaultValue || 2;
                        const cppIndent = ' '.repeat(Math.max(1, Math.min(8, indentValue))); // 限制范围 1-8
                        return `if (condition) {\n${cppIndent}doSomething();\n}`;
                    case 'UseTab':
                        const cppUseTab = config[option.key] || option.defaultValue;
                        const cppTabIndent = cppUseTab === 'Never' ? '    ' : '\t';
                        return `class MyClass {\npublic:\n${cppTabIndent}void method();\n};`;
                    case 'TabWidth':
                        const tabWidth = config[option.key] || option.defaultValue || 4;
                        return `function() {\n\treturn value; // Tab width: ${tabWidth}\n}`;
                    case 'ColumnLimit':
                        const limit = Math.max(20, Math.min(200, config[option.key] || option.defaultValue || 80)); // 限制范围
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
                    case 'AllowShortFunctionsOnASingleLine':
                        const shortFunc = config[option.key] || option.defaultValue;
                        return shortFunc === 'true' || shortFunc === 'All'
                            ? `void shortFunc() { return; }`
                            : `void shortFunc() {\n    return;\n}`;
                    case 'AllowShortIfStatementsOnASingleLine':
                        const shortIf = config[option.key] || option.defaultValue;
                        return shortIf === 'true' || shortIf === 'WithoutElse'
                            ? `if (condition) doSomething();`
                            : `if (condition)\n    doSomething();`;
                    case 'AlignTrailingComments':
                        const alignComments = config[option.key] || option.defaultValue;
                        return alignComments === 'true'
                            ? `int a = 1;     // Comment 1\nint bb = 2;    // Comment 2`
                            : `int a = 1; // Comment 1\nint bb = 2; // Comment 2`;
                    case 'BreakConstructorInitializers':
                        const ctorStyle = config[option.key] || option.defaultValue;
                        return ctorStyle === 'BeforeColon'
                            ? `Constructor()\n    : member1(value1)\n    , member2(value2) {}`
                            : `Constructor() :\n    member1(value1),\n    member2(value2) {}`;
                    case 'SortIncludes':
                        const sortInc = config[option.key] || option.defaultValue;
                        return sortInc === 'true'
                            ? `#include <algorithm>\n#include <iostream>\n#include <vector>`
                            : `#include <vector>\n#include <iostream>\n#include <algorithm>`;
                    case 'BinPackArguments':
                        const binPack = config[option.key] || option.defaultValue;
                        return binPack === 'false'
                            ? `function(\n    arg1,\n    arg2,\n    arg3\n);`
                            : `function(arg1, arg2, arg3);`;
                    case 'SpacesInParentheses':
                        const spacesInParens = config[option.key] || option.defaultValue;
                        return spacesInParens === 'true'
                            ? `if ( condition )\nfunc( param );`
                            : `if (condition)\nfunc(param);`;
                    case 'SpaceAfterTemplateKeyword':
                        const spaceAfterTemplate = config[option.key] || option.defaultValue;
                        return spaceAfterTemplate === 'true'
                            ? `template <typename T>\nclass Example {};`
                            : `template<typename T>\nclass Example {};`;
                    case 'FixNamespaceComments':
                        const fixNs = config[option.key] || option.defaultValue;
                        return fixNs === 'true'
                            ? `namespace Example {\n    void func();\n} // namespace Example`
                            : `namespace Example {\n    void func();\n}`;
                    case 'ReflowComments':
                        const reflow = config[option.key] || option.defaultValue;
                        return reflow === 'true'
                            ? `// This is a very long comment that will be\n// reflowed to fit within the column limit.`
                            : `// This is a very long comment that will not be reflowed to fit within the column limit.`;
                    case 'AllowShortBlocksOnASingleLine':
                        const shortBlocks = config[option.key] || option.defaultValue;
                        return shortBlocks === 'true' || shortBlocks === 'Always'
                            ? `if (condition) { doSomething(); }`
                            : `if (condition) {\n    doSomething();\n}`;
                    case 'Cpp11BracedListStyle':
                        const cpp11Braces = config[option.key] || option.defaultValue;
                        return cpp11Braces === 'true'
                            ? `vector<int> v{1, 2, 3, 4};`
                            : `vector<int> v{ 1, 2, 3, 4 };`;
                    case 'BreakStringLiterals':
                        const breakStrings = config[option.key] || option.defaultValue;
                        return breakStrings === 'true'
                            ? `const char* longString = "This is a very "\n                        "long string";`
                            : `const char* longString = "This is a very long string";`;
                    case 'ContinuationIndentWidth':
                        const contIndent = config[option.key] || option.defaultValue || 4;
                        const contIndentStr = ' '.repeat(Math.max(1, Math.min(8, contIndent)));
                        return `int result = someVeryLongFunctionName(\n${contIndentStr}parameter1,\n${contIndentStr}parameter2);`;
                    default:
                        return `// ${option.key} example\nclass Example {\npublic:\n    void method();\n};`;
                }
            };

            return generateCppExample(option.key);
        } catch (error) {
            console.error('Error generating preview for', option.key, error);
            return `// ${option.key} preview\nclass Example {\npublic:\n    void method();\n};`;
        }
    };
    const renderConfigItem = (option: ClangFormatOption) => {
        const value = config[option.key];
        // 所有选项都支持，因为只使用 C++
        const isDisabled = false;

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
                const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= (option.min || 0) && value <= (option.max || 1000)) {
                        onChange(option.key, value);
                    }
                };

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
                            onChange={handleNumberChange}
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
                <h3>快速设置</h3>
                <p>执此数线，织体自成。</p>
            </div>

            <div className="quick-categories">
                {QUICK_CONFIG_CATEGORIES.map((category) => {
                    const isExpanded = expandedCategories.has(category.category);

                    return (
                        <div key={category.category} className="quick-category">
                            <div
                                className="category-header"
                                onClick={() => toggleCategory(category.category)}
                            >
                                <span className="category-icon">{category.icon}</span>
                                <h4 className="category-title">{category.category}</h4>
                                <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
                                    ▼
                                </span>
                            </div>

                            {isExpanded && (
                                <div className="category-items">
                                    {category.keys.map((key) => {
                                        const option = getQuickConfigItem(key);
                                        // 所有选项都支持，因为只使用 C++
                                        const isDisabled = false;

                                        return option ? (
                                            <div key={key} className={isDisabled ? 'disabled-option' : ''}>
                                                {renderConfigItem(option)}
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
