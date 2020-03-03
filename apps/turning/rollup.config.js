import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import postcss from 'rollup-plugin-postcss'

var outdir = "dist/"

let accessToken = '"<your access token here>"'
if (process.env.MAPRAY_ACCESS_TOKEN)  {
    accessToken = JSON.stringify(process.env.MAPRAY_ACCESS_TOKEN)
}

export default [
    // release
    {
        input: 'turning.js',
        output: { 
            file: outdir+'bundle.js', 
            format: 'iife', 
            indent: false
        },
        plugins: [
            postcss(),
            replace({
                '"<your access token here>"': accessToken,
                delimiters: ['', '']
            }),
            babel({
                exclude: 'node_modules/**'
            })
        ]
    }
]