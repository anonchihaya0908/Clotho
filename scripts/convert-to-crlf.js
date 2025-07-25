/*
 * convert-to-crlf.js
 * ------------------
 * 递归遍历当前工作区（执行脚本时的工作目录），
 * 将所有代码文件（.ts/.tsx/.js/.jsx/.css/.scss/.json/.md 等）统一转换为 CRLF (\r\n) 行尾。
 * 
 * 使用方法：
 *   node scripts/convert-to-crlf.js
 * 
 * 注意：
 * 1. 脚本会跳过常见的输出/依赖目录（node_modules、.git、dist 等）。
 * 2. 对于已是 CRLF 的文件不会重复写入，最大程度减少 Git diff。
 */

const fs = require('fs');
const path = require('path');

// 需要忽略的目录
const IGNORE_DIRS = new Set([
    'node_modules',
    '.git',
    '.vscode',
    'dist',
    'out',
    'build',
]);

// 需要处理的文件扩展名
const TARGET_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.css', '.scss', '.less',
    '.json', '.jsonc', '.yaml', '.yml',
    '.md', '.markdown', '.html', '.htm', '.txt',
]);

/**
 * 判断目录是否需要忽略
 */
function shouldIgnoreDir(dirName) {
    return IGNORE_DIRS.has(dirName);
}

/**
 * 判断文件是否需要处理
 */
function shouldProcessFile(fileName) {
    return TARGET_EXTS.has(path.extname(fileName).toLowerCase());
}

/**
 * 将文件内容转换为 CRLF 行尾
 */
function convertFileToCRLF(filePath) {
    try {
        const originalContent = fs.readFileSync(filePath, 'utf8');

        // 如果文件已经是 CRLF，则跳过
        if (/\r\n/.test(originalContent) && !/[^\r]\n/.test(originalContent)) {
            return; // 已是纯 CRLF，无需处理
        }

        const convertedContent = originalContent.replace(/\r?\n/g, '\r\n');

        // 只有在内容变化时才写入，减少不必要的 I/O
        if (convertedContent !== originalContent) {
            fs.writeFileSync(filePath, convertedContent, 'utf8');
            console.log(`Converted ➜ ${filePath}`);
        }
    } catch (err) {
        console.warn(`Failed to convert ${filePath}:`, err.message);
    }
}

/**
 * 递归遍历目录
 */
function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            if (!shouldIgnoreDir(entry.name)) {
                walk(fullPath);
            }
        } else if (entry.isFile() && shouldProcessFile(entry.name)) {
            convertFileToCRLF(fullPath);
        }
    }
}

// 执行脚本
(function main() {
    const start = Date.now();
    const rootDir = process.cwd();
    console.log(`\n🚀 开始将 ${rootDir} 下的文件转换为 CRLF 行尾...`);
    walk(rootDir);
    console.log(`✅ 转换完成，用时 ${Date.now() - start}ms\n`);
})(); 