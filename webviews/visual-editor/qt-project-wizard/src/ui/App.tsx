import React, { useEffect, useState } from 'react';
import type {
  HostMessage,
  QtWizardState,
  QtPrefixCandidate,
  WebviewMessage,
  QtMajorVersion,
  QtProjectType,
} from '../types';

declare const acquireVsCodeApi: () => {
  postMessage(message: WebviewMessage): void;
};

const vscodeApi =
  typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : { postMessage: () => undefined };

export const App: React.FC = () => {
  const [state, setState] = useState<QtWizardState | null>(null);
  const [prefixCandidates, setPrefixCandidates] = useState<QtPrefixCandidate[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent<HostMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'qtWizard/initialize':
          setState(msg.payload.state);
          setPrefixCandidates(msg.payload.prefixCandidates);
          break;
        case 'qtWizard/prefixCandidates':
          setPrefixCandidates(msg.payload.candidates);
          break;
        case 'qtWizard/createResult':
          setCreating(false);
          if (!msg.payload.success && msg.payload.error) {
            setError(msg.payload.error);
          }
          break;
        case 'qtWizard/pickPrefixFolderResult':
          if (!msg.payload.canceled && msg.payload.path) {
            setState((prev) => (prev ? { ...prev, qtPrefixPath: msg.payload.path ?? prev.qtPrefixPath } : prev));
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateState = (partial: Partial<QtWizardState>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      vscodeApi.postMessage({ type: 'qtWizard/requestRegeneratePreview', state: next });
      return next;
    });
    setError(null);
  };

  const onQtMajorChange = (value: QtMajorVersion) => {
    if (!state) return;
    const next: QtWizardState = { ...state, qtMajor: value };
    setState(next);
    vscodeApi.postMessage({ type: 'qtWizard/requestDetectPrefix', qtMajor: value });
    vscodeApi.postMessage({ type: 'qtWizard/requestRegeneratePreview', state: next });
  };

  const onCreate = () => {
    if (!state) return;
    setCreating(true);
    setError(null);
    vscodeApi.postMessage({ type: 'qtWizard/requestCreateProject', state });
  };

  const onBrowsePrefix = () => {
    vscodeApi.postMessage({ type: 'qtWizard/requestPickPrefixFolder' });
  };

  if (!state) {
    return <div className="qt-wizard-root ve-page ve-page--wizard">Loading Qt Project Wizard…</div>;
  }

  return (
    <div className="qt-wizard-root ve-page ve-page--wizard">
      <div className="qt-wizard-left ve-page-body">
        <h2 className="qt-wizard-title">Qt CMake Project Wizard</h2>

        <section className="ve-card">
          <div className="ve-card-header">
            <h3 className="ve-card-section-title">Project</h3>
          </div>
          <div className="ve-card-body">
            <div className="ve-field">
              <div className="ve-field-label">Project Name</div>
              <div className="ve-field-control">
                <input
                  value={state.projectName}
                  onChange={(e) => updateState({ projectName: e.target.value })}
                />
              </div>
            </div>
            <div className="ve-field">
              <div className="ve-field-label">Target Directory</div>
              <div className="ve-field-control">
                <input
                  value={state.targetDir}
                  onChange={(e) => updateState({ targetDir: e.target.value })}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="ve-card">
          <div className="ve-card-header">
            <h3 className="ve-card-section-title">Toolchain</h3>
          </div>
          <div className="ve-card-body">
            <div className="ve-field">
              <div className="ve-field-label">C++ Standard</div>
              <div className="ve-field-control">
                <select
                  value={state.cppStandard}
                  onChange={(e) =>
                    updateState({
                      cppStandard: Number(e.target.value) as QtWizardState['cppStandard'],
                    })
                  }
                >
                  <option value={17}>C++17</option>
                  <option value={20}>C++20</option>
                  <option value={23}>C++23</option>
                  <option value={26}>C++26</option>
                </select>
              </div>
            </div>
            <div className="ve-field">
              <div className="ve-field-label">Qt Version</div>
              <div className="ve-field-control">
                <select
                  value={state.qtMajor}
                  onChange={(e) => onQtMajorChange(Number(e.target.value) as QtMajorVersion)}
                >
                  <option value={6}>Qt 6</option>
                  <option value={5}>Qt 5</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="ve-card">
          <div className="ve-card-header">
            <h3 className="ve-card-section-title">Qt Installation</h3>
          </div>
          <div className="ve-card-body">
            <div className="ve-field">
              <div className="ve-field-label">Qt CMake Prefix Path</div>
              <div className="ve-field-control">
                <input
                  value={state.qtPrefixPath}
                  onChange={(e) => updateState({ qtPrefixPath: e.target.value })}
                  list="qt-prefix-candidates"
                />
                <button
                  type="button"
                  className="ve-button ve-button-secondary qt-prefix-browse"
                  onClick={onBrowsePrefix}
                >
                  Browse...
                </button>
                <datalist id="qt-prefix-candidates">
                  {prefixCandidates.map((c) => (
                    <option key={c.path} value={c.path}>
                      {c.path}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="ve-field-help qt-prefix-hint">
                {prefixCandidates.length > 0
                  ? `Detected ${prefixCandidates.length} candidate(s); first is used as default.`
                  : 'No Qt prefix detected automatically. You can type or paste a path manually.'}
              </div>
            </div>
          </div>
        </section>

        <section className="ve-card">
          <div className="ve-card-header">
            <h3 className="ve-card-section-title">Template</h3>
          </div>
          <div className="ve-card-body">
            <div className="ve-field">
              <div className="ve-field-label">Project Type</div>
              <div className="ve-field-control">
                <select
                  value={state.projectType}
                  onChange={(e) => updateState({ projectType: e.target.value as QtProjectType })}
                >
                  <option value="widgets">Qt Widgets Application</option>
                  <option value="console">Qt Console Application</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {error && <div className="qt-error-banner">{error}</div>}

        <div className="qt-footer">
          <button
            type="button"
            className="ve-button ve-button-primary"
            onClick={onCreate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};
