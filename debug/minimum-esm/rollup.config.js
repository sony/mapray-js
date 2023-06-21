import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import pluginNodeResolve from '@rollup/plugin-node-resolve';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import sourcemaps from 'rollup-plugin-sourcemaps';

const outdir = "dist/";

const env = {
    MAPRAY_ACCESS_TOKEN:    process.env.MAPRAY_ACCESS_TOKEN
};

[
    "MAPRAY_ACCESS_TOKEN",
]
    .forEach( key => { if ( !env[key] ) throw new Error( `${key} is missing` ); });

export default function() {

    const bundle = {
        input: 'src/index.js',
        output: {
            file: outdir + 'bundle.js',
            format: 'module',
            indent: false,
            sourcemap: process.env.BUILD !== 'production',
            name: "App",
        },
        plugins: [
            postcss(),
            injectProcessEnv( env, {
                    // This plugin inserts a line into all included source codes.
                    // The following option prevents the effect from being applied to the core library.
                    include: ["./src/**/*.js"],
            }),
            sourcemaps(),
            pluginNodeResolve(),
            (process.env.BUILD === 'production' ?
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
