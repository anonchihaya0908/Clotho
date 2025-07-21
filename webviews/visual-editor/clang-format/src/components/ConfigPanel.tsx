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
    onConfigChange: (key: string, value: any) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    options,
    categories,
    currentConfig,
    microPreviews,
    onConfigChange
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');
    const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

    const filteredOptions = options.filter(option =>
        option.category === selectedCategory
    );

    const toggleOptionExpansion = (key: string) => {
        const newExpanded = new Set(expandedOptions);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedOptions(newExpanded);
    };

    const renderConfigControl = (option: any) => {
        const value = currentConfig[option.key];
        const preview = microPreviews[option.key];
        const isExpanded = expandedOptions.has(option.key);

        return (
            <div key={option.key} className="config-option">
                <div className="option-header" onClick={() => toggleOptionExpansion(option.key)}>
                    <div className="option-title">
                        <span className="option-name">{option.name}</span>
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                    <div className="option-control">
                        {renderControl(option, value)}
                    </div>
                </div>

                {isExpanded && (
                    <div className="option-details">
                        <p className="option-description">{option.description}</p>
                        {preview && (
                            <MicroPreview code={preview} />
                        )}
                    </div>
                )}
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
                {filteredOptions.map(renderConfigControl)}
            </div>
        </div>
    );
};
