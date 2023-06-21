import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import pluginNodeResolve from '@rollup/plugin-node-resolve';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import typescript from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';

const outdir = "dist/";

const env = {
    MAPRAY_ACCESS_TOKEN:  process.env.MAPRAY_ACCESS_TOKEN,
};

const { BUILD } = process.env;
const production = BUILD === 'production';

export default function() {

    const bundle = {
        input: 'src/index.ts',
        output: {
            file: outdir + 'bundle.js',
            format: 'iife',
            indent: false,
            sourcemap:  production ? true : 'inline',
            name: 'startApp',
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
                tsconfigOverride: {
                    compilerOptions: {
                        sourceMap: true,
                  }
                }
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
