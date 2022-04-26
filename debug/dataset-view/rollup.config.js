import { terser } from "rollup-plugin-terser";
import replace from "rollup-plugin-replace";
import postcss from "rollup-plugin-postcss";
import resolve from "rollup-plugin-node-resolve";
import preprocess from "rollup-plugin-preprocess";
import injectProcessEnv from "rollup-plugin-inject-process-env";
// import typescript from "@rollup/plugin-typescript";
import typescript from "rollup-plugin-typescript2";



const outdir = "dist/";

const env = {
    MAPRAY_ACCESS_TOKEN:    process.env.MAPRAY_ACCESS_TOKEN,
    BINGMAP_ACCESS_TOKEN:   process.env.BINGMAP_ACCESS_TOKEN,
    MAPRAY_API_KEY:         process.env.MAPRAY_API_KEY,
    MAPRAY_API_USER_ID:     process.env.MAPRAY_API_USER_ID,
    MAPRAY_API_BASE_PATH:   process.env.MAPRAY_API_BASE_PATH,
    BINGMAP_ACCESS_TOKEN:   process.env.BINGMAP_ACCESS_TOKEN,
    DATASET_2D_ID:          process.env.DATASET_2D_ID,
    DATASET_3D_ID:          process.env.DATASET_3D_ID,
    DATASET_POINT_CLOUD_ID: process.env.DATASET_POINT_CLOUD_ID,
};

[
    "MAPRAY_ACCESS_TOKEN",
    "BINGMAP_ACCESS_TOKEN",
    "MAPRAY_API_KEY",
    "MAPRAY_API_USER_ID",
]
.forEach( key => { if ( !env[key] ) throw new Error( `${key} is missing` ); });



export default function() {

    const bundle = {
        input: "src/index.ts",
        output: {
            file: outdir + "bundle.js",
            format: "iife",
            indent: false,
            sourcemap: env.BUILD !== "production",
            name: "window",
            extend: true,
        },
        plugins: [
            {
                name: "watch-external",
                buildStart() {
                    this.addWatchFile( "node_modules/debug-common/dist/" );
                }
            },
            postcss(),
            injectProcessEnv( env ),
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
                tsconfig: "./tsconfig.json",
                tsconfigOverride: {
                    compilerOptions: {
                        sourceMap: true,
                    }
                }
            }),
            (env.BUILD === "production" ?
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
