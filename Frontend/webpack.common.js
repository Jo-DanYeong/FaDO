const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    app: './src/main.jsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    filename: 'js/app.js',
    chunkFilename: 'js/[name].[contenthash:8].js',
    publicPath: '/',
  },
  module: {
    rules: [
      { test: /\.jsx?$/i, include: path.resolve(__dirname, 'src'), use: 'babel-loader' },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      inject: 'body',
      scriptLoading: 'defer',
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: '.',
          globOptions: { ignore: ['**/index.html'] },
        },
        { from: path.resolve(__dirname, 'css'), to: 'css' },
      ],
    }),
  ],
};
