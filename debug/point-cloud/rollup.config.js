import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import pluginNodeResolve from '@rollup/plugin-node-resolve';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import typescript from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';

const outdir = "dist/";

const env = {
    MAPRAY_ACCESS_TOKEN:    process.env.MAPRAY_ACCESS_TOKEN,
    MAPRAY_API_KEY:         process.env.MAPRAY_API_KEY,
    MAPRAY_API_USER_ID:     process.env.MAPRAY_API_USER_ID,
    MAPRAY_API_BASE_PATH:   process.env.MAPRAY_API_BASE_PATH,
    BINGMAP_ACCESS_TOKEN:   process.env.BINGMAP_ACCESS_TOKEN,
    DATASET_POINT_CLOUD_ID: process.env.DATASET_POINT_CLOUD_ID,
};

const { BUILD } = process.env;
const production = BUILD === 'production';

[
    "MAPRAY_ACCESS_TOKEN",
    "MAPRAY_API_KEY",
    "MAPRAY_API_USER_ID",
    "DATASET_POINT_CLOUD_ID",
]
.forEach( key => { if ( !env[key] ) throw new Error( `${key} is missing` ); });



export default function() {

    const bundle = {
      input: 'src/index.ts',
      output: {
        file: outdir + 'bundle.js',
            format: 'iife',
            indent: false,
            sourcemap:  production ? true : 'inline',
        },
        plugins: [
            postcss(),
            injectProcessEnv( env, {
                    // This plugin inserts a line into all included source codes.
                    // The following option prevents the effect from being applied to the core library.
                    include: ["./src/**/*.ts"],
            }),
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
