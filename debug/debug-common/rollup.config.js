// import path from 'path';
// import { terser } from 'rollup-plugin-terser';
// import { string } from 'rollup-plugin-string';
// import replace from 'rollup-plugin-replace';
// import postcss from 'rollup-plugin-postcss';
import resolve from 'rollup-plugin-node-resolve';
// import preprocess from 'rollup-plugin-preprocess';
// import typescript from '@rollup/plugin-typescript';
import typescript from 'rollup-plugin-typescript2';
import babel from 'rollup-plugin-babel'



const outdir = "dist/";



export default function() {

    const bundle = {
        input: 'src/debug-common.ts',
        preserveModules: true,
        output: {
            dir: outdir + 'es/',
            format: 'es',
            indent: false,
            sourcemap: false,
        },
        external: [
          'tslib',
          '@mapray/mapray-js',
          '@mapray/ui',
        ],        
        plugins: [
            resolve(),
            typescript({
              tsconfig: './tsconfig.json',
              useTsconfigDeclarationDir: true,
              tsconfigOverride: {
                compilerOptions: {
                  outDir: outdir + 'es/',
                  sourceMap: false,
                  declaration: true,
                  declarationDir: outdir + 'es/@type',
                  declarationMap: true,
                }
              }
            }),
            // babel({ // this is for js file in src dir
            //   exclude: 'node_modules/**'
            // }),
        ],
    }

    return bundle;
}
