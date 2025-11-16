import React, { useEffect, useState } from 'react';
import type { HostMessage, QtWizardState, QtPrefixCandidate, WebviewMessage, QtMajorVersion, QtProjectType } from '../types';

declare const acquireVsCodeApi: () => {
  postMessage(message: WebviewMessage): void;
};

const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : { postMessage: () => undefined };

export const App: React.FC = () => {
  const [state, setState] = useState<QtWizardState | null>(null);
  const [cmakePreview, setCmakePreview] = useState('');
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
          vscodeApi.postMessage({ type: 'qtWizard/requestPreview', state: msg.payload.state });
          break;
        case 'qtWizard/previewUpdated':
          setCmakePreview(msg.payload.cmakeContent);
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
      vscodeApi.postMessage({ type: 'qtWizard/requestPreview', state: next });
      return next;
    });
    setError(null);
  };

  const onQtMajorChange = (value: QtMajorVersion) => {
    if (!state) return;
    const next: QtWizardState = { ...state, qtMajor: value };
    setState(next);
    vscodeApi.postMessage({ type: 'qtWizard/requestDetectPrefix', qtMajor: value });
    vscodeApi.postMessage({ type: 'qtWizard/requestPreview', state: next });
  };

  const onCreate = () => {
    if (!state) return;
    setCreating(true);
    setError(null);
    vscodeApi.postMessage({ type: 'qtWizard/requestCreateProject', state });
  };

  if (!state) {
    return <div className="qt-wizard-root">Loading Qt Project Wizard…</div>;
  }

  return (
    <div className="qt-wizard-root">
      <div className="qt-wizard-left">
        <h2>Qt CMake Project Wizard</h2>

        <section>
          <h3>Project</h3>
          <label>
            Project Name
            <input
              value={state.projectName}
              onChange={(e) => updateState({ projectName: e.target.value })}
            />
          </label>
          <label>
            Target Directory
            <input
              value={state.targetDir}
              onChange={(e) => updateState({ targetDir: e.target.value })}
            />
          </label>
        </section>

        <section>
          <h3>Toolchain</h3>
          <label>
            C++ Standard
            <select
              value={state.cppStandard}
              onChange={(e) => updateState({ cppStandard: Number(e.target.value) as QtWizardState['cppStandard'] })}
            >
              <option value={17}>C++17</option>
              <option value={20}>C++20</option>
              <option value={23}>C++23</option>
              <option value={26}>C++26</option>
            </select>
          </label>
          <label>
            Qt Version
            <select
              value={state.qtMajor}
              onChange={(e) => onQtMajorChange(Number(e.target.value) as QtMajorVersion)}
            >
              <option value={6}>Qt 6</option>
              <option value={5}>Qt 5</option>
            </select>
          </label>
        </section>

        <section>
          <h3>Qt Installation</h3>
          <label>
            Qt CMake Prefix Path
            <input
              value={state.qtPrefixPath}
              onChange={(e) => updateState({ qtPrefixPath: e.target.value })}
              list="qt-prefix-candidates"
            />
            <datalist id="qt-prefix-candidates">
              {prefixCandidates.map((c) => (
                <option key={c.path} value={c.path}>
                  {c.path}
                </option>
              ))}
            </datalist>
          </label>
          <div className="qt-prefix-hint">
            {prefixCandidates.length > 0
              ? `Detected ${prefixCandidates.length} candidate(s); first is used as default.`
              : 'No Qt prefix detected automatically. You can type or paste a path manually.'}
          </div>
        </section>

        <section>
          <h3>Template</h3>
          <label>
            Project Type
            <select
              value={state.projectType}
              onChange={(e) => updateState({ projectType: e.target.value as QtProjectType })}
            >
              <option value="widgets">Qt Widgets Application</option>
              <option value="console">Qt Console Application</option>
            </select>
          </label>
        </section>

        {error && (
          <div className="qt-error-banner">
            {error}
          </div>
        )}

        <div className="qt-footer">
          <button onClick={onCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>

      <div className="qt-wizard-right">
        <h3>CMakeLists.txt Preview</h3>
        <pre className="qt-cmake-preview">
          {cmakePreview || '# Preview will appear here…'}
        </pre>
      </div>
    </div>
  );
};

