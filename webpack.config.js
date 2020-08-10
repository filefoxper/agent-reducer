const webpack = require('webpack');

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const pathBuilder = require('path');

const entryPath = pathBuilder.resolve('src', 'index.ts');

const targetPath = pathBuilder.resolve('dist');

const proxyPolyfillExternal = {
    root: 'ProxyPolyfill',
    commonjs2: 'proxy-polyfill',
    commonjs: 'proxy-polyfill',
    amd: 'proxy-polyfill',
};

function entry() {
    return {
        externals:{
            'proxy-polyfill':proxyPolyfillExternal
        },
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
                new TsconfigPathsPlugin({configFile: "./tsconfig.json"})
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
                                cacheDirectory: true,
                                plugins: [
                                    ["@babel/plugin-transform-runtime"],
                                    ['@babel/plugin-proposal-export-namespace-from'],
                                    [
                                        '@babel/plugin-proposal-class-properties',
                                        {loose: true},
                                    ]
                                ],
                                presets: [
                                    [
                                        '@babel/preset-env',
                                        {
                                            modules: false,
                                            targets: {
                                                browsers: ['ie >= 11']
                                            }
                                        }
                                    ]
                                ]
                            }
                        },
                        "ts-loader"
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
        ]
    }
}

module.exports = function (env) {
    return entry();
};
