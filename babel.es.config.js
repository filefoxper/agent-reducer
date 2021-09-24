module.exports = {
    plugins: [
        ["@babel/plugin-transform-runtime"],
        ['@babel/plugin-proposal-export-namespace-from'],
    ],
    presets: [
        '@babel/preset-typescript'
    ]
}