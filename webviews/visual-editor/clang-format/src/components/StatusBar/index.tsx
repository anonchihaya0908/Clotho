/**
 * Status Bar Component
 */

import React from 'react';

export interface StatusBarProps {
    validationState: {
        isValid: boolean;
        error?: string;
        warnings?: string[];
    };
    configCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    validationState,
    configCount
}) => {
    return (
        <div className="status-bar">
            <div className="status-left">
                <span className="config-count">
                    {configCount} configuration options
                </span>
            </div>

            <div className="status-right">
                {validationState.error && (
                    <span className="error-message">
                        ⚠ {validationState.error}
                    </span>
                )}

                {validationState.warnings && validationState.warnings.length > 0 && (
                    <span className="warning-message">
                        ⚠ {validationState.warnings.length} warnings
                    </span>
                )}
            </div>
        </div>
    );
};
