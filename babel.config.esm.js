module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                modules: false,
                shippedProposals: true,
                useBuiltIns: 'usage',
                corejs: 3,
                targets: {
                    chrome: '77',
                },
                include: ['transform-block-scoping'],
            },
        ],
        '@babel/preset-typescript',
    ],
};
