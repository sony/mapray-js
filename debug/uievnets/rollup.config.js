import path from 'path';
import { terser } from 'rollup-plugin-terser';
import { string } from 'rollup-plugin-string';
import replace from 'rollup-plugin-replace';
import postcss from 'rollup-plugin-postcss';
import resolve from 'rollup-plugin-node-resolve';
// import typescript from '@rollup/plugin-typescript';
import typescript from 'rollup-plugin-typescript2';



const outdir = "dist/";



export default function() {

    const isProd = process.env.BUILD === 'production';
    const maprayAccessToken = process.env.MAPRAY_ACCESS_TOKEN;
    const bingAccessToken = process.env.BINGMAP_ACCESS_TOKEN;

    const bundle = {
        input: 'src/index.ts',
        output: {
            file: outdir + 'bundle.js',
            format: 'iife',
            indent: false,
            sourcemap: !isProd,
            name: 'startApp',
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
            (bingAccessToken ?
                replace({
                        '"<your Bing Maps Key here>"': JSON.stringify( bingAccessToken ),
                        delimiters: ['', ''],
                }):
                null
            ),
            resolve(),
            typescript({
                "tsconfig": './tsconfig.json',
                "sourceMap": true,
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
            ),
        ],
    }

    return bundle;
}
