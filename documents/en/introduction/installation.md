
# Installation

## NPM

The `agent-reducer` package lives in [npm](https://www.npmjs.com/get-npm). To install the latest stable version, run the following command:
```
npm i agent-reducer
```

## Compile

Before `agent-reducer@3.3.0` , `*.d.ts` files are built in `libs` , that confuse developers, if the API is exist in `libs` too. Now, we don't supply `libs` , and the only ways to access API are `import {...} from agent-reducer` or `import {...} from agent-reducer/es`.

The directory `agent-reducer/es` is supplied for a small size building in different compiling target environment. You can use [babel](https://babeljs.io/docs/en/configuration) to do this, `babel` will supply a common polyfill for both of your code and `agent-reducer`.

the example of babel.config.js :

```javascript
module.exports = {
    plugins: [
        ["@babel/plugin-transform-runtime"],
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
                    // 想要支持的浏览器最低环境
                    "browsers": ["last 2 versions", "ie >=9"]
                },
                useBuiltIns: "usage",
                corejs: {version: 3, proposals: true}
            }
        ],
        .......
    ]
}
```

If you still want to use `import {...} from 'agent-reducer'`, you can use complier `alias` function too resolve it.

For example, you can use webpack.config.js like:

```javascript
{
    module: {
            rules: [
                // your code
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
                },
                // agent-reducer/es code
                {
                    test: /\.js$|\.ts$|\.tsx$/,
                    include: /(node_modules\/agent-reducer\/es)/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true
                            }
                        }
                    ]
                },
                ......
            ]
    },
    ...,
    resolve: {
        alias:{
            // transform import target name here
            'agent-reducer':'agent-reducer/es'
        },
        extensions: ['.js', '.ts', '.tsx', '.json', 'txt'],
        plugins: [
            new TsconfigPathsPlugin({configFile: "./tsconfig.json"})
        ]
    },
    ...,
}
```

[next to getting started](https://github.com/filefoxper/agent-reducer/blob/master/documents/en/introduction/getting_started.md)