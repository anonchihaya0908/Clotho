import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createModuleLogger } from '../common/logger/unified-logger';

type QtMajorVersion = 5 | 6;
type QtProjectType = 'widgets' | 'console';

interface QtWizardState {
  projectName: string;
  targetDir: string;
  projectType: QtProjectType;
  cppStandard: 17 | 20 | 23 | 26;
  qtMajor: QtMajorVersion;
  qtPrefixPath: string;
}

interface QtPrefixCandidate {
  path: string;
  source: 'config' | 'env' | 'scan';
}

const QT_CONFIG_REL_PATH = (major: QtMajorVersion) =>
  path.join('lib', 'cmake', `Qt${major}`, `Qt${major}Config.cmake`);

export async function runQtProjectWizard(): Promise<void> {
  const logger = createModuleLogger('QtProjectWizard');

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    void vscode.window.showErrorMessage('Please open a workspace folder before creating a Qt project.');
    return;
  }

  const projectName = await askProjectName(workspaceFolder.name);
  if (!projectName) { return; }

  const targetDir = await chooseTargetDirectory(workspaceFolder, projectName);
  if (!targetDir) { return; }

  const projectType = await askProjectType();
  if (!projectType) { return; }

  const cppStandard = await askCppStandard();
  if (!cppStandard) { return; }

  const qtMajor = await askQtMajorVersion();
  if (!qtMajor) { return; }

  const qtPrefixPath = await askQtPrefixPath(qtMajor, logger);
  if (!qtPrefixPath) { return; }

  const state: QtWizardState = {
    projectName,
    targetDir,
    projectType,
    cppStandard,
    qtMajor,
    qtPrefixPath,
  };

  const confirmed = await showCMakePreviewAndConfirm(state);
  if (!confirmed) {
    return;
  }

  await createQtProject(state, logger);
}

async function askProjectName(defaultName: string): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    prompt: '请输入 Qt 项目名称',
    value: defaultName || 'QtApp1',
    ignoreFocusOut: true,
    validateInput: (input) => input.trim().length === 0 ? '项目名称不能为空' : undefined,
  });
  return value?.trim();
}

async function chooseTargetDirectory(
  workspaceFolder: vscode.WorkspaceFolder,
  projectName: string,
): Promise<string | undefined> {
  const workspacePath = workspaceFolder.uri.fsPath;

  if (!workspacePath) {
    return undefined;
  }

  // 检查工作区根目录是否“基本为空”（忽略以点开头的目录，如 .vscode/.git）
  const rootEntries = fs.existsSync(workspacePath)
    ? fs.readdirSync(workspacePath).filter((name) => !name.startsWith('.'))
    : [];

  // 根目录为空：询问是否直接在当前目录生成项目，避免 analyze/analyze 这种多余嵌套
  if (rootEntries.length === 0) {
    const rootOption: vscode.QuickPickItem = {
      label: '在当前目录生成项目（推荐）',
      description: `目录：${workspacePath}` as string,
      detail: '适用于当前工作区专门用于这个 Qt 项目时' as string,
    };
    const subdirOption: vscode.QuickPickItem = {
      label: `在子目录 "${projectName}" 中生成项目`,
      description: `目录：${path.join(workspacePath, projectName)}` as string,
    };

    const picked = await vscode.window.showQuickPick(
      [rootOption, subdirOption],
      {
        title: '选择 Qt 项目的生成位置',
        placeHolder: '建议在空工作区直接使用当前目录；也可以选择创建子目录',
        ignoreFocusOut: true,
      },
    );

    if (!picked) { return undefined; }

    if (picked === rootOption) {
      // 根目录已经确认“基本为空”，但仍然走一遍可复用的可用性检查
      return ensureTargetDirAvailable(workspacePath) ? workspacePath : undefined;
    }

    const subDir = path.join(workspacePath, projectName);
    return ensureTargetDirAvailable(subDir) ? subDir : undefined;
  }

  // 根目录非空：按原方案，在子目录 <projectName> 中创建项目
  const targetDir = path.join(workspacePath, projectName);
  return ensureTargetDirAvailable(targetDir) ? targetDir : undefined;
}

function ensureTargetDirAvailable(targetDir: string): boolean {
  if (!fs.existsSync(targetDir)) {
    return true;
  }

  const entries = fs.readdirSync(targetDir).filter((name) => !name.startsWith('.'));
  if (entries.length === 0) {
    return true;
  }

  void vscode.window.showErrorMessage(`目标目录已存在且非空：${targetDir}`);
  return false;
}

async function askProjectType(): Promise<QtProjectType | undefined> {
  const items: vscode.QuickPickItem[] = [
    {
      label: 'Qt Widgets 应用',
      description: '基于 QApplication + QWidget/QMainWindow' as string,
      detail: '推荐' as string,
    },
    {
      label: 'Qt 控制台应用',
      description: '基于 QCoreApplication 的命令行程序' as string,
    },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: '选择 Qt 项目类型',
    placeHolder: '请选择项目类型',
    ignoreFocusOut: true,
  });

  if (!picked) { return undefined; }
  return picked.label.startsWith('Qt Widgets') ? 'widgets' : 'console';
}

async function askCppStandard(): Promise<17 | 20 | 23 | 26 | undefined> {
  const config = vscode.workspace.getConfiguration('clotho');
  const defaultStd = config.get<'17' | '20' | '23' | '26'>('qt.defaultCppStandard', '20');

  const items: vscode.QuickPickItem[] = [];
  items.push({ label: 'C++17' });
  const c20: vscode.QuickPickItem = { label: 'C++20' };
  if (defaultStd === '20') {
    c20.description = '推荐';
  }
  items.push(c20);
  items.push({ label: 'C++23' });
  items.push({ label: 'C++26' });

  const picked = await vscode.window.showQuickPick(items, {
    title: '选择 C++ 标准',
    placeHolder: `当前推荐：C++${defaultStd}`,
    ignoreFocusOut: true,
  });

  if (!picked) { return undefined; }
  const std = picked.label.replace('C++', '').trim();
  const numeric = Number(std) as 17 | 20 | 23 | 26;
  return numeric;
}

async function askQtMajorVersion(): Promise<QtMajorVersion | undefined> {
  const items: vscode.QuickPickItem[] = [
    { label: 'Qt 6' },
    { label: 'Qt 5' },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: '选择 Qt 主要版本',
    placeHolder: '请选择 Qt 版本',
    ignoreFocusOut: true,
  });

  if (!picked) { return undefined; }
  return picked.label.includes('6') ? 6 : 5;
}

async function askQtPrefixPath(major: QtMajorVersion, logger: ReturnType<typeof createModuleLogger>): Promise<string | undefined> {
  const candidates = await detectQtPrefixCandidates(major, logger);

  const quickItems: vscode.QuickPickItem[] = [];
  const seen = new Set<string>();

  for (const [index, cand] of candidates.entries()) {
    if (seen.has(cand.path)) { continue; }
    seen.add(cand.path);
    const item: vscode.QuickPickItem = {
      label: cand.path,
      description: cand.source === 'config'
        ? '来自设置'
        : cand.source === 'env'
          ? '来自环境变量'
          : '自动扫描',
    };
    if (index === 0) {
      item.detail = '推荐';
    }
    quickItems.push(item);
  }

  quickItems.push({ label: '手动选择其它路径…', description: '通过文件夹选择器选择 Qt 安装目录' });
  quickItems.push({ label: '直接输入路径…', description: '手动输入 Qt CMake 前缀路径' });

  const picked = await vscode.window.showQuickPick(quickItems, {
    title: `选择 Qt${major} CMake 前缀路径`,
    placeHolder: '请选择一个候选路径（推荐值已标注），或选择手动输入',
    ignoreFocusOut: true,
  });

  if (!picked) { return undefined; }

  let chosenPath: string | undefined;
  if (picked.label === '手动选择其它路径…') {
    const folder = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '选择 Qt 安装目录',
    });
    const first = folder && folder[0];
    if (!first) { return undefined; }
    chosenPath = first.fsPath;
  } else if (picked.label === '直接输入路径…') {
    const input = await vscode.window.showInputBox({
      prompt: '请输入 Qt CMake 前缀路径（包含 lib/cmake/QtX 的目录）',
      ignoreFocusOut: true,
    });
    if (!input) { return undefined; }
    chosenPath = input.trim();
  } else {
    chosenPath = picked.label;
  }

  if (!chosenPath) { return undefined; }

  const valid = validateQtPrefix(chosenPath, major);
  if (!valid) {
    void vscode.window.showWarningMessage(`所选目录中未找到 Qt${major} CMake 配置文件：${QT_CONFIG_REL_PATH(major)}`);
  }

  // Persist to config for future runs
  const config = vscode.workspace.getConfiguration('clotho');
  const map = config.get<Record<string, string>>('qt.prefixPaths') ?? {};
  map[String(major)] = chosenPath;
  await config.update('qt.prefixPaths', map, vscode.ConfigurationTarget.Global);

  return chosenPath;
}

async function detectQtPrefixCandidates(major: QtMajorVersion, logger: ReturnType<typeof createModuleLogger>): Promise<QtPrefixCandidate[]> {
  const candidates: QtPrefixCandidate[] = [];

  const config = vscode.workspace.getConfiguration('clotho');
  const map = config.get<Record<string, string>>('qt.prefixPaths') ?? {};
  const fromConfig = map[String(major)];
  if (fromConfig && validateQtPrefix(fromConfig, major)) {
    candidates.push({ path: fromConfig, source: 'config' });
  }

  const envVars = ['QTDIR', 'QT_PREFIX_PATH'];
  for (const key of envVars) {
    const raw = process.env[key];
    if (!raw) { continue; }
    const parts = raw.split(path.delimiter).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      if (validateQtPrefix(p, major)) {
        candidates.push({ path: p, source: 'env' });
      }
    }
  }

  // Very lightweight scan for Windows typical layout
  if (process.platform === 'win32') {
    const root = 'C:/Qt';
    if (fs.existsSync(root) && fs.statSync(root).isDirectory()) {
      try {
        const entries = fs.readdirSync(root);
        for (const entry of entries) {
          const full = path.join(root, entry);
          if (!fs.statSync(full).isDirectory()) { continue; }
          if (!entry.includes(String(major))) { continue; }
          if (validateQtPrefix(full, major)) {
            candidates.push({ path: full, source: 'scan' });
          }
        }
      } catch (error) {
        logger.warn('Failed to scan C:/Qt for prefixes', { metadata: { error: String(error) } });
      }
    }
  }

  // De‑duplicate while preserving order
  const seen = new Set<string>();
  const unique: QtPrefixCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.path)) { continue; }
    seen.add(c.path);
    unique.push(c);
  }

  return unique;
}

function validateQtPrefix(prefix: string, major: QtMajorVersion): boolean {
  const configPath = path.join(prefix, QT_CONFIG_REL_PATH(major));
  try {
    return fs.existsSync(configPath);
  } catch {
    return false;
  }
}

async function createQtProject(state: QtWizardState, logger: ReturnType<typeof createModuleLogger>): Promise<void> {
  try {
    fs.mkdirSync(state.targetDir, { recursive: true });

    const cmakeContent = buildCMakeLists(state);
    const mainContent = buildMainCpp(state);

    fs.writeFileSync(path.join(state.targetDir, 'CMakeLists.txt'), cmakeContent, 'utf8');
    fs.writeFileSync(path.join(state.targetDir, 'main.cpp'), mainContent, 'utf8');

    const cmakeUri = vscode.Uri.file(path.join(state.targetDir, 'CMakeLists.txt'));
    const doc = await vscode.workspace.openTextDocument(cmakeUri);
    await vscode.window.showTextDocument(doc);

    // Best-effort: 触发一次 CMake Tools 的配置，让用户无需手动重新加载窗口
    try {
      const cmakeExt = vscode.extensions.getExtension('ms-vscode.cmake-tools');
      if (cmakeExt) {
        await vscode.commands.executeCommand('cmake.configure');
      }
    } catch (cmakeError) {
      logger.warn('Failed to trigger CMake Tools configure after project creation', {
        metadata: { error: String(cmakeError) },
      });
    }
  } catch (error) {
    logger.error('Failed to create Qt project', error instanceof Error ? error : new Error(String(error)), {
      module: 'QtProjectWizard',
      operation: 'createQtProject',
    });
    void vscode.window.showErrorMessage(`创建 Qt 项目失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function showCMakePreviewAndConfirm(state: QtWizardState): Promise<boolean> {
  const cmakeContent = buildCMakeLists(state);

  // 在内存中打开一个只读的预览文档（不会写入磁盘）
  const doc = await vscode.workspace.openTextDocument({
    language: 'cmake',
    content: cmakeContent,
  });
  await vscode.window.showTextDocument(doc, { preview: true });

  const selection = await vscode.window.showInformationMessage(
    '已生成 CMakeLists.txt 预览，是否创建 Qt 项目？',
    '创建项目',
    '取消',
  );

  // 尝试以“还原并关闭”的方式关闭预览文档，避免出现“是否保存更改”的提示
  try {
    const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
    if (editor) {
      await vscode.window.showTextDocument(editor.document, editor.viewColumn);
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    }
  } catch {
    // 如果关闭失败，忽略即可（只是一个临时预览）
  }

  return selection === '创建项目';
}

function buildCMakeLists(state: QtWizardState): string {
  const qtPrefix = `Qt${state.qtMajor}`;
  const componentsLine = state.projectType === 'widgets'
    ? '        Core\n        Gui\n        Widgets'
    : '        Core';
  const libsLine = state.projectType === 'widgets'
    ? '        __QT_PREFIX__::Core\n        __QT_PREFIX__::Gui\n        __QT_PREFIX__::Widgets'
    : '        __QT_PREFIX__::Core';
  const foreachList = state.projectType === 'widgets' ? 'Core Gui Widgets' : 'Core';
  const sanitizedPrefix = state.qtPrefixPath.replace(/\\/g, '/');
  const qtMajor = state.qtMajor;

  const template = `cmake_minimum_required(VERSION 3.26)
project(${state.projectName})

set(CMAKE_CXX_STANDARD ${state.cppStandard})
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# User-confirmed Qt prefix path
set(CMAKE_PREFIX_PATH "${sanitizedPrefix}")

# Control whether Clotho runs windeployqt automatically after build on Windows.
# Advanced users can disable this for faster incremental builds or custom deployment.
option(CLOTHO_QT_ENABLE_AUTO_DEPLOY
  "Run windeployqt automatically after build on Windows"
  ON)

find_package(__QT_PREFIX__ COMPONENTS
${componentsLine}
        REQUIRED)

add_executable(${state.projectName} main.cpp)
target_link_libraries(${state.projectName}
${libsLine}
)

if (WIN32 AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    set(DEBUG_SUFFIX "")
    if (MSVC AND CMAKE_BUILD_TYPE MATCHES "Debug")
        set(DEBUG_SUFFIX "d")
    endif ()
    set(QT_INSTALL_PATH "\${CMAKE_PREFIX_PATH}")
    if (NOT EXISTS "\${QT_INSTALL_PATH}/bin")
        set(QT_INSTALL_PATH "\${QT_INSTALL_PATH}/..")
        if (NOT EXISTS "\${QT_INSTALL_PATH}/bin")
            set(QT_INSTALL_PATH "\${QT_INSTALL_PATH}/..")
        endif ()
    endif ()
    if (EXISTS "\${QT_INSTALL_PATH}/plugins/platforms/qwindows\${DEBUG_SUFFIX}.dll")
        add_custom_command(TARGET \${PROJECT_NAME} POST_BUILD
                COMMAND \${CMAKE_COMMAND} -E make_directory
                "\$<TARGET_FILE_DIR:\${PROJECT_NAME}>/plugins/platforms/")
        add_custom_command(TARGET \${PROJECT_NAME} POST_BUILD
                COMMAND \${CMAKE_COMMAND} -E copy
                "\${QT_INSTALL_PATH}/plugins/platforms/qwindows\${DEBUG_SUFFIX}.dll"
                "\$<TARGET_FILE_DIR:\${PROJECT_NAME}>/plugins/platforms/")
    endif ()
    foreach (QT_LIB ${foreachList})
        add_custom_command(TARGET \${PROJECT_NAME} POST_BUILD
                COMMAND \${CMAKE_COMMAND} -E copy
                "\${QT_INSTALL_PATH}/bin/__QT_PREFIX__\${QT_LIB}\${DEBUG_SUFFIX}.dll"
                "\$<TARGET_FILE_DIR:\${PROJECT_NAME}>")
    endforeach (QT_LIB)

    # Optional: use windeployqt to perform full deployment (plugins, runtime deps, etc.).
    # This mirrors the experience of IDEs like Qt Creator / CLion.
    if (CLOTHO_QT_ENABLE_AUTO_DEPLOY)
        # Choose the appropriate windeployqt executable for Qt5/Qt6
        if (${qtMajor} EQUAL 6)
            set(_windeploy_names windeployqt6 windeployqt6.exe)
        else()
            set(_windeploy_names windeployqt windeployqt.exe)
        endif()

        find_program(QT_WDEPLOY_EXECUTABLE
            NAMES \${_windeploy_names}
            HINTS "\${QT_INSTALL_PATH}/bin")

        if (QT_WDEPLOY_EXECUTABLE)
            add_custom_command(TARGET \${PROJECT_NAME} POST_BUILD
                COMMAND "\${QT_WDEPLOY_EXECUTABLE}"
                        "\$<IF:\$<CONFIG:Debug>,--debug,--release>"
                        --dir "\$<TARGET_FILE_DIR:\${PROJECT_NAME}>"
                        "\$<TARGET_FILE:\${PROJECT_NAME}>"
                COMMENT "Auto-deploying Qt runtime with windeployqt"
                VERBATIM)

            # Optional explicit deployment target for manual invocation
            add_custom_target(qt_deploy
                COMMAND "\${QT_WDEPLOY_EXECUTABLE}"
                        "\$<IF:\$<CONFIG:Debug>,--debug,--release>"
                        --dir "\$<TARGET_FILE_DIR:\${PROJECT_NAME}>"
                        "\$<TARGET_FILE:\${PROJECT_NAME}>"
                COMMENT "Running windeployqt for \$<CONFIG> build"
                VERBATIM)
        endif()
    endif()
endif ()
`;

  return template.replace(/__QT_PREFIX__/g, qtPrefix);
}

function buildMainCpp(state: QtWizardState): string {
  if (state.projectType === 'widgets') {
    return [
      '#include <QApplication>',
      '#include <QMainWindow>',
      '',
      'int main(int argc, char *argv[])',
      '{',
      '    QApplication app(argc, argv);',
      '    QMainWindow window;',
      '    window.resize(800, 600);',
      '    window.show();',
      '    return app.exec();',
      '}',
      '',
    ].join('\n');
  }

  return [
    '#include <QCoreApplication>',
    '#include <QDebug>',
    '',
    'int main(int argc, char *argv[])',
    '{',
    '    QCoreApplication app(argc, argv);',
    '    qInfo() << "Hello from Qt console application"; ',
    '    return 0;',
    '}',
    '',
  ].join('\n');
}
