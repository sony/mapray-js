import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import typescript from 'rollup-plugin-typescript2';


const {BUILD, MINIFY} = process.env;
const production = BUILD === 'production';
const minified = MINIFY === 'true';
var outdir = "dist/";
const outputFileEsBrowser= mjsBuildType(production, minified);
const outputFileUMD= umdBuildType(production, minified);


function mjsBuildType(isProd, minified) {
  if (isProd) {
    if (minified) {
      return outdir + 'es/maprayui.min.mjs';
    }
    return outdir + 'es/maprayui.mjs';
  }

  return outdir + 'es/maprayui-dev.mjs'
}

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
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            outDir: outdir + 'es/',
            sourceMap: true,
            declaration: true,
            declarationDir: outdir + 'es/@type',
            declarationMap: true,
          }
        }
      }),
      minified ? terser() : false
    ]
  },

  // ES for Browsers
  {
    input: 'src/maprayui.ts',
    output: {
      file: outputFileEsBrowser,
      format: 'es',
      indent: false,
      sourcemap: production ? true : 'inline'
    },
    external: [
      '@mapray/mapray-js',
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            outDir: outdir + 'es/',
          }
        }
      }),
      minified ? terser() : false
    ],
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
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            outDir: outdir + 'umd/',
            sourceMap: true,
            declaration: true,
            declarationDir: outdir + 'umd/@type',
            declarationMap: true,
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
