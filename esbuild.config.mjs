// esbuild.config.mjs
import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const config = {
    entryPoints: ['./src/extension.ts'], // <== 只有一个入口
    bundle: true,                        // <== 开启打包！这会把依赖包含进来
    outfile: './out/extension.js',       // <== 输出到这一个文件
    external: ['vscode'],                // <== vscode是运行时提供的，必须排除
    format: 'cjs',
    platform: 'node',
    sourcemap: true,
    minify: !isWatch,
};

async function build() {
    try {
        const context = await esbuild.context(config);
        if (isWatch) {
            await context.watch();
            console.log('esbuild is watching for changes...');
        } else {
            await context.rebuild();
            await context.dispose();
            console.log('esbuild build complete.');
        }
    } catch (error) {
        console.error('esbuild failed:', error);
        process.exit(1);
    }
}

build();