import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import pluginNodeResolve from '@rollup/plugin-node-resolve';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import typescript from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';



const outdir = "dist/";

const env = {
    MAPRAY_ACCESS_TOKEN: process.env.MAPRAY_ACCESS_TOKEN,
    BINGMAP_ACCESS_TOKEN: process.env.BINGMAP_ACCESS_TOKEN,
};

const { BUILD } = process.env;
const production = BUILD === 'production';

[
    "MAPRAY_ACCESS_TOKEN"
]
.forEach( key => { if ( !env[key] ) throw new Error( `${key} is missing` ); });



export default function() {

    const bundle = {
        input: 'src/App.ts',
        output: {
            file: outdir + 'bundle.js',
            format: 'iife',
            indent: false,
            sourcemap:  production ? true : 'inline',
            name: "App",
        },
        plugins: [
            postcss(),
            injectProcessEnv( env ),
            sourcemaps(),
            pluginNodeResolve(),
            typescript({
                tsconfig: './tsconfig.json',
            }),
            (production ?
                terser({
                    compress: {
                        unused: false,
                        collapse_vars: false,
                    },
                    output: {
                        comments: false,
                    },
                }):
                null
            ),
        ],
    }

    return bundle;
}
