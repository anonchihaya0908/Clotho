/**
 * Main Config Interface Component - 主配置界面组件
 * 这个组件是整个配置面板的主界面，集成了各种配置模式
 */

import React, { useState, useMemo } from 'react';
import { ClangFormatOption, getOptionsByCategory } from '../../types';
import DynamicMicroPreview from '../DynamicMicroPreview';

interface MainConfigInterfaceProps {
    options: ClangFormatOption[];
    categories: string[];
    currentConfig: Record<string, any>;
    onConfigChange: (key: string, value: any) => void;
    onPreviewRequest?: (optionName: string, config: Record<string, any>, previewSnippet: string) => void;
    previewResult?: {
        optionName: string;
        formattedCode: string;
        success: boolean;
        error?: string;
    };
    showGuide?: boolean;
    selectedCategory?: string;
}

export const MainConfigInterface: React.FC<MainConfigInterfaceProps> = ({
    options,
    categories,
    currentConfig,
    onConfigChange,
    onPreviewRequest,
    previewResult,
    showGuide = true,
    selectedCategory = '基础设置'
}) => {
    // 获取当前分类的选项
    const categoryOptions = useMemo(() => {
        return options.filter(option => option.category === selectedCategory);
    }, [selectedCategory, options]);

    // 渲染配置选项的输入控件
    const renderConfigInput = (option: ClangFormatOption) => {
        const currentValue = currentConfig[option.key] ?? option.defaultValue;

        switch (option.type) {
            case 'boolean':
                return (
                    <label className="full-checkbox-label">
                        <input
                            type="checkbox"
                            checked={currentValue}
                            onChange={(e) => onConfigChange(option.key, e.target.checked)}
                        />
                        <span className="full-checkbox-custom"></span>
                        <span className="checkbox-text">{currentValue ? 'true' : 'false'}</span>
                    </label>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        className="full-number-input"
                        value={currentValue}
                        min={option.min}
                        max={option.max}
                        onChange={(e) => onConfigChange(option.key, parseInt(e.target.value) || 0)}
                    />
                );

            case 'enum':
                return (
                    <select
                        className="full-select-input"
                        value={currentValue}
                        onChange={(e) => onConfigChange(option.key, e.target.value)}
                    >
                        {option.enumValues?.map((enumValue: string) => (
                            <option key={enumValue} value={enumValue}>
                                {enumValue}
                            </option>
                        ))}
                    </select>
                );

            case 'string':
            default:
                return (
                    <input
                        type="text"
                        className="full-text-input"
                        value={currentValue}
                        onChange={(e) => onConfigChange(option.key, e.target.value)}
                    />
                );
        }
    };

    return (
        <div className="main-config-interface">
            <div className="config-options-list">
                {categoryOptions.map(option => (
                    <div key={option.key} className="config-option">
                        <div className="option-header">
                            <div className="option-label">
                                {option.name}
                                <span className="option-type">{option.type}</span>
                            </div>
                            <div className="option-value">
                                {renderConfigInput(option)}
                            </div>
                        </div>

                        <div className="option-description">
                            {option.description}
                        </div>

                        {/* 预览始终显示 */}
                        {option.previewTemplate && onPreviewRequest && (
                            <DynamicMicroPreview
                                option={option}
                                currentConfig={currentConfig}
                                onPreviewRequest={onPreviewRequest}
                                previewResult={
                                    previewResult?.optionName === option.key
                                        ? previewResult
                                        : undefined
                                }
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
