import terser from '@rollup/plugin-terser'
import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2';

const {BUILD, MINIFY} = process.env;
const production = BUILD === 'production';
const minified = MINIFY === 'true';
var outdir = "dist/";
const outputFileUMD= umdBuildType(production, minified);

function umdBuildType(isProd, minified) {
  if (isProd) {
    if (minified) {
      return outdir + 'umd/maprayui.min.js';
    }
    return outdir + 'umd/maprayui.js';
  }

  return outdir + 'umd/maprayui-dev.js'
}

export default [
  // ES
  {
    input: 'src/maprayui.ts',
    output: {
      dir: outdir + 'es/',
      format: 'es',
      indent: false,
      sourcemap: production ? true : 'inline',
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external: [
      'tslib',
      '@mapray/mapray-js',
    ],
    plugins: [
      resolve(),
      typescript({
        useTsconfigDeclarationDir: true,
        tsconfig: './tsconfig.json',
        tsconfigOverride: {
          compilerOptions: {
            outDir: outdir + 'es/',
            declarationDir: outdir + 'es/@types',
          }
        }
      }),
      minified ? terser() : false
    ]
  },
  // UMD
  {
    input: 'src/index.ts',
    output: {
      file: outputFileUMD,
      format: 'umd',
      name: 'maprayui',
      exports: 'named',
      indent: false,
      sourcemap: production ? true : 'inline'
    },
    external: [
      '@mapray/mapray-js'
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        useTsconfigDeclarationDir: true,
        tsconfig: './tsconfig.json',
        tsconfigOverride: {
          compilerOptions: {
            outDir: outdir + 'umd/',
            declarationDir: outdir + 'umd/@types',
            target: 'es5',
            module: 'es2015',
          }
        }
      }),
      babel({ // this is for js file in src dir
        exclude: 'node_modules/**'
      }),
      minified ? terser() : false
    ]
  }
]
