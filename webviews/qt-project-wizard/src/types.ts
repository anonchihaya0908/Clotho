export type QtMajorVersion = 5 | 6;
export type QtProjectType = 'widgets' | 'console';

export interface QtWizardState {
  projectName: string;
  targetDir: string;
  projectType: QtProjectType;
  cppStandard: 17 | 20 | 23 | 26;
  qtMajor: QtMajorVersion;
  qtPrefixPath: string;
}

export interface QtPrefixCandidate {
  path: string;
  source: 'config' | 'env' | 'scan';
}

export interface InitializePayload {
  state: QtWizardState;
  prefixCandidates: QtPrefixCandidate[];
}

export type HostMessage =
  | { type: 'qtWizard/initialize'; payload: InitializePayload }
  | { type: 'qtWizard/previewUpdated'; payload: { cmakeContent: string } }
  | { type: 'qtWizard/prefixCandidates'; payload: { qtMajor: QtMajorVersion; candidates: QtPrefixCandidate[] } }
  | { type: 'qtWizard/createResult'; payload: { success: boolean; error?: string } };

export type WebviewMessage =
  | { type: 'qtWizard/requestPreview'; state: QtWizardState }
  | { type: 'qtWizard/requestDetectPrefix'; qtMajor: QtMajorVersion }
  | { type: 'qtWizard/requestCreateProject'; state: QtWizardState };

