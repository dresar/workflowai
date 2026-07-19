const path = require('path');

module.exports = {
  entry: './src/app.ts',
  target: 'node18',
  mode: 'production',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {},
  optimization: {
    minimize: false,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  stats: {
    errorDetails: true,
  },
};
