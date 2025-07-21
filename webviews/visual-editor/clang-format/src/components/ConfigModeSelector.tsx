import React from 'react';
import './ConfigModeSelector.css';

export type ConfigMode = 'quick' | 'full' | 'search';

interface ConfigModeSelectorProps {
    mode: ConfigMode;
    onModeChange: (mode: ConfigMode) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export const ConfigModeSelector: React.FC<ConfigModeSelectorProps> = ({
    mode,
    onModeChange,
    searchQuery,
    onSearchChange
}) => {
    return (
        <div className="config-mode-selector">
            <div className="mode-tabs">
                <button
                    className={`mode-tab ${mode === 'quick' ? 'active' : ''}`}
                    onClick={() => onModeChange('quick')}
                    title="快速设置 - 常用配置选项"
                >
                    <span className="tab-icon">⚡</span>
                    快速设置
                </button>

                <button
                    className={`mode-tab ${mode === 'full' ? 'active' : ''}`}
                    onClick={() => onModeChange('full')}
                    title="完整配置 - 所有配置选项"
                >
                    <span className="tab-icon">⚙️</span>
                    完整配置
                </button>

                <button
                    className={`mode-tab ${mode === 'search' ? 'active' : ''}`}
                    onClick={() => onModeChange('search')}
                    title="搜索配置 - 快速查找特定选项"
                >
                    <span className="tab-icon">🔍</span>
                    搜索配置
                </button>
            </div>

            {mode === 'search' && (
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="搜索配置选项... (支持英文和中文)"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        autoFocus
                    />
                    <div className="search-tips">
                        <span>💡 提示: 可以搜索 "缩进"、"indent"、"大括号"、"brace" 等关键词</span>
                    </div>
                </div>
            )}
        </div>
    );
};
