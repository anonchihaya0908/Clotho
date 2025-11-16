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
  | { type: 'qtWizard/prefixCandidates'; payload: { qtMajor: QtMajorVersion; candidates: QtPrefixCandidate[] } }
  | { type: 'qtWizard/createResult'; payload: { success: boolean; error?: string } }
  | { type: 'qtWizard/pickPrefixFolderResult'; payload: { canceled: boolean; path?: string } };

export type WebviewMessage =
  | { type: 'qtWizard/requestRegeneratePreview'; state: QtWizardState }
  | { type: 'qtWizard/requestDetectPrefix'; qtMajor: QtMajorVersion }
  | { type: 'qtWizard/requestCreateProject'; state: QtWizardState }
  | { type: 'qtWizard/requestPickPrefixFolder' };
