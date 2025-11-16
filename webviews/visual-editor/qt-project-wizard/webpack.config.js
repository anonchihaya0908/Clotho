const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    mode: isProduction ? 'production' : 'development',
    devtool: 'source-map',
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
      new HtmlWebpackPlugin({
        templateContent: '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>',
      }),
    ],
    optimization: {
      minimize: isProduction,
      splitChunks: false,
    },
    externals: {
      vscode: 'commonjs vscode',
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 300000,
      maxAssetSize: 300000,
    },
  };
};

