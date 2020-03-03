import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'

var outdir = "dist/"

console.log("MAPRAY_ACCESS_TOKEN:" + JSON.stringify(process.env.MAPRAY_ACCESS_TOKEN));

let accessToken = '"<your access token here>"'
if (process.env.MAPRAY_ACCESS_TOKEN)  {
    accessToken = JSON.stringify(process.env.MAPRAY_ACCESS_TOKEN)
}

export default [
    // release
    {
        input: 'src/index.js',
        output: { 
            file: outdir+'bundle.js', 
            format: 'iife', 
            indent: false
        },
        plugins: [
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