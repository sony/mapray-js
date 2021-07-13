import path from 'path';
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import postcss from 'rollup-plugin-postcss';
import resolve from 'rollup-plugin-node-resolve';



const outdir = "dist/";



export default () => {

    const isProd = process.env.BUILD === 'production';
    const maprayAccessToken = process.env.MAPRAY_ACCESS_TOKEN;

    const bundle = {
        input: 'src/index.js',
        output: {
            file: outdir + 'bundle.js',
            format: 'iife',
            indent: false,
            sourcemap: !isProd,
        },
        plugins: [
            postcss(),
            (maprayAccessToken ?
                replace({
                    '"<your access token here>"': JSON.stringify( maprayAccessToken ),
                    delimiters: ['', ''],
                }):
                null
            ),
            resolve(),
            babel({
                exclude: 'node_modules/**',
            }),
            (isProd ?
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
            )
        ]
    }

    return bundle;
}
