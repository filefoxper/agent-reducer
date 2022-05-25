[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/agent-reducer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/agent-reducer
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# agent-reducer

与 [redux](https://redux.js.org)，[dva](https://dvajs.com) 等状态管理工具不同，`agent-reducer` 是一款为模型管理而生的第三方库。

它采用了以模型实例为基准的松散数据管理模式，这种模式相对于集成化状态管理更加灵活，耦合性更低。通过使用 `agent-reducer` 你可以很方便的实现一套组合度高，耦合度低的 `微mvvm` 架构群。

作为一个几乎无外部环境依赖的 javascript 库，`agent-reducer` 可以非常容易地集成到多种不同的渲染平台库中，如 [React](https://reactjs.org)，[原生支付宝小程序 hook 系统](https://github.com/shensai06/mini-hook)。


* [介绍](/zh/introduction.md)
* [引导](/zh/guides.md)
* [特性](/zh/feature.md)
* [高级用法](/zh/advanced.md)
* [体验](/zh/experience.md)
* [API 文档](/zh/api.md)
* [更新日志](/zh/changes.md)

# 注意

## ~~4.5.0 to 4.5.3~~

* [deprecated]  这些版本为 react 做出了一些不合理的牺牲，这并不符合 `agent-reducer` 库作为公允第三方库的初衷，所以，我们将回滚至 `4.4.0` 版本。对此，我们表示非常抱歉，望使用者原谅。

## 4.5.4

* [rollback] 回滚至 `4.4.0`.