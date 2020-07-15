import path from 'path'
import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import { string } from 'rollup-plugin-string'
import replace from 'rollup-plugin-replace'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

var outdir = "dist/"

let accessToken = '"<your access token here>"'
if (process.env.MAPRAY_ACCESS_TOKEN)  {
    accessToken = JSON.stringify(process.env.MAPRAY_ACCESS_TOKEN)
}

let bingAccessToken = '"<your Bing Maps Key here>"'
if (process.env.BINGMAP_ACCESS_TOKEN)  {
    bingAccessToken = JSON.stringify(process.env.BINGMAP_ACCESS_TOKEN)
}

const localConfig = (appDir) => (
    [
        replace({
            '"@mapray/mapray-js"': JSON.stringify(appDir+"../node_modules/@mapray/mapray-js/src/index.js"),
            delimiters: ['', ''],
            exclude: appDir+"../packages/"
        }),
        replace({
            '"@mapray/mapray-js"': JSON.stringify(appDir+"../../node_modules/@mapray/mapray-js/src/index.js"),
            delimiters: ['', ''],
            include: appDir+"../packages/"
        }),
        replace({
            '"@mapray/ui"': JSON.stringify(appDir+"../node_modules/@mapray/ui/src/index.js"),
            delimiters: ['', ''],
            exclude: appDir+"../packages/"
        })
    ]
)

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
        string({
                include: [
                    '../../**/*.vert',
                    '../../**/*.frag',
                ]
        }),
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
        input: 'src/App.js',
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

const addLocalSettings= (env, appDir, bundle) => {
    let plugins = bundle.plugins.concat() // copy
    // should insert first replace method
    let index = plugins.findIndex(item => JSON.stringify(item) === '{"name":"commonjs"}' ? true : false)

    if (index === -1) {
        index = 0;
    }

    Array.prototype.splice.apply(plugins, [index, 0].concat(localConfig(appDir)))
    bundle.plugins = Object.assign(bundle.plugins, plugins)

    return bundle;
}

module.exports = () => {
    if (process.env.local) {
        return loadLocalSetting(process.env)
    }
    return config(process.env.BUILD);
}