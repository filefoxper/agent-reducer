# 动机

state持久化工具`reducer`在state不可变系统中非常流行，比如：react、redux。`reducer` function 规范了一套不可修改state的数据推演机制，这让state的处理过程相当稳定，并让数据分流更加清晰。但`reducer`依然有它的一些小问题。比如需要通过dispatch一个`action`来传递参数，数据分流需要通过对`action.type`进行判断才能完成，这让整个处理过程变得有些繁琐。

如果我们可以通过调用class实例方法来完成dispatch action工作，那`reducer`处理流程将会被大大简化，于此同时我们应当保留`reducer`的最佳特性：通过`return`产生下一个state。

为此，我们创造了`agent-reducer`。

[下一节，概念](https://github.com/filefoxper/agent-reducer/blob/master/documents/zh/introduction/concept.md)