import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
// import typescript from '@rollup/plugin-typescript'
import typescript from 'rollup-plugin-typescript2';

import pkg from './package.json'

var outdir = "dist/";



export default [
  // ES
  {
    input: 'src/maprayui.ts',
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
    ]
  },
  
  // ES for Browsers
  {
    input: 'src/maprayui.ts',
    output: {
      file: outdir + 'es/maprayui.mjs',
      format: 'es',
      indent: false,
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
      terser(),
    ],
  },

  // UMD Development
  {
    input: 'src/index.ts',
    output: {
      file: outdir + 'umd/maprayui.js',
      format: 'umd',
      name: 'maprayui',
      exports: 'named',
      indent: false,
      sourcemap: true
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
            declarationMap: false,
            target: 'es5',
            module: 'es2015',
          }
        }
      }),
      babel({ // this is for js file in src dir
        exclude: 'node_modules/**'
      }),
    ]
  },

  // UMD Production
  {
    input: 'src/index.ts',
    output: {
      file: outdir + 'umd/maprayui.js',
      format: 'umd',
      name: 'maprayui',
      exports: 'named',
      indent: false,
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
            target: 'es5',
            module: 'es2015',
          }
        }
      }),
      babel({ // this is for js file in src dir
        exclude: 'node_modules/**'
      }),
    ]
  },
]
