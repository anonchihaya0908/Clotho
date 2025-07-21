/**
 * Configuration Panel Component
 */

import React, { useState, useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import { ConfigModeSelector, ConfigMode } from './ConfigModeSelector';
import { QuickSetup } from './QuickSetup';
import { SearchConfig } from './SearchConfig';
import { CLANG_FORMAT_OPTIONS, CLANG_FORMAT_CATEGORIES, ClangFormatOption, getOptionsByCategory } from '../data/clangFormatOptions';
import './ConfigPanel.css';

// 确保 C++ 语言已注册
if (!hljs.getLanguage('cpp')) {
    hljs.registerLanguage('cpp', cpp);
}

// 微观预览组件
const MicroPreview: React.FC<{ code: string }> = ({ code }) => {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            if (code) {
                try {
                    // 强制清除之前的内容和属性
                    codeRef.current.removeAttribute('data-highlighted');
                    codeRef.current.className = 'language-cpp hljs';

                    // 使用 highlight.js 高亮代码
                    const result = hljs.highlight(code, {
                        language: 'cpp',
                        ignoreIllegals: true
                    });

                    // 设置高亮后的 HTML
                    codeRef.current.innerHTML = result.value;

                    console.log('Micro preview highlight applied successfully');
                } catch (error) {
                    console.error('Micro preview highlight error:', error);
                    // 降级到普通文本
                    codeRef.current.textContent = code;
                }
            } else {
                codeRef.current.innerHTML = '';
            }
        }
    }, [code]);

    return (
        <div className="micro-preview">
            <h4>Preview:</h4>
            <pre className="micro-code-preview">
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

export interface ConfigPanelProps {
    microPreviews: Record<string, string>;
    settings: { showGuideButton: boolean };
    onConfigChange: (key: string, value: any) => void;
    onSettingsChange: (setting: string, value: any) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    microPreviews,
    settings,
    onConfigChange,
    onSettingsChange
}) => {
    const [configMode, setConfigMode] = useState<ConfigMode>('quick');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>(CLANG_FORMAT_CATEGORIES[0] || '');
    const [currentConfig, setCurrentConfig] = useState<Record<string, any>>({});

    // 内部配置变更处理器
    const handleConfigChange = (key: string, value: any) => {
        setCurrentConfig(prev => ({ ...prev, [key]: value }));
        onConfigChange(key, value);
    };

    // 根据模式渲染不同的内容
    const renderConfigContent = () => {
        switch (configMode) {
            case 'quick':
                return (
                    <QuickSetup
                        config={currentConfig}
                        onChange={handleConfigChange}
                    />
                );

            case 'search':
                return (
                    <SearchConfig
                        options={CLANG_FORMAT_OPTIONS}
                        searchQuery={searchQuery}
                        config={currentConfig}
                        onChange={handleConfigChange}
                    />
                );

            case 'full':
            default:
                return renderFullConfiguration();
        }
    };

    // 完整配置模式的渲染函数
    const renderFullConfiguration = () => {
        const filteredOptions = getOptionsByCategory(selectedCategory);

        return (
            <div className="full-configuration">
                <div className="full-config-header">
                    <h3>⚙️ 完整配置</h3>
                    <p>所有可用的 clang-format 配置选项</p>

                    {/* 设置面板 */}
                    <div className="config-settings">
                        <label className="guide-toggle">
                            <input
                                type="checkbox"
                                checked={settings.showGuideButton}
                                onChange={(e) => onSettingsChange('showGuideButton', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">显示引导按钮</span>
                        </label>
                    </div>
                </div>

                {/* 类别选择器 */}
                <div className="category-selector">
                    <div className="category-tabs">
                        {CLANG_FORMAT_CATEGORIES.map((category: string) => (
                            <button
                                key={category}
                                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category)}
                                title={`切换到 ${category} 配置`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 配置选项列表 */}
                <div className="config-options-list">
                    {filteredOptions.map((option: ClangFormatOption) => (
                        <div key={option.key} className="config-option">
                            <div className="option-header">
                                <label className="option-label">
                                    {option.key}
                                    {option.type && <span className="option-type">({option.type})</span>}
                                </label>
                                <div className="option-value">
                                    {renderOptionInput(option)}
                                </div>
                            </div>

                            {option.description && (
                                <div className="option-description">
                                    {option.description}
                                </div>
                            )}

                            {/* 微观预览 - 默认显示 */}
                            <MicroPreview
                                code={microPreviews[option.key] || generateDefaultPreview(option)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // 渲染选项输入控件
    const renderOptionInput = (option: ClangFormatOption) => {
        const value = currentConfig[option.key];

        switch (option.type) {
            case 'boolean':
                return (
                    <label className="full-checkbox-label">
                        <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => handleConfigChange(option.key, e.target.checked)}
                        />
                        <span className="full-checkbox-custom"></span>
                        <span className="checkbox-text">{value ? '启用' : '禁用'}</span>
                    </label>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={value || ''}
                        onChange={(e) => handleConfigChange(option.key, parseInt(e.target.value) || 0)}
                        className="full-number-input"
                        min={option.min}
                        max={option.max}
                        placeholder={option.defaultValue?.toString() || ''}
                    />
                );

            case 'string':
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleConfigChange(option.key, e.target.value)}
                        className="full-text-input"
                        placeholder={option.defaultValue?.toString() || "输入值..."}
                    />
                );

            case 'enum':
                return (
                    <select
                        value={value !== undefined ? value : (option.defaultValue || '')}
                        onChange={(e) => handleConfigChange(option.key, e.target.value)}
                        className="full-select-input"
                    >
                        {option.enumValues?.map((enumValue: string) => (
                            <option key={enumValue} value={enumValue}>
                                {enumValue}
                            </option>
                        ))}
                    </select>
                );

            default:
                return <span className="unknown-input">未知类型</span>;
        }
    };

    const generateDefaultPreview = (option: ClangFormatOption) => {
        // 获取当前选择的语言
        const currentLanguage = currentConfig['Language'] || 'Cpp';

        // 根据语言和选项生成示例代码
        const generateLanguageSpecificExample = (baseKey: string) => {
            switch (currentLanguage) {
                case 'CSharp':
                    switch (baseKey) {
                        case 'AlignAfterOpenBracket':
                            return `Method(argument1, argument2, argument3);`;
                        case 'AlignConsecutiveAssignments':
                            return `int a   = 1;\nint bb  = 2;\nint ccc = 3;`;
                        case 'IndentWidth':
                            return `if (condition)\n{\n    DoSomething();\n    if (nested)\n    {\n        DoMore();\n    }\n}`;
                        case 'BreakBeforeBraces':
                            return `if (condition)\n{\n    statement;\n}`;
                        case 'SpaceBeforeParens':
                            return `if (condition)\nfor (int i = 0; i < 10; ++i)\nMethodCall();`;
                        default:
                            return `// ${option.key} formatting example\nclass Example\n{\n    public void Method()\n    {\n    }\n}`;
                    }

                case 'Java':
                    switch (baseKey) {
                        case 'AlignAfterOpenBracket':
                            return `method(argument1, argument2, argument3);`;
                        case 'AlignConsecutiveAssignments':
                            return `int a   = 1;\nint bb  = 2;\nint ccc = 3;`;
                        case 'IndentWidth':
                            return `if (condition) {\n    doSomething();\n    if (nested) {\n        doMore();\n    }\n}`;
                        case 'BreakBeforeBraces':
                            return `if (condition) {\n    statement;\n}`;
                        case 'SpaceBeforeParens':
                            return `if (condition)\nfor (int i = 0; i < 10; ++i)\nmethodCall();`;
                        default:
                            return `// ${option.key} formatting example\nclass Example {\n    public void method() {\n    }\n}`;
                    }

                case 'JavaScript':
                    switch (baseKey) {
                        case 'AlignAfterOpenBracket':
                            return `function(argument1, argument2, argument3);`;
                        case 'AlignConsecutiveAssignments':
                            return `let a   = 1;\nlet bb  = 2;\nlet ccc = 3;`;
                        case 'IndentWidth':
                            return `if (condition) {\n    doSomething();\n    if (nested) {\n        doMore();\n    }\n}`;
                        case 'BreakBeforeBraces':
                            return `if (condition) {\n    statement;\n}`;
                        case 'SpaceBeforeParens':
                            return `if (condition)\nfor (let i = 0; i < 10; ++i)\nfunctionCall();`;
                        default:
                            return `// ${option.key} formatting example\nclass Example {\n    method() {\n    }\n}`;
                    }

                case 'Json':
                    return `{\n  "key": "value",\n  "array": [\n    1,\n    2,\n    3\n  ]\n}`;

                case 'Objective-C':
                    switch (baseKey) {
                        case 'AlignAfterOpenBracket':
                            return `[object method:argument1 withParameter:argument2];`;
                        case 'IndentWidth':
                            return `if (condition) {\n    [self doSomething];\n    if (nested) {\n        [self doMore];\n    }\n}`;
                        case 'BreakBeforeBraces':
                            return `if (condition)\n{\n    statement;\n}`;
                        default:
                            return `// ${option.key} formatting example\n@interface Example : NSObject\n- (void)method;\n@end`;
                    }

                default: // Cpp
                    switch (baseKey) {
                        case 'AlignAfterOpenBracket':
                            return `function(argument1, argument2, argument3);`;
                        case 'AlignConsecutiveAssignments':
                            return `int a   = 1;\nint bb  = 2;\nint ccc = 3;`;
                        case 'AlignConsecutiveDeclarations':
                            return `int    a;\ndouble bb;\nchar  *ccc;`;
                        case 'AlignConsecutiveMacros':
                            return `#define SHORT_NAME       42\n#define LONGER_NAME      3.14\n#define VERY_LONG_NAME   "string"`;
                        case 'IndentWidth':
                            return `if (condition) {\n    doSomething();\n    if (nested) {\n        doMore();\n    }\n}`;
                        case 'TabWidth':
                            return `function() {\n\treturn value;\n}`;
                        case 'UseTab':
                            return `class MyClass {\npublic:\n\tvoid method();\n};`;
                        case 'ColumnLimit':
                            return `void longFunctionNameWithManyParameters(int param1, int param2, int param3, int param4);`;
                        case 'BreakBeforeBraces':
                            return `if (condition)\n{\n    statement;\n}`;
                        case 'SpaceBeforeParens':
                            return `if (condition)\nfor (int i = 0; i < 10; ++i)\nfunctionCall();`;
                        default:
                            return `// ${option.key} formatting example\nclass Example {\npublic:\n    void method();\n};`;
                    }
            }
        };

        return generateLanguageSpecificExample(option.key);
    };

    return (
        <div className="config-panel">
            <ConfigModeSelector
                mode={configMode}
                onModeChange={setConfigMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            <div className="config-content">
                {renderConfigContent()}
            </div>
        </div>
    );
};
