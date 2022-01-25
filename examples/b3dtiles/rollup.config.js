import { terser } from 'rollup-plugin-terser';
import replace from 'rollup-plugin-replace';
import postcss from 'rollup-plugin-postcss';
import preprocess from 'rollup-plugin-preprocess';
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve'

const outdir = "dist/";

export default function() {

    const isProd = process.env.BUILD === 'production';
    const maprayAccessToken = process.env.MAPRAY_ACCESS_TOKEN;

    const bundle = {
        input: 'src/index.ts',
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
            preprocess({
                include: ([
                    "src/**/*.js"
                ]),
                exclude: [], // disable default option (node_modules/**)
                context: {
                    BUILD: process.env.BUILD,
                }
            }),
            typescript({
                tsconfig: './tsconfig.json',
                tsconfigOverride: {
                    compilerOptions: {
                        sourceMap: true,
                    }
                }
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
