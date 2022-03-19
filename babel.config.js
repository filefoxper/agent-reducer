module.exports = (api) => {
    return api.env('test') ?{
        plugins: [
            ["@babel/plugin-transform-runtime"],
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            [
                '@babel/plugin-proposal-class-properties',
                {loose: true},
            ]
        ],
        presets: [
            [
                '@babel/preset-env',
                {
                    targets: {
                        node: 'current'
                    }
                },
            ],
            '@babel/preset-typescript'
        ]
    }:{
        plugins: [
            ["@babel/plugin-transform-runtime"],
            ['@babel/plugin-proposal-decorators', { legacy: true }],
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
                        "browsers": ["ie >=11"]
                    },
                    useBuiltIns: "usage",
                    corejs: {version: 3, proposals: true}
                }
            ],
            '@babel/preset-typescript'
        ]
    }
}