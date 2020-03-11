// noinspection NodeJsCodingAssistanceForCoreModules,JSUnresolvedFunction
const path = require('path');

module.exports = {
    entry: {
        fluidplayer: './src/index.js'
    },
    output: {
        filename: '[name].min.js',
        chunkFilename: '[name].min.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '../dist/' // TODO - via env for production
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.svg$/,
                loader: 'svg-url-loader'
            }
        ],
    }
};
