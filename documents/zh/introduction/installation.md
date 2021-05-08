
# 安装

## NPM

`agent-reducer`包长期维护于[npm](https://www.npmjs.com/get-npm)包管理系统。 安装最新稳定版`agent-reducer`可以运行如下命令:
```
npm i agent-reducer
```

## 编译

自`agent-reducer@3.3.0`开始，我们取消了原来在`libs`目录下提供的 typescript 声明文件，而只提供一个集中的 index.d.ts 项目声明，这可以避免使用者误引`libs`目录（之前这个目录下只提供了 ts 声明文件，如果引用这个文件下的API将会导致报错）。

为了支持低版本浏览器，`agent-reducer` 编译时会从 core.js 引入一些用户环境可能本身就支持的 polyfill 函数，从而导致引入包过大的问题。目前使用者可以通过直接使用 `agent-reducer/es` API，并自行提供 polyfill 的方式来解决这个问题。

代码：

```typescript
import {MiddleWarePresets} from 'agent-reducer/es';

......
```

babel配置：

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

具体配置可参考 [babel](https://babeljs.io/docs/en/configuration) 官方配置。

如果不希望更改引用方式，还可以使用 alias 技术，将原来的 `agent-reducer` 在编译时转换成 `agent-reducer/es`。

如 webpack.config.js 配置中：

```javascript
{
    module: {
            rules: [
                // 你的代码
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
                // agent-reducer/es的代码
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
            // 引用名转换
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

[下一节，快速入门](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/getting_started.md)