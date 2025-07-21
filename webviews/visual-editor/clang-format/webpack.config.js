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
        },
        externals: {
            // VS Code webview API is provided by the webview environment
            vscode: 'commonjs vscode',
        },
    };
};
