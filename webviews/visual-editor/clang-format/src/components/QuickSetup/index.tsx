import React, { useRef, useEffect, useState } from 'react';
import { CLANG_FORMAT_OPTIONS, ClangFormatOption } from '../../data/clangFormatOptions';
import { highlightCode, isHighlightJSLoaded } from '../../utils/highlight-loader';
import './style.css';

interface QuickSetupProps {
    config: Record<string, any>;
    onChange: (key: string, value: any) => void;
    onOpenClangFormatFile?: () => void;
}

// 各种基础风格的默认值映射
const STYLE_DEFAULTS: Record<string, Record<string, any>> = {
    'LLVM': {
        IndentWidth: 2,
        TabWidth: 8,
        UseTab: 'Never',
        BreakBeforeBraces: 'Attach',
        ColumnLimit: 80
    },
    'Google': {
        IndentWidth: 2,
        TabWidth: 8,
        UseTab: 'Never',
        BreakBeforeBraces: 'Attach',
        ColumnLimit: 80
    },
    'Chromium': {
        IndentWidth: 2,
        TabWidth: 8,
        UseTab: 'Never',
        BreakBeforeBraces: 'Attach',
        ColumnLimit: 80
    },
    'Microsoft': {
        IndentWidth: 4,
        TabWidth: 4,
        UseTab: 'Never',
        BreakBeforeBraces: 'Allman',
        ColumnLimit: 120
    },
    'Mozilla': {
        IndentWidth: 2,
        TabWidth: 8,
        UseTab: 'Never',
        BreakBeforeBraces: 'Mozilla',
        ColumnLimit: 80
    },
    'WebKit': {
        IndentWidth: 4,
        TabWidth: 4,
        UseTab: 'Never',
        BreakBeforeBraces: 'WebKit',
        ColumnLimit: 0
    }
};

// 判断某个配置项是否应该继承自基础风格
const shouldInheritFromStyle = (key: string, config: Record<string, any>): boolean => {
    const baseStyle = config.BasedOnStyle;
    const currentValue = config[key];

    // 如果用户明确设置了值，则不继承
    if (currentValue !== undefined && currentValue !== null) {
        return false;
    }

    // 如果没有基础风格，不继承
    if (!baseStyle || !STYLE_DEFAULTS[baseStyle]) {
        return false;
    }

    // 如果基础风格中有这个配置项的默认值，则应该继承
    return STYLE_DEFAULTS[baseStyle][key] !== undefined;
};

// 获取从基础风格继承的值
const getInheritedValue = (key: string, config: Record<string, any>): any => {
    const baseStyle = config.BasedOnStyle;
    if (baseStyle && STYLE_DEFAULTS[baseStyle]) {
        return STYLE_DEFAULTS[baseStyle][key];
    }
    return undefined;
};

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
            const highlightCodeElement = async () => {
                try {
                    codeRef.current!.removeAttribute('data-highlighted');
                    codeRef.current!.className = 'language-cpp hljs';

                    // 使用异步高亮
                    const highlightedCode = await highlightCode(code, 'cpp');
                    if (codeRef.current) {
                        codeRef.current.innerHTML = highlightedCode;
                    }
                } catch (error) {
                    console.error('Quick setup highlight error:', error);
                    if (codeRef.current) {
                        codeRef.current.textContent = code;
                    }
                }
            };

            highlightCodeElement();
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

export const QuickSetup: React.FC<QuickSetupProps> = ({ config, onChange, onOpenClangFormatFile }) => {
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
    // 生成默认预览代码 - 仅支持 C/C++，考虑继承逻辑
    const generateDefaultPreview = (option: ClangFormatOption) => {
        try {
            const generateCppExample = (key: string) => {
                // 获取实际使用的值（考虑继承）
                const getEffectiveValue = (configKey: string) => {
                    const userValue = config[configKey];
                    if (userValue !== undefined && userValue !== null) {
                        return userValue;
                    }

                    const inheritedValue = getInheritedValue(configKey, config);
                    if (inheritedValue !== undefined) {
                        return inheritedValue;
                    }

                    const configOption = CLANG_FORMAT_OPTIONS.find(opt => opt.key === configKey);
                    return configOption?.defaultValue;
                };

                switch (key) {
                    case 'BasedOnStyle':
                        const styleValue = getEffectiveValue(option.key);
                        return `// Based on ${styleValue} style\nclass Example {\npublic:\n    void method();\n};`;
                    case 'IndentWidth':
                        const indentValue = getEffectiveValue(option.key) || 2;
                        const cppIndent = ' '.repeat(Math.max(1, Math.min(8, indentValue))); // 限制范围 1-8
                        return `if (condition) {\n${cppIndent}doSomething();\n}`;
                    case 'UseTab':
                        const cppUseTab = getEffectiveValue(option.key);
                        const cppTabIndent = cppUseTab === 'Never' ? '    ' : '\t';
                        return `class MyClass {\npublic:\n${cppTabIndent}void method();\n};`;
                    case 'TabWidth':
                        const tabWidth = getEffectiveValue(option.key) || 4;
                        return `function() {\n\treturn value; // Tab width: ${tabWidth}\n}`;
                    case 'ColumnLimit':
                        const limit = Math.max(20, Math.min(200, getEffectiveValue(option.key) || 80)); // 限制范围
                        const longLine = 'void longFunctionNameWithManyParameters(int param1, int param2, int param3);';
                        return longLine.length > limit ? longLine.substring(0, limit - 3) + '...' : longLine;
                    case 'BreakBeforeBraces':
                        const braceStyle = getEffectiveValue(option.key);
                        return braceStyle === 'Attach'
                            ? `if (condition) {\n    statement;\n}`
                            : `if (condition)\n{\n    statement;\n}`;
                    case 'SpaceBeforeParens':
                        const spaceStyle = getEffectiveValue(option.key);
                        return spaceStyle === 'Never'
                            ? `if(condition)\nfor(int i = 0; i < 10; ++i)`
                            : `if (condition)\nfor (int i = 0; i < 10; ++i)`;
                    case 'PointerAlignment':
                        const ptrAlign = getEffectiveValue(option.key);
                        return ptrAlign === 'Left'
                            ? `int* ptr;\nchar* name;`
                            : ptrAlign === 'Right'
                                ? `int *ptr;\nchar *name;`
                                : `int * ptr;\nchar * name;`;
                    case 'AllowShortFunctionsOnASingleLine':
                        const shortFunc = getEffectiveValue(option.key);
                        return shortFunc === 'true' || shortFunc === 'All'
                            ? `void shortFunc() { return; }`
                            : `void shortFunc() {\n    return;\n}`;
                    case 'AllowShortIfStatementsOnASingleLine':
                        const shortIf = getEffectiveValue(option.key);
                        return shortIf === 'true' || shortIf === 'WithoutElse'
                            ? `if (condition) doSomething();`
                            : `if (condition)\n    doSomething();`;
                    case 'AlignTrailingComments':
                        const alignComments = getEffectiveValue(option.key);
                        return alignComments === 'true'
                            ? `int a = 1;     // Comment 1\nint bb = 2;    // Comment 2`
                            : `int a = 1; // Comment 1\nint bb = 2; // Comment 2`;
                    case 'BreakConstructorInitializers':
                        const ctorStyle = getEffectiveValue(option.key);
                        return ctorStyle === 'BeforeColon'
                            ? `Constructor()\n    : member1(value1)\n    , member2(value2) {}`
                            : `Constructor() :\n    member1(value1),\n    member2(value2) {}`;
                    case 'SortIncludes':
                        const sortInc = getEffectiveValue(option.key);
                        return sortInc === 'true'
                            ? `#include <algorithm>\n#include <iostream>\n#include <vector>`
                            : `#include <vector>\n#include <iostream>\n#include <algorithm>`;
                    case 'BinPackArguments':
                        const binPack = getEffectiveValue(option.key);
                        return binPack === 'false'
                            ? `function(\n    arg1,\n    arg2,\n    arg3\n);`
                            : `function(arg1, arg2, arg3);`;
                    case 'SpacesInParentheses':
                        const spacesInParens = getEffectiveValue(option.key);
                        return spacesInParens === 'true'
                            ? `if ( condition )\nfunc( param );`
                            : `if (condition)\nfunc(param);`;
                    case 'SpaceAfterTemplateKeyword':
                        const spaceAfterTemplate = getEffectiveValue(option.key);
                        return spaceAfterTemplate === 'true'
                            ? `template <typename T>\nclass Example {};`
                            : `template<typename T>\nclass Example {};`;
                    case 'FixNamespaceComments':
                        const fixNs = getEffectiveValue(option.key);
                        return fixNs === 'true'
                            ? `namespace Example {\n    void func();\n} // namespace Example`
                            : `namespace Example {\n    void func();\n}`;
                    case 'ReflowComments':
                        const reflow = getEffectiveValue(option.key);
                        return reflow === 'true'
                            ? `// This is a very long comment that will be\n// reflowed to fit within the column limit.`
                            : `// This is a very long comment that will not be reflowed to fit within the column limit.`;
                    case 'AllowShortBlocksOnASingleLine':
                        const shortBlocks = getEffectiveValue(option.key);
                        return shortBlocks === 'true' || shortBlocks === 'Always'
                            ? `if (condition) { doSomething(); }`
                            : `if (condition) {\n    doSomething();\n}`;
                    case 'Cpp11BracedListStyle':
                        const cpp11Braces = getEffectiveValue(option.key);
                        return cpp11Braces === 'true'
                            ? `vector<int> v{1, 2, 3, 4};`
                            : `vector<int> v{ 1, 2, 3, 4 };`;
                    case 'BreakStringLiterals':
                        const breakStrings = getEffectiveValue(option.key);
                        return breakStrings === 'true'
                            ? `const char* longString = "This is a very "\n                        "long string";`
                            : `const char* longString = "This is a very long string";`;
                    case 'ContinuationIndentWidth':
                        const contIndent = getEffectiveValue(option.key) || 4;
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
        const shouldInherit = shouldInheritFromStyle(option.key, config);
        const inheritedValue = getInheritedValue(option.key, config);

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
                const shouldInherit = shouldInheritFromStyle(option.key, config);
                const inheritedValue = getInheritedValue(option.key, config);
                const baseStyle = config.BasedOnStyle || 'LLVM';

                // 生成占位符文本
                const placeholderText = shouldInherit && inheritedValue !== undefined
                    ? `基于 ${baseStyle} 风格 (${inheritedValue})`
                    : `默认: ${option.defaultValue || ''}`;

                // 显示值：如果应该继承则显示空字符串，否则显示实际值
                const displayValue = shouldInherit ? '' : (value !== undefined ? value : '');

                const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const inputValue = e.target.value;

                    // 如果用户清空了输入框，则删除配置项以恢复继承
                    if (inputValue === '') {
                        onChange(option.key, undefined);
                        return;
                    }

                    const numValue = parseInt(inputValue);
                    if (!isNaN(numValue) && numValue >= (option.min || 0) && numValue <= (option.max || 1000)) {
                        onChange(option.key, numValue);
                    }
                };

                return (
                    <div className="quick-config-item">
                        <label className="input-label">
                            {option.name}
                            {shouldInherit && (
                                <span className="inherit-indicator" title={`继承自 ${baseStyle} 风格`}>
                                    🔗
                                </span>
                            )}
                        </label>
                        <input
                            type="number"
                            value={displayValue}
                            min={option.min}
                            max={option.max}
                            disabled={isDisabled}
                            className={`quick-number-input ${isDisabled ? 'disabled' : ''} ${shouldInherit ? 'inheriting' : ''}`}
                            onChange={handleNumberChange}
                            placeholder={placeholderText}
                        />
                        <div className="item-description">
                            {option.description}
                            {shouldInherit && (
                                <div className="inherit-info">
                                    💡 当前继承自 <strong>{baseStyle}</strong> 风格，输入数值可覆盖此设置
                                </div>
                            )}
                        </div>
                        <MicroPreview code={generateDefaultPreview(option)} />
                    </div>
                );

            case 'enum': {
                const isInheriting = shouldInheritFromStyle(option.key, config);
                const inheritedVal = getInheritedValue(option.key, config);
                const baseStyle = config.BasedOnStyle || 'LLVM';

                // 如果用户没有设置值，则显示继承的值或默认值
                const displayValue = value !== undefined ? value : (isInheriting ? inheritedVal : option.defaultValue);

                return (
                    <div className="quick-config-item">
                        <label className="input-label">
                            {option.name}
                            {isInheriting && value === undefined && (
                                <span className="inherit-indicator" title={`继承自 ${baseStyle} 风格`}>
                                    🔗
                                </span>
                            )}
                        </label>
                        <div className="select-wrapper">
                            <select
                                value={displayValue}
                                disabled={isDisabled}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    // 如果选择的值与继承值相同，则发送 undefined 来恢复继承
                                    if (isInheriting && selectedValue === inheritedVal) {
                                        onChange(option.key, undefined);
                                    } else {
                                        onChange(option.key, selectedValue);
                                    }
                                }}
                                className={`quick-select-input ${isDisabled ? 'disabled' : ''} ${isInheriting && value === undefined ? 'inheriting' : ''}`}
                            >
                                {option.enumValues?.map((enumValue: string) => (
                                    <option key={enumValue} value={enumValue}>
                                        {enumValue}
                                        {isInheriting && value === undefined && enumValue === inheritedVal ? ' (继承)' : ''}
                                    </option>
                                ))}
                            </select>
                            <span className="select-arrow">▼</span>
                        </div>
                        <div className="item-description">
                            {option.description}
                            {isInheriting && value === undefined && (
                                <div className="inherit-info">
                                    💡 当前继承自 <strong>{baseStyle}</strong> 风格: <strong>{inheritedVal}</strong>
                                </div>
                            )}
                        </div>
                        <MicroPreview code={generateDefaultPreview(option)} />
                    </div>
                );
            }

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
                <div className="header-content">
                    <div className="header-text">
                        <h3>⚒️ 快速设置</h3>
                        <p>执此数线，织体自成。</p>
                    </div>
                    {onOpenClangFormatFile && (
                        <button
                            className="open-clang-format-btn"
                            onClick={onOpenClangFormatFile}
                            title="打开工作区中的 .clang-format 文件"
                        >
                            Edit as Text
                        </button>
                    )}
                </div>
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
