import React from 'react';
import './style.css';

interface PreviewPlaceholderProps {
    onReopenPreview: () => void;
}

export const PreviewPlaceholder: React.FC<PreviewPlaceholderProps> = ({ onReopenPreview }) => {
    return (
        <div className="preview-placeholder">
            <div className="placeholder-content">
                <div className="placeholder-icon">📝</div>
                <h3>预览编辑器已关闭</h3>
                <p>您可以自由打开您的文件进行格式预览</p>
                <p>或者点击下面的按钮重新打开预览编辑器</p>
                <button
                    className="reopen-preview-button"
                    onClick={onReopenPreview}
                >
                    重新打开预览编辑器
                </button>
                <div className="placeholder-tips">
                    <p>💡 提示：</p>
                    <ul>
                        <li>预览编辑器会实时显示格式化效果</li>
                        <li>配置更改会立即应用到预览中</li>
                        <li>您可以随时关闭或重新打开预览编辑器</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
