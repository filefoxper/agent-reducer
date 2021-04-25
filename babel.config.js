module.exports = (api) => {
    return api.env('test') ?{
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
                    targets: {
                        node: 'current'
                    }
                }
            ]
        ]
    }:{
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
                        "browsers": ["last 2 versions", "ie >=9"]
                    },
                    useBuiltIns: "usage",
                    corejs: {version: 3, proposals: true}
                }
            ],
            '@babel/preset-typescript'
        ]
    }
}