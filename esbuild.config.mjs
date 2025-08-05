import { build, context } from 'esbuild';
import { readFileSync } from 'fs';

// 读取 package.json 获取外部依赖
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// 获取命令行参数
const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

const baseConfig = {
  // Use the extension entry point to export activate/deactivate functions
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/bundle.js',
  external: [
    'vscode',
    'vscode-languageclient' // VSCode API相关，需要外部化
    // 尝试将pidusage打包进bundle而不是外部化
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
  // 排除webview相关文件
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts'
  },
  // 确保不处理webview文件
  plugins: [{
    name: 'exclude-webviews',
    setup(build) {
      build.onResolve({ filter: /^\.\/webviews/ }, args => {
        return { path: args.path, external: true };
      });
    }
  }]
};

async function buildExtension() {
  try {
    if (isWatch) {
      console.log('👀 Starting esbuild in watch mode...');
      const ctx = await context(baseConfig);

      await ctx.watch();
      console.log('📡 Watching for changes...');

      // 在 watch 模式下保持进程运行
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping watch mode...');
        await ctx.dispose();
        process.exit(0);
      });
    } else {
      console.log('Building extension...');
      await build(baseConfig);
      console.log('Extension build completed successfully!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildExtension();
