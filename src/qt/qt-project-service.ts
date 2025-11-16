import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { createModuleLogger } from '../common/logger/unified-logger';

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

const logger = createModuleLogger('QtProjectService');

const QT_CONFIG_REL_PATH = (major: QtMajorVersion) =>
  path.join('lib', 'cmake', `Qt${major}`, `Qt${major}Config.cmake`);

export function buildCMakeLists(state: QtWizardState): string {
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

export function buildMainCpp(state: QtWizardState): string {
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

export function ensureTargetDirAvailable(targetDir: string): boolean {
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

export async function detectQtPrefixCandidates(
  major: QtMajorVersion,
): Promise<QtPrefixCandidate[]> {
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

  // De-duplicate while preserving order
  const seen = new Set<string>();
  const unique: QtPrefixCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.path)) { continue; }
    seen.add(c.path);
    unique.push(c);
  }

  return unique;
}

export function validateQtPrefix(prefix: string, major: QtMajorVersion): boolean {
  const configPath = path.join(prefix, QT_CONFIG_REL_PATH(major));
  try {
    return fs.existsSync(configPath);
  } catch {
    return false;
  }
}

export async function persistQtPrefixPath(
  major: QtMajorVersion,
  prefix: string,
): Promise<void> {
  const config = vscode.workspace.getConfiguration('clotho');
  const map = config.get<Record<string, string>>('qt.prefixPaths') ?? {};
  map[String(major)] = prefix;
  await config.update('qt.prefixPaths', map, vscode.ConfigurationTarget.Global);
}

export async function createQtProjectOnDisk(state: QtWizardState): Promise<void> {
  fs.mkdirSync(state.targetDir, { recursive: true });

  const cmakeContent = buildCMakeLists(state);
  const mainContent = buildMainCpp(state);

  fs.writeFileSync(path.join(state.targetDir, 'CMakeLists.txt'), cmakeContent, 'utf8');
  fs.writeFileSync(path.join(state.targetDir, 'main.cpp'), mainContent, 'utf8');

  const cmakeUri = vscode.Uri.file(path.join(state.targetDir, 'CMakeLists.txt'));
  const doc = await vscode.workspace.openTextDocument(cmakeUri);
  await vscode.window.showTextDocument(doc);

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
}

