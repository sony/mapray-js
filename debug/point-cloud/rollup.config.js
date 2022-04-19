import path from 'path';
import { terser } from 'rollup-plugin-terser';
import { string } from 'rollup-plugin-string';
import replace from 'rollup-plugin-replace';
import postcss from 'rollup-plugin-postcss';
import resolve from 'rollup-plugin-node-resolve';
import preprocess from 'rollup-plugin-preprocess';
// import typescript from '@rollup/plugin-typescript';
import typescript from 'rollup-plugin-typescript2';



const outdir = "dist/";



export default function() {

    const isProd = process.env.BUILD === 'production';
    const maprayAccessToken = process.env.MAPRAY_ACCESS_TOKEN;
    const bingAccessToken = process.env.BINGMAP_ACCESS_TOKEN;
    const maprayApiUserID = process.env.MAPRAY_API_USER_ID;
    const datasetPointCloudID = process.env.DATASET_POINT_CLOUD_ID;

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
            (bingAccessToken ?
                replace({
                    '"<your Bing Maps Key here>"': JSON.stringify( bingAccessToken ),
                    delimiters: ['', ''],
                }):
                null
            ),
            (maprayApiUserID ?
                replace({
                    '"<your user id>"': JSON.stringify( maprayApiUserID ),
                    delimiters: ["", ""],
                }):
                null
            ),
            (datasetPointCloudID ?
                replace({
                    '"<point cloud dataset id>"': JSON.stringify( datasetPointCloudID ),
                    delimiters: ["", ""],
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
