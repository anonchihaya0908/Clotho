/**
 * Resizable Splitter Component
 * 用于在左右面板之间添加可拖拽的分割条
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface ResizableSplitterProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    initialLeftWidth?: number; // 百分比，默认50%
    minLeftWidth?: number; // 百分比，默认20%
    maxLeftWidth?: number; // 百分比，默认80%
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
    leftPanel,
    rightPanel,
    initialLeftWidth = 50,
    minLeftWidth = 20,
    maxLeftWidth = 80
}) => {
    const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 处理鼠标按下事件
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    // 处理鼠标移动事件
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;

        // 限制在最小值和最大值之间
        const clampedPercentage = Math.min(Math.max(percentage, minLeftWidth), maxLeftWidth);
        setLeftWidth(clampedPercentage);
    }, [isDragging, minLeftWidth, maxLeftWidth]);

    // 处理鼠标释放事件
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // 添加全局鼠标事件监听
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div ref={containerRef} className="resizable-container">
            <div
                className="resizable-left-panel"
                style={{ width: `${leftWidth}%` }}
            >
                {leftPanel}
            </div>

            <div
                className={`resizable-splitter ${isDragging ? 'dragging' : ''}`}
                onMouseDown={handleMouseDown}
            >
                <div className="splitter-handle"></div>
            </div>

            <div
                className="resizable-right-panel"
                style={{ width: `${100 - leftWidth}%` }}
            >
                {rightPanel}
            </div>
        </div>
    );
};
