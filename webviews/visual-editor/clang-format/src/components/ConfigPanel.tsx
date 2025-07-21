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
        if (codeRef.current && code) {
            // 清除之前的高亮
            codeRef.current.removeAttribute('data-highlighted');
            codeRef.current.textContent = code;

            try {
                // 应用 C++ 语法高亮
                hljs.highlightElement(codeRef.current);
                console.log('Highlight.js applied to micro preview:', codeRef.current.classList);
            } catch (error) {
                console.error('Highlight.js error in micro preview:', error);
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
                    {code}
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
                            <option key={val} value={val}>{val}</option>
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
