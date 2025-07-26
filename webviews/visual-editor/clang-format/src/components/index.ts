/**
 * Components Index - 组件导出索引
 * 
 * 这个文件提供了所有组件的统一导出入口，
 * 使得从外部导入组件更加方便和整洁。
 */

// 主要组件
export { ConfigPanel } from './ConfigPanel';
export { PreviewPanel } from './PreviewPanel';
export { Toolbar } from './Toolbar';
export { StatusBar } from './StatusBar';
export { ResizableSplitter } from './ResizableSplitter';

// 配置相关组件
export { ConfigModeSelector } from './ConfigModeSelector';
export type { ConfigMode } from './ConfigModeSelector';
export { QuickSetup } from './QuickSetup';
export { QuickSetupPanel } from './QuickSetupPanel';
export { SearchConfig } from './SearchConfig';
export { MainConfigInterface } from './MainConfigInterface';

// 预览相关组件
export { default as DynamicMicroPreview } from './DynamicMicroPreview';

// 错误处理组件
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
