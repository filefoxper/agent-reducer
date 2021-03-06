const webpack = require('webpack');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const pathBuilder = require('path');

const entryPath = pathBuilder.resolve('src', 'index.ts');

const targetPath = pathBuilder.resolve('dist');

function entry(env) {
    return {
        mode: 'production',
        devtool: false,
        entry: {
            ['agent-reducer']: entryPath,
            ['agent-reducer.min']: entryPath
        },
        output: {
            path: targetPath,
            filename: '[name].js',
            library: 'agent-reducer',
            libraryTarget: 'umd'
        },
        optimization: {
            noEmitOnErrors: true,
            minimize: true,
            minimizer: [
                new UglifyJsPlugin({
                    include: /\.min\.js$/
                }),
            ],
            namedChunks: true
        },
        resolve: {
            plugins: [
                new TsconfigPathsPlugin({configFile: pathBuilder.resolve('src', 'tsconfig.json')})
            ],
            extensions: ['.js', '.ts', '.tsx', '.json', 'txt']
        },
        module: {
            rules: [
                {
                    test: /\.js$|\.ts$|\.tsx$/,
                    exclude: /(node_modules|bower_components)/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true
                            }
                        }
                    ]
                }
            ]
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env': {
                    'NODE_ENV': JSON.stringify('production')
                }
            })
        ].concat(env.analyze ? new BundleAnalyzerPlugin() : [])
    }
}

module.exports = function (env) {
    return entry(env);
};
