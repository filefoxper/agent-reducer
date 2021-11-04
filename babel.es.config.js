module.exports = {
    plugins: [
        ["@babel/plugin-transform-runtime"],
        ['@babel/plugin-proposal-export-namespace-from'],
        ["@babel/plugin-proposal-private-property-in-object", { "loose": true }],
        ["@babel/plugin-proposal-private-methods", { "loose": true }],
        [
            '@babel/plugin-proposal-class-properties',
            {loose: true},
        ]
    ],
    presets: [
        [
            '@babel/preset-env',
            {
                modules: false
            }
        ],
        '@babel/preset-typescript',
    ]
}