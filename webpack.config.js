const webpack = require('webpack');

module.exports = {
    entry: './src/main.ts',
    output: {
        filename: './dist/waveaudio.js',
        libraryTarget: "commonjs2"
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        loaders: [
            { test: /\.tsx?$/, loader: 'ts-loader' }
        ]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
          compress: { warnings: false },
          output: { comments: false },
          sourceMap: true
        })
    ]
}
