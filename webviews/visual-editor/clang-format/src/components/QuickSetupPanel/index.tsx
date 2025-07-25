/**
 * Quick Setup Panel Component - 快速设置面板组件
 * 提供常用配置项的快速设置界面
 */

import React from 'react';
import { ClangFormatOption, QuickSetupPanelProps } from '../../types';
import DynamicMicroPreview from '../DynamicMicroPreview';

// 使用共享的QuickSetupPanelProps类型

// 快速设置的核心配置项
const QUICK_SETUP_OPTIONS = [
    'BasedOnStyle',
    'IndentWidth',
    'UseTab',
    'BreakBeforeBraces',
    'ColumnLimit',
    'PointerAlignment',
    'SpaceBeforeParens',
    'AllowShortFunctionsOnASingleLine'
];

export const QuickSetupPanel: React.FC<QuickSetupPanelProps> = ({
    options,
    currentConfig,
    onConfigChange,
    onPreviewRequest,
    previewResult,
    showGuide = true
}) => {
    // 获取快速设置的选项
    const quickOptions = options.filter(option =>
        QUICK_SETUP_OPTIONS.includes(option.key)
    );

    // 渲染配置选项的输入控件
    const renderConfigInput = (option: ClangFormatOption) => {
        const currentValue = currentConfig[option.key] ?? option.defaultValue;

        switch (option.type) {
            case 'boolean':
                return (
                    <label className="quick-checkbox-label">
                        <input
                            type="checkbox"
                            checked={currentValue}
                            onChange={(e) => onConfigChange(option.key, e.target.checked)}
                        />
                        <span className="quick-checkbox-custom"></span>
                        <span className="checkbox-text">{currentValue ? 'true' : 'false'}</span>
                    </label>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        className="quick-number-input"
                        value={currentValue}
                        min={option.min}
                        max={option.max}
                        onChange={(e) => onConfigChange(option.key, parseInt(e.target.value) || 0)}
                    />
                );

            case 'enum':
                return (
                    <select
                        className="quick-select-input"
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
                        className="quick-text-input"
                        value={currentValue}
                        onChange={(e) => onConfigChange(option.key, e.target.value)}
                    />
                );
        }
    };

    return (
        <div className="quick-setup-panel">
            <div className="quick-setup-header">
                <h3>快速设置</h3>
                <p>配置最常用的 clang-format 选项</p>
            </div>

            <div className="quick-setup-grid">
                {quickOptions.map(option => (
                    <div key={option.key} className="quick-config-item">
                        <div className="quick-option-header">
                            <div className="quick-option-label">
                                <span className="option-name">{option.name}</span>
                                <span className="option-type-badge">{option.type}</span>
                            </div>
                            <div className="quick-option-value">
                                {renderConfigInput(option)}
                            </div>
                        </div>

                        <div className="quick-option-description">
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
