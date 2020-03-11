import path from 'path'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import { addLocalSettings } from '../rollup.config.local.js'

var outdir = "dist/"

let accessToken = '"<your access token here>"'
if (process.env.MAPRAY_ACCESS_TOKEN)  {
    accessToken = JSON.stringify(process.env.MAPRAY_ACCESS_TOKEN)
}

const config = () => (
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
            commonjs(),
            resolve(),
            babel({
                exclude: 'node_modules/**'
            })
        ]
    }
)

// get the setting when developing in local environment
const loadLocalSetting = (env) => {
    const appDir = path.join(__dirname, '../')
    let bundle = config()
    bundle = addLocalSettings(env, appDir, bundle)
    return bundle
}

export default () => {
    if (process.env.local) {
        return loadLocalSetting(process.env)
    }
    return config()
}
