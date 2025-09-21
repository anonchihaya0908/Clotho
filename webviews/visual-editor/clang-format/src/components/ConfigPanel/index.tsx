/**
 * Config Panel Component - 配置面板主组件
 */

import React, { useState, memo } from 'react';
import { ConfigModeSelector, ConfigMode } from '../ConfigModeSelector';
import { QuickSetup } from '../QuickSetup';
import { SearchConfig } from '../SearchConfig';
import DynamicMicroPreview from '../DynamicMicroPreview';
import { ClangFormatOption, ConfigPanelProps } from '../../types';
import './style.css';

// 使用共享的ConfigPanelProps类型

const ConfigPanelComponent: React.FC<ConfigPanelProps> = ({
    options,
    categories,
    microPreviews,
    settings,
    onConfigChange,
    onSettingsChange,
    onPreviewRequest,
    onOpenClangFormatFile,
    dynamicPreviewResult,
    currentConfig,
    onConfigOptionHover,
    onConfigOptionFocus,
    onClearHighlights,
    isConfigReset = false
}) => {
    const [mode, setMode] = useState<ConfigMode>('quick');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categories[0] || '基础设置');

    // 过滤选项
    const filteredOptions = React.useMemo(() => {
        if (mode === 'search' && searchQuery) {
            return options.filter(option =>
                option.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                option.name.includes(searchQuery) ||
                option.description.includes(searchQuery) ||
                option.category.includes(searchQuery)
            );
        }
        if (mode === 'full') {
            return options.filter(option => option.category === selectedCategory);
        }
        // 快速模式显示最常用的选项 - 从完整的选项列表中选择
        if (mode === 'quick') {
            const quickOptionKeys = ['IndentWidth', 'UseTab', 'BreakBeforeBraces', 'ColumnLimit', 'BasedOnStyle', 'PointerAlignment'];
            return options.filter(option =>
                quickOptionKeys.includes(option.key)
            );
        }
        return options;
    }, [mode, searchQuery, selectedCategory, options]);

    // 渲染配置选项
    const renderConfigOption = (option: ClangFormatOption) => {
        const currentValue = currentConfig[option.key] ?? option.defaultValue;

        return (
            <div
                key={option.key}
                className="config-option"
                onMouseEnter={() => onConfigOptionHover?.(option.key)}
                onMouseLeave={() => onClearHighlights?.()}
                onFocus={() => onConfigOptionFocus?.(option.key)}
                tabIndex={0} // 使div可以获得焦点
            >
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

                {/* 预览始终显示 */}
                {option.previewTemplate ? (
                    <DynamicMicroPreview
                        option={option}
                        currentConfig={currentConfig}
                        onPreviewRequest={onPreviewRequest}
                        previewResult={
                            dynamicPreviewResult?.optionName === option.key
                                ? dynamicPreviewResult
                                : undefined
                        }
                        isConfigReset={isConfigReset}
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

                <div className="config-controls-wrapper">
                    <div className="category-selector">
                        <div className="category-tabs">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 预览切换按钮已移除，预览始终显示 */}
                </div>
            </div>

            <div className="config-options-list">
                {filteredOptions.map(renderConfigOption)}
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
                        options={options}
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

// 自定义比较函数，优化渲染性能
const arePropsEqual = (prevProps: ConfigPanelProps, nextProps: ConfigPanelProps): boolean => {
    // 比较基本属性
    if (
        prevProps.categories.length !== nextProps.categories.length ||
        prevProps.options.length !== nextProps.options.length ||
        prevProps.isConfigReset !== nextProps.isConfigReset
    ) {
        return false;
    }

    // 比较配置对象
    const prevConfigKeys = Object.keys(prevProps.currentConfig);
    const nextConfigKeys = Object.keys(nextProps.currentConfig);

    if (prevConfigKeys.length !== nextConfigKeys.length) {
        return false;
    }

    for (const key of prevConfigKeys) {
        if (prevProps.currentConfig[key] !== nextProps.currentConfig[key]) {
            return false;
        }
    }

    // 比较设置对象
    if (prevProps.settings.showGuideButton !== nextProps.settings.showGuideButton) {
        return false;
    }

    // 比较动态预览结果
    if (prevProps.dynamicPreviewResult?.optionName !== nextProps.dynamicPreviewResult?.optionName ||
        prevProps.dynamicPreviewResult?.success !== nextProps.dynamicPreviewResult?.success) {
        return false;
    }

    return true;
};

// 使用 memo 包装组件
export const ConfigPanel = memo(ConfigPanelComponent, arePropsEqual);
