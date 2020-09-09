import path from 'path'
import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import { string } from 'rollup-plugin-string'
import replace from 'rollup-plugin-replace'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import strip from '@rollup/plugin-strip';
import fs from 'fs';
import { makeExternalPredicate } from '../rollup.config.local.js'
import pkg from './package.json'


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
        (process.env.local && prod ?
            strip({
                    include: [
                        'src/**/*.js',
                    ],
                    debugger: false,
                    functions: [ 'console.assert' ],
                    labels: [ 'ASSERT' ],
                    sourceMap: true,
            })
        : null),
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
            format: 'umd', 
            indent: false,
            sourcemap: true
        }
    }
    bundle.plugins = getPluginsConfig(build === 'production')
    return bundle;
}

// get the setting when developing in local environment
const loadLocalSetting = (env) => {
    const appDir = path.join(__dirname, '../')
    let bundle = config(env.BUILD)
    bundle.external = makeExternalPredicate([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {})
    ]);
    bundle.globals = {
      '@mapray/mapray-js': 'mapray',
      '@mapray/ui': 'maprayui',
    };
    return bundle
}


const ADDITIONAL_SCRIPTS       = "<!--@ADDITIONAL_SCRIPTS@-->";
const ADDITIONAL_SCRIPTS_START = "<!--@ADDITIONAL_SCRIPTS_START@-->";
const ADDITIONAL_SCRIPTS_END   = "<!--@ADDITIONAL_SCRIPTS_END@-->";
const ADDITIONAL_SCRIPTS_PATTERN = new RegExp(ADDITIONAL_SCRIPTS);
const ADDITIONAL_SCRIPTS_START_END_PATTERN = new RegExp(ADDITIONAL_SCRIPTS_START + "([\\S\\s]*?)" + ADDITIONAL_SCRIPTS_END)

const updateHTML = () => {
    const path = "index.html";
    let code = fs.readFileSync(path).toString();
    if (code.match(ADDITIONAL_SCRIPTS_PATTERN)) { // current code is not local mode
        if (process.env.local) {
            code = code.replace(new RegExp(ADDITIONAL_SCRIPTS),
                ADDITIONAL_SCRIPTS_START + "\n" +
                "    <script src=\"../../node_modules/@mapray/mapray-js/dist/umd/mapray.js\"></script>\n" +
                "    <script src=\"../../node_modules/@mapray/ui/dist/umd/maprayui.js\"></script>\n" +
                "    " + ADDITIONAL_SCRIPTS_END
            );
            fs.writeFileSync(path, code);
        }
    }
    else if (code.match(ADDITIONAL_SCRIPTS_START_END_PATTERN)) { // current code is local mode
        if (!process.env.local) {
            code = code.replace(ADDITIONAL_SCRIPTS_START_END_PATTERN, ADDITIONAL_SCRIPTS);
            fs.writeFileSync(path, code);
        }
    }
    else {
        console.log("couldn't find additional scripts region: " + path);
    }
}

module.exports = () => {
    updateHTML();
    if (process.env.local) {
        return loadLocalSetting(process.env)
    }
    return config(process.env.BUILD);
}