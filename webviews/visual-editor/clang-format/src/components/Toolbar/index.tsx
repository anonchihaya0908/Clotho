/**
 * Toolbar Component for Clang-Format Editor
 */

import React from 'react';

export interface ToolbarProps {
    onAction: (action: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAction }) => {
    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button
                    className="toolbar-button"
                    onClick={() => onAction('load')}
                    title="Load workspace configuration"
                >
                    📁 Load
                </button>
                <button
                    className="toolbar-button"
                    onClick={() => onAction('save')}
                    title="Save to workspace"
                >
                    💾 Save
                </button>
            </div>

            <div className="toolbar-group">
                <button
                    className="toolbar-button"
                    onClick={() => onAction('import')}
                    title="Import configuration file"
                >
                    📥 Import
                </button>
                <button
                    className="toolbar-button"
                    onClick={() => onAction('export')}
                    title="Export configuration file"
                >
                    📤 Export
                </button>
            </div>

            <div className="toolbar-group">
                <button
                    className="toolbar-button"
                    onClick={() => onAction('validate')}
                    title="Validate current configuration"
                >
                    ✓ Validate
                </button>
                <button
                    className="toolbar-button reset"
                    onClick={() => onAction('reset')}
                    title="Reset to default configuration"
                >
                    🔄 Reset
                </button>
            </div>
        </div>
    );
};
