import path from 'path'
import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import { string } from 'rollup-plugin-string'
import replace from 'rollup-plugin-replace'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import preprocess from 'rollup-plugin-preprocess'
import commonjs from 'rollup-plugin-commonjs'
import fs from 'fs';
//import { getSourcePaths, addLocalSettings, makeExternalPredicate } from '../rollup.config.local.js'
import pkg from './package.json'


//>>> ../rollup.config.local.js
const localConfig = (appDir) => (
        [
            replace({
                '"@mapray/mapray-js"': JSON.stringify(appDir+"../node_modules/@mapray/mapray-js/src/index.js"),
                delimiters: ['', ''],
                exclude: appDir+"../packages/"
            }),
            replace({
                '"@mapray/ui"': JSON.stringify(appDir+"../node_modules/@mapray/ui/src/index.js"),
                delimiters: ['', ''],
                exclude: appDir+"../packages/"
            })
        ]
)

function getSourcePaths(appDir) {
    const mapray_js = fs.realpathSync(appDir + "../node_modules/@mapray/mapray-js");
    const ui        = fs.realpathSync(appDir + "../node_modules/@mapray/ui");
    return [
        mapray_js + "/src/**/*.js",
        mapray_js + "/src/**/*.vert",
        mapray_js + "/src/**/*.frag",
        ui + "/src/**/*.js",
    ];
}

function addLocalSettings(env, appDir, bundle) {
    let plugins = bundle.plugins.concat() // copy
    // should insert first replace method
    let index = plugins.findIndex(item => JSON.stringify(item) === '{"name":"commonjs"}' ? true : false)
    
    if (index === -1) {
        index = 0;
    }

    Array.prototype.splice.apply(plugins, [index, 0].concat(localConfig(appDir)))
    bundle.plugins = Object.assign(bundle.plugins, plugins)

    return bundle;
};

function makeExternalPredicate(externalArr) {
    if (externalArr.length === 0) {
        return () => false
    }
    const pattern = new RegExp(`^(${externalArr.join('|')})($|/)`)
    return id => pattern.test(id)
}
//<<< ../rollup.config.local.js



var outdir = "dist/"

const appDir = path.join(__dirname, '../')


let accessToken = '"<your access token here>"'
if (process.env.MAPRAY_ACCESS_TOKEN)  {
    accessToken = JSON.stringify(process.env.MAPRAY_ACCESS_TOKEN)
}

let bingAccessToken = '"<your Bing Maps Key here>"'
if (process.env.BINGMAP_ACCESS_TOKEN)  {
    bingAccessToken = JSON.stringify(process.env.BINGMAP_ACCESS_TOKEN)
}

const getPluginsConfig = (prod, format) => {
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
        preprocess({
                include: (
                    (process.env.local && format === "iife") ? [
                        "src/**/*.js",
                        ...getSourcePaths(appDir),
                    ]:
                    [
                        "src/**/*.js"
                    ]
                ),
                exclude: [], // disable default option (node_modules/**)
                context: {
                    BUILD: process.env.BUILD,
                }
        }),
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

const config = (build, format) => {
    const bundle = {
        input: 'src/index.js',
        output: { 
            file: `${outdir}bundle-${format}.js`,
            format: format, 
            indent: false,
            sourcemap: true
        }
    }
    bundle.plugins = getPluginsConfig(build, format)
    return bundle;
}

// get the setting when developing in local environment
const loadLocalSetting = (env, format) => {
    let bundle = config(env.BUILD, format)
    if (format === "umd") {
        bundle.external = makeExternalPredicate([
                ...Object.keys(pkg.dependencies || {}),
                ...Object.keys(pkg.peerDependencies || {})
        ]);
        bundle.globals = {
            '@mapray/mapray-js': 'mapray',
            '@mapray/ui': 'maprayui',
        };
    }
    else if (format === "iife") {
        bundle = addLocalSettings(env, appDir, bundle);
    }
    return bundle
}

const ADDITIONAL_SCRIPTS       = "<!--@ADDITIONAL_SCRIPTS@-->";
const ADDITIONAL_SCRIPTS_START = "<!--@ADDITIONAL_SCRIPTS_START@-->";
const ADDITIONAL_SCRIPTS_END   = "<!--@ADDITIONAL_SCRIPTS_END@-->";
const ADDITIONAL_SCRIPTS_PATTERN = new RegExp(ADDITIONAL_SCRIPTS);
const ADDITIONAL_SCRIPTS_START_END_PATTERN = new RegExp(ADDITIONAL_SCRIPTS_START + "([\\S\\s]*?)" + ADDITIONAL_SCRIPTS_END)

const updateHTML = () => {
    const htmlPath = "index-umd.html";
    if (!fs.existsSync(htmlPath)) return;
    let code = fs.readFileSync(htmlPath).toString();
    if (code.match(ADDITIONAL_SCRIPTS_PATTERN)) { // current code is not local mode
        if (process.env.local) {
            code = code.replace(new RegExp(ADDITIONAL_SCRIPTS),
                ADDITIONAL_SCRIPTS_START + "\n" +
                "    <script src=\"../../node_modules/@mapray/mapray-js/dist/umd/mapray.js\"></script>\n" +
                "    <script src=\"../../node_modules/@mapray/ui/dist/umd/maprayui.js\"></script>\n" +
                "    " + ADDITIONAL_SCRIPTS_END
            );
            fs.writeFileSync(htmlPath, code);
        }
    }
    else if (code.match(ADDITIONAL_SCRIPTS_START_END_PATTERN)) { // current code is local mode
        if (!process.env.local) {
            code = code.replace(ADDITIONAL_SCRIPTS_START_END_PATTERN, ADDITIONAL_SCRIPTS);
            fs.writeFileSync(htmlPath, code);
        }
    }
    else {
        console.log("couldn't find additional scripts region: " + htmlPath);
    }
}

module.exports = () => {
    updateHTML();
    if (process.env.local) {
        return [
          loadLocalSetting(process.env, "umd"),
          loadLocalSetting(process.env, "iife"),
        ]
    }
    return [
      config(process.env.BUILD, "umd"),
      config(process.env.BUILD, "iife"),
    ];
}
