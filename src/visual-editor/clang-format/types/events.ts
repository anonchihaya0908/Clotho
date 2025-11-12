import { WebviewMessage, GetOptionsByCategoryRequest, SearchOptionsRequest, ConfigValue } from '../../../common/types/clang-format-shared';
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
  'config-updated-for-preview': [{ newConfig: Record<string, unknown> }];
  'webview-message-received': [WebviewMessage];
  'micro-preview-requested': [{ optionName: string; config: Record<string, unknown>; previewSnippet: string }];
  'macro-preview-requested': [Record<string, unknown>];
  'settings-updated': [Record<string, unknown>];
  'config-option-hover': [Record<string, unknown>];
  'config-option-focus': [Record<string, unknown>];
  'clear-highlights': [Record<string, unknown>?];
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
