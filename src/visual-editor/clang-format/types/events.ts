import { WebviewMessage, GetOptionsByCategoryRequest, SearchOptionsRequest, ConfigValue, ClangFormatConfig } from '../../../common/types/clang-format-shared';
import { EditorOpenSource } from '../../../common/types';

// Visual Editor Event Map with typed payload tuples
export interface VisualEditorEventMap extends Record<string, readonly unknown[]> {
  'create-editor-requested': [EditorOpenSource];
  'post-message-to-webview': [WebviewMessage];
  'open-preview-requested': [{ source: string; forceReopen?: boolean }];
  'preview-opened': [];
  'preview-closed': [];
  'preview-hidden-by-visibility': [];
  'editor-visibility-changed': [{ isVisible: boolean }];
  'editor-closed': [];
  'editor-fully-ready': [];
  'retry-editor-creation-requested': [];

  'ensure-config-manager-ready': [];
  // Config change always carries explicit key/value
  'config-change-requested': [{ key: string; value: ConfigValue }];
  'config-updated-for-preview': [{ newConfig: ClangFormatConfig }];
  'webview-message-received': [WebviewMessage];
  'micro-preview-requested': [{ optionName: string; config: ClangFormatConfig; previewSnippet: string }];
  'macro-preview-requested': [{ source: 'demoSnippet'|'activeFile'; code?: string }];
  'settings-updated': [{ showGuideButton?: boolean }];
  'config-option-hover': [{ key: string }];
  'config-option-focus': [{ key: string }];
  'clear-highlights': [];
  'get-options-by-category': [GetOptionsByCategoryRequest];
  'search-options': [SearchOptionsRequest];
  'get-all-options': [];

  // Config action requests from UI
  'load-workspace-config-requested': [];
  'save-config-requested': [];
  'import-config-requested': [];
  'export-config-requested': [];
  'reset-config-requested': [];
  'open-clang-format-file-requested': [];
}
