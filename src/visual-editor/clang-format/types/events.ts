import { WebviewMessage } from '../../../common/types/clang-format-shared';
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
  'editor-fully-ready': [unknown?];
  'retry-editor-creation-requested': [];

  'ensure-config-manager-ready': [];
  'config-change-requested': [{ key: string; value: unknown } | Record<string, unknown>];
  'config-updated-for-preview': [{ newConfig: Record<string, unknown> }];
  'webview-message-received': [WebviewMessage];
  'micro-preview-requested': [{ optionName: string; config: Record<string, unknown>; previewSnippet: string }];
  'macro-preview-requested': [Record<string, unknown>];
  'settings-updated': [Record<string, unknown>];
  'config-option-hover': [Record<string, unknown>];
  'config-option-focus': [Record<string, unknown>];
  'clear-highlights': [Record<string, unknown>?];
}

