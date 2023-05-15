import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import resolve from "rollup-plugin-node-resolve";
import injectProcessEnv from "rollup-plugin-inject-process-env";
import typescript from "rollup-plugin-typescript2";



const env = {
    MAPRAY_API_KEY:    process.env.MAPRAY_API_KEY,
};

[
    "MAPRAY_API_KEY",
]
.forEach( key => { if ( !env[key] ) throw new Error( `${key} is missing` ); });


const plugins = [
    postcss(),
    injectProcessEnv( env ),
    resolve(),
    typescript({
        tsconfig: "./tsconfig.json",
        tsconfigOverride: {
            compilerOptions: {
                sourceMap: true,
            }
        }
    }),
    (process.env.BUILD === "production" ?
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
]


const tests = [
    "basic_tester",
    "flat_tester",
];


export default tests.map(test => ({
        input: test + "/src/App.ts",
        output: {
            file: test + "/dist/bundle.js",
            format: "iife",
            indent: false,
            sourcemap: process.env.BUILD !== "production",
            name: "App",
        },
        plugins: plugins,
}));
