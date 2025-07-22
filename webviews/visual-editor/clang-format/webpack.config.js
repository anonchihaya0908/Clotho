const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/index.tsx',
        mode: isProduction ? 'production' : 'development',
        devtool: isProduction ? false : 'inline-source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'index.js',
            clean: true,
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
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        'css-loader',
                    ],
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
            // 暂时禁用代码分割以避免复杂性，专注于懒加载优化
            // splitChunks: false,
        },
        externals: {
            // VS Code webview API is provided by the webview environment
            vscode: 'commonjs vscode',
        },
        performance: {
            hints: isProduction ? 'warning' : false,
            maxEntrypointSize: 300000, // 300 KiB (增加限制以适应VS Code webview)
            maxAssetSize: 300000,
        },
    };
};
