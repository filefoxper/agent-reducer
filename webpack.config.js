const webpack = require('webpack');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const TerserPlugin = require('terser-webpack-plugin');

const pathBuilder = require('path');

const entryPath = pathBuilder.resolve('src', 'index.ts');

const targetPath = pathBuilder.resolve('dist');

const esTargetPath = pathBuilder.resolve('es');

const esmTargetPath = pathBuilder.resolve('esm');

function entry(env,{name,output,configFile}) {
    return {
        mode: 'production',
        devtool: false,
        entry: {
            [name]: entryPath,
        },
        output: {
            path: output||targetPath,
            filename: '[name].js',
            library: 'agent-reducer',
            libraryTarget: 'umd'
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    extractComments: false
                })
            ]
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
                            options: configFile?{
                                cacheDirectory: true,
                                configFile
                            }:{
                                cacheDirectory: true,
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
        ].concat(env.analyze ? new BundleAnalyzerPlugin({analyzerPort:6660}) : [])
    }
}

module.exports = [
    function (env) {
        return entry(env,{name:'agent-reducer.mini'});
    },
    function (env) {
        return entry(env,{name:'index', output: esTargetPath,configFile:pathBuilder.resolve('babel.es.config.js')});
    },
    function (env) {
        return entry(env,{name:'index', output: esmTargetPath,});
    }
];
