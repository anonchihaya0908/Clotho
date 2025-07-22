/**
 * Config Panel Component - 配置面板主组件
 */

import React, { useState } from 'react';
import { ConfigModeSelector, ConfigMode } from '../ConfigModeSelector';
import { QuickSetup } from '../QuickSetup';
import { SearchConfig } from '../SearchConfig';
import DynamicMicroPreview from '../DynamicMicroPreview';
import { CLANG_FORMAT_OPTIONS, ClangFormatOption } from '../../data/clangFormatOptions';
import './style.css';

export interface ConfigPanelProps {
    microPreviews: Record<string, string>;
    settings: {
        showGuideButton: boolean;
    };
    onConfigChange: (key: string, value: any) => void;
    onSettingsChange: (setting: string, value: any) => void;
    onPreviewRequest: (optionName: string, config: Record<string, any>, previewSnippet: string) => void;
    onOpenClangFormatFile?: () => void;
    dynamicPreviewResult?: {
        optionName: string;
        formattedCode: string;
        success: boolean;
        error?: string;
    };
    currentConfig: Record<string, any>;
}

// 获取分类列表
const categories = [...new Set(CLANG_FORMAT_OPTIONS.map(option => option.category))];

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    microPreviews,
    settings,
    onConfigChange,
    onSettingsChange,
    onPreviewRequest,
    onOpenClangFormatFile,
    dynamicPreviewResult,
    currentConfig
}) => {
    const [mode, setMode] = useState<ConfigMode>('quick');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categories[0] || '基础设置');

    // 过滤选项
    const filteredOptions = React.useMemo(() => {
        if (mode === 'search' && searchQuery) {
            return CLANG_FORMAT_OPTIONS.filter(option =>
                option.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                option.name.includes(searchQuery) ||
                option.description.includes(searchQuery) ||
                option.category.includes(searchQuery)
            );
        }
        if (mode === 'full') {
            return CLANG_FORMAT_OPTIONS.filter(option => option.category === selectedCategory);
        }
        // 快速模式显示最常用的选项 - 从完整的选项列表中选择
        if (mode === 'quick') {
            const quickOptionKeys = ['IndentWidth', 'UseTab', 'BreakBeforeBraces', 'ColumnLimit', 'BasedOnStyle', 'PointerAlignment'];
            return CLANG_FORMAT_OPTIONS.filter(option =>
                quickOptionKeys.includes(option.key)
            );
        }
        return CLANG_FORMAT_OPTIONS;
    }, [mode, searchQuery, selectedCategory]);

    // 渲染配置选项
    const renderConfigOption = (option: ClangFormatOption) => {
        const currentValue = currentConfig[option.key] ?? option.defaultValue;

        return (
            <div key={option.key} className="config-option">
                <div className="option-header">
                    <div className="option-label">
                        {option.name}
                        <span className="option-type">{option.type}</span>
                    </div>
                    <div className="option-value">
                        {renderInput(option, currentValue)}
                    </div>
                </div>

                <div className="option-description">
                    {option.description}
                </div>

                {settings.showGuideButton && (
                    option.previewSnippet ? (
                        <DynamicMicroPreview
                            option={option}
                            currentConfig={currentConfig}
                            onPreviewRequest={onPreviewRequest}
                            previewResult={
                                dynamicPreviewResult?.optionName === option.key
                                    ? dynamicPreviewResult
                                    : undefined
                            }
                        />
                    ) : (
                        <div className="micro-preview">
                            <h4>配置预览</h4>
                            <div className="micro-code-preview no-preview">
                                <span className="no-preview-text">
                                    此选项暂无代码预览示例
                                </span>
                            </div>
                        </div>
                    )
                )}
            </div>
        );
    };

    // 渲染输入控件
    const renderInput = (option: ClangFormatOption, value: any) => {
        switch (option.type) {
            case 'boolean':
                return (
                    <label className="full-checkbox-label">
                        <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => onConfigChange(option.key, e.target.checked)}
                        />
                        <span className="full-checkbox-custom"></span>
                        <span className="checkbox-text">{value ? 'true' : 'false'}</span>
                    </label>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        className="full-number-input"
                        value={value}
                        min={option.min}
                        max={option.max}
                        onChange={(e) => onConfigChange(option.key, parseInt(e.target.value) || 0)}
                    />
                );

            case 'enum':
                return (
                    <select
                        className="full-select-input"
                        value={value}
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
                        value={value}
                        onChange={(e) => onConfigChange(option.key, e.target.value)}
                    />
                );
        }
    };

    // 渲染完整配置界面
    const renderFullConfiguration = () => (
        <div className="full-configuration">
            <div className="full-config-header">
                <div className="title-and-description">
                    <h3>完整配置</h3>
                    <p>经纬万千，分毫入缕。</p>
                </div>

                <div className="config-settings">
                    <label className="guide-toggle">
                        <input
                            type="checkbox"
                            checked={settings.showGuideButton}
                            onChange={(e) => onSettingsChange('showGuideButton', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">显示预览</span>
                    </label>
                </div>
            </div>

            <div className="config-options-list">
                {CLANG_FORMAT_OPTIONS.map(renderConfigOption)}
            </div>
        </div>
    );

    return (
        <div className="config-panel">
            <ConfigModeSelector
                mode={mode}
                onModeChange={setMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            <div className="config-content">
                {mode === 'quick' && (
                    <QuickSetup
                        config={currentConfig}
                        onChange={onConfigChange}
                        onOpenClangFormatFile={onOpenClangFormatFile}
                    />
                )}

                {mode === 'full' && renderFullConfiguration()}

                {mode === 'search' && (
                    <SearchConfig
                        options={filteredOptions}
                        searchQuery={searchQuery}
                        config={currentConfig}
                        onChange={onConfigChange}
                    />
                )}
            </div>
        </div>
    );
};
