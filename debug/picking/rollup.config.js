import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import resolve from 'rollup-plugin-node-resolve';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import typescript from 'rollup-plugin-typescript2';



const outdir = "dist/";

const env = {
    MAPRAY_ACCESS_TOKEN: process.env.MAPRAY_ACCESS_TOKEN,
    BINGMAP_ACCESS_TOKEN: process.env.BINGMAP_ACCESS_TOKEN,
};

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
            sourcemap: env.BUILD !== 'production',
            name: "App",
        },
        plugins: [
            postcss(),
            injectProcessEnv( env ),
            resolve(),
            typescript({
                tsconfig: './tsconfig.json',
                tsconfigOverride: {
                    compilerOptions: {
                        sourceMap: true,
                    }
                }
            }),
            (env.BUILD === 'production' ?
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
