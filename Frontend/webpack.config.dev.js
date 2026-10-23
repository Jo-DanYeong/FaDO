const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    liveReload: true,
    hot: true,
    open: false,
    host: '127.0.0.1',
    port: 3000,
    static: false,
    proxy: [
      {
        context: ['/api'],
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    ],
  },
});
