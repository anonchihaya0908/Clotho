/**
 * Configuration Panel Component
 */

import React, { useState, useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';

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
    options: any[];
    categories: string[];
    currentConfig: Record<string, any>;
    microPreviews: Record<string, string>;
    settings: { showGuideButton: boolean };
    onConfigChange: (key: string, value: any) => void;
    onSettingsChange: (setting: string, value: any) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    options,
    categories,
    currentConfig,
    microPreviews,
    settings,
    onConfigChange,
    onSettingsChange
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');

    const filteredOptions = options.filter(option =>
        option.category === selectedCategory
    );

    const generateDefaultPreview = (option: any) => {
        // 根据选项类型生成相应的示例代码
        switch (option.key) {
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
                return `// ${option.name} formatting example\nclass Example {\npublic:\n    void method();\n};`;
        }
    };

    const renderConfigControl = (option: any) => {
        const value = currentConfig[option.key];
        const preview = microPreviews[option.key] || generateDefaultPreview(option);

        return (
            <div key={option.key} className="config-option">
                <div className="option-header">
                    <div className="option-title">
                        <span className="option-name">{option.name}</span>
                    </div>
                    <div className="option-control">
                        {renderControl(option, value)}
                    </div>
                </div>

                <div className="option-details">
                    <p className="option-description">{option.description}</p>
                    <MicroPreview code={preview} />
                </div>
            </div>
        );
    };

    const renderControl = (option: any, value: any) => {
        switch (option.type) {
            case 'boolean':
                return (
                    <input
                        type="checkbox"
                        checked={value || false}
                        onChange={(e) => onConfigChange(option.key, e.target.checked)}
                    />
                );

            case 'integer':
                return (
                    <input
                        type="number"
                        value={value || 0}
                        onChange={(e) => onConfigChange(option.key, parseInt(e.target.value, 10))}
                    />
                );

            case 'string':
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onConfigChange(option.key, e.target.value)}
                    />
                );

            case 'enum':
                return (
                    <select
                        value={value || option.defaultValue}
                        onChange={(e) => onConfigChange(option.key, e.target.value)}
                    >
                        {option.possibleValues?.map((val: string) => (
                            <option key={val} value={val}>
                                {val === 'inherit' ? '← Inherit from BasedOnStyle' : val}
                            </option>
                        ))}
                    </select>
                );

            default:
                return <span>Unknown type: {option.type}</span>;
        }
    };

    return (
        <div className="config-panel">
            <div className="category-tabs">
                {categories.map(category => (
                    <button
                        key={category}
                        className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="config-options">
                {/* 在 General 分类中渲染设置选项 */}
                {selectedCategory === 'General' && (
                    <div className="settings-section">
                        <h3 className="settings-title">Editor Settings</h3>
                        <div className="config-option">
                            <div className="option-header">
                                <div className="option-title">
                                    <span className="option-name">CodeLens Guide</span>
                                </div>
                                <div className="option-control">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.showGuideButton}
                                            onChange={(e) => onSettingsChange('showGuideButton', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div className="option-details">
                                <p className="option-description">
                                    Show the "Visual Editor" and "Reference" links at the top of .clang-format files.
                                </p>
                            </div>
                        </div>
                        <hr className="settings-separator" />
                    </div>
                )}
                {filteredOptions.map(renderConfigControl)}
            </div>
        </div>
    );
};
