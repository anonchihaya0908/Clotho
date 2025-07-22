const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/index.tsx',
        mode: isProduction ? 'production' : 'development',
        devtool: 'source-map', // 避免在VS Code Webview中使用 eval
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
            // 完全禁用代码分割以避免VS Code webview CSP问题
            splitChunks: false,
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
