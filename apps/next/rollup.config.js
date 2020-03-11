import path from 'path'
import { terser } from 'rollup-plugin-terser'
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

let bingAccessToken = '"<your Bing Maps Key here>"'
if (process.env.BINGMAP_ACCESS_TOKEN)  {
    bingAccessToken = JSON.stringify(process.env.BINGMAP_ACCESS_TOKEN)
}

const getPluginsConfig = (prod) => {
    const params = [
        postcss(),
        replace({
            '"<your access token here>"': accessToken,
            delimiters: ['', '']
        }),
        replace({
            '"<your Bing Maps Key here>"': bingAccessToken,
            delimiters: ['', '']
        }),
        commonjs(),
        resolve(),
        babel({
            exclude: 'node_modules/**'
        })
    ]

    if (prod) {
        params.push(
            terser({
                compress: {
                    unused: false,
                    collapse_vars: false,
                },
                output: {
                    comments: false,
                },
            })
        )
    }

    return params;
}

const config = (build) => {
    const bundle = {
        input: 'src/index.js',
        output: { 
            file: outdir+'bundle.js', 
            format: 'iife', 
            indent: false,
            sourcemap: true
        }
    }
    bundle.plugins = getPluginsConfig(build)
    return bundle;
}

// get the setting when developing in local environment
const loadLocalSetting = (env) => {
    const appDir = path.join(__dirname, '../')
    let bundle = config(env.BUILD)
    bundle = addLocalSettings(env, appDir, bundle)
    return bundle
}

module.exports = () => {
    if (process.env.local) {
        return loadLocalSetting(process.env)
    }
    return config(process.env.BUILD);
}