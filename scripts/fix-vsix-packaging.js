#!/usr/bin/env node

/**
 * 修复VSIX打包问题的脚本
 * 解决开发模式正常但VSIX包不工作的常见问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 开始修复VSIX打包问题...\n');

// 1. 确保.vscodeignore配置正确
console.log('📋 检查并修复.vscodeignore配置...');
const vscodeignoreContent = `# Source maps and TypeScript files
out/**/*.map
src/**
tsconfig.json
.vscode-test/
*.vsix
.DS_Store
.vscode/settings.json
.vscode/launch.json
.vscode/tasks.json
.eslintrc.json
**/*.ts
!out/**/*.js

# Development files
node_modules/
.git/
.gitignore
.github/
scripts/
esbuild.config.mjs
webpack.config.js

# Webview source files (exclude source, include built dist)
webviews/**/src/**
webviews/**/node_modules/**
webviews/**/package-lock.json
webviews/**/*.ts
webviews/**/*.tsx
webviews/**/tsconfig.json
webviews/**/webpack.config.js

# CRITICAL: Keep the built webview assets
!webviews/**/dist/**
!webviews/**/dist/**/*.js
!webviews/**/dist/**/*.css
!webviews/**/dist/**/*.webp
!webviews/**/dist/**/*.png
!webviews/**/dist/**/*.svg
!webviews/**/dist/**/*.json

# Keep important config files
!package.json
!README.md
!LICENSE
!CHANGELOG.md
`;

fs.writeFileSync('.vscodeignore', vscodeignoreContent);
console.log('✅ .vscodeignore已更新');

// 2. 检查并修复webview构建配置
console.log('\n🎨 检查webview构建配置...');
const webviewPackageJsonPath = 'webviews/visual-editor/clang-format/package.json';
if (fs.existsSync(webviewPackageJsonPath)) {
    const webviewPkg = JSON.parse(fs.readFileSync(webviewPackageJsonPath, 'utf-8'));

    // 确保构建脚本正确
    if (!webviewPkg.scripts.build || !webviewPkg.scripts.build.includes('production')) {
        webviewPkg.scripts.build = 'webpack --mode production';
        fs.writeFileSync(webviewPackageJsonPath, JSON.stringify(webviewPkg, null, 2));
        console.log('✅ webview构建脚本已修复');
    }
}

// 3. 创建一个更健壮的webpack配置
console.log('\n⚙️  检查webpack配置...');
const webpackConfigPath = 'webviews/visual-editor/clang-format/webpack.config.js';
const improvedWebpackConfig = `const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/index.tsx',
        mode: isProduction ? 'production' : 'development',
        devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'index.js',
            clean: true,
            // 确保在VS Code webview环境中正确加载
            publicPath: '',
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx'],
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true, // 加快构建速度
                        }
                    },
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        'css-loader',
                    ],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'images/[name][ext]'
                    }
                },
            ],
        },
        plugins: [
            ...(isProduction
                ? [
                    new MiniCssExtractPlugin({
                        filename: 'index.css',
                    }),
                ]
                : []),
        ],
        optimization: {
            minimize: isProduction,
            // 完全禁用代码分割以避免VS Code webview CSP问题
            splitChunks: false,
        },
        externals: {
            // VS Code webview API is provided by the webview environment
            vscode: 'commonjs vscode',
        },
        performance: {
            hints: isProduction ? 'warning' : false,
            maxEntrypointSize: 500000, // 500 KiB
            maxAssetSize: 500000,
        },
        // 确保在VS Code webview环境中正确工作
        target: 'web',
    };
};`;

fs.writeFileSync(webpackConfigPath, improvedWebpackConfig);
console.log('✅ webpack配置已优化');

// 4. 修复主扩展的esbuild配置
console.log('\n🔨 检查esbuild配置...');
const esbuildConfigPath = 'esbuild.config.mjs';
const improvedEsbuildConfig = `import { build } from 'esbuild';
import { readFileSync } from 'fs';

// 读取 package.json 获取外部依赖
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// 获取命令行参数
const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

const baseConfig = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'out/bundle.js',
    external: [
        'vscode',
        // 只外部化真正的运行时依赖
        'pidusage',
        'vscode-languageclient'
    ],
    format: 'cjs',
    platform: 'node',
    target: 'node16',
    sourcemap: !isProduction,
    minify: isProduction,
    define: {
        'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
    },
    logLevel: 'info',
    loader: {
        '.tsx': 'tsx',
        '.ts': 'ts'
    },
    // 确保正确处理文件路径
    plugins: [{
        name: 'fix-paths',
        setup(build) {
            // 确保webview路径被正确处理
            build.onResolve({ filter: /^\.\/webviews/ }, args => {
                return { path: args.path, external: true }
            })
        }
    }]
};

async function buildExtension() {
    try {
        if (isWatch) {
            console.log('👀 Starting esbuild in watch mode...');
            const context = await build({
                ...baseConfig,
                watch: {
                    onRebuild(error, result) {
                        if (error) {
                            console.error('❌ Watch build failed:', error);
                        } else {
                            console.log('✅ Watch build succeeded');
                        }
                    }
                }
            });

            console.log('📡 Watching for changes...');
            process.on('SIGINT', async () => {
                console.log('\\n🛑 Stopping watch mode...');
                await context.dispose();
                process.exit(0);
            });
        } else {
            console.log('🔨 Building extension...');
            await build(baseConfig);
            console.log('✅ Extension build completed successfully!');
        }
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

buildExtension();`;

fs.writeFileSync(esbuildConfigPath, improvedEsbuildConfig);
console.log('✅ esbuild配置已优化');

// 5. 创建完整的构建和打包流程
console.log('\n🚀 执行完整的构建流程...');

try {
    // 清理
    console.log('🧹 清理旧文件...');
    execSync('npm run clean', { stdio: 'inherit' });

    // 构建扩展
    console.log('🔨 构建扩展主体...');
    execSync('npm run build:extension:production', { stdio: 'inherit' });

    // 构建webview
    console.log('🎨 构建webview...');
    execSync('npm run build:webview:production', { stdio: 'inherit' });

    // 验证构建结果
    console.log('🔍 验证构建结果...');
    const criticalFiles = [
        'out/bundle.js',
        'webviews/visual-editor/clang-format/dist/index.js',
        'webviews/visual-editor/clang-format/dist/index.css'
    ];

    let allGood = true;
    criticalFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const size = fs.statSync(file).size;
            console.log(`✅ ${file} (${(size / 1024).toFixed(1)} KB)`);
        } else {
            console.log(`❌ ${file} 缺失`);
            allGood = false;
        }
    });

    if (!allGood) {
        throw new Error('构建验证失败');
    }

    // 创建VSIX包
    console.log('📦 创建VSIX包...');
    execSync('npx @vscode/vsce package --no-dependencies', { stdio: 'inherit' });

    console.log('\n🎉 VSIX包创建成功！');

    // 显示包信息
    const vsixFiles = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));
    if (vsixFiles.length > 0) {
        const vsixFile = vsixFiles[0];
        const stats = fs.statSync(vsixFile);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`📄 文件: ${vsixFile}`);
        console.log(`📏 大小: ${sizeInMB} MB`);
        console.log(`📁 路径: ${path.resolve(vsixFile)}`);
    }

} catch (error) {
    console.error('❌ 构建或打包失败:', error.message);
    process.exit(1);
}

console.log('\\n✨ 修复完成！现在可以尝试安装VSIX包了。');
console.log('\\n💡 如果仍有问题，请：');
console.log('1. 在VS Code中打开开发者工具 (Help > Toggle Developer Tools)');
console.log('2. 查看Console标签页的错误信息');
console.log('3. 检查Network标签页是否有资源加载失败');