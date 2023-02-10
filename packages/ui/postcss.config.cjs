module.exports = {
    plugins: [
        require('postcss-inline-svg'),
        require('cssnano')({
            preset: ['default', {
                svgo: {
                    plugins: [{
                        name: `preset-default`
                    }]
                },
            }],
        })
    ]
}
