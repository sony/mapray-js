import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
// import typescript from '@rollup/plugin-typescript'
import typescript from 'rollup-plugin-typescript2';

import pkg from './package.json'

var outdir = "dist/";

const makeExternalPredicate = externalArr => {
  if (externalArr.length === 0) {
    return () => false
  }
  const pattern = new RegExp(`^(${externalArr.join('|')})($|/)`)
  return id => pattern.test(id)
}

export default [  
  // ES
  {
    input: 'src/maprayui.ts',
    output: { 
      file: outdir+'es/maprayui.js', 
      format: 'es', 
      indent: false,
      sourcemap: true
    },
    external: makeExternalPredicate([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ]),
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: outdir+'es/',
        sourceMap: true,
        declaration: true,
        declarationDir: '@type',
        declarationMap: true,
      }),
    ]
  },
  
  // ES for Browsers
  {
    input: 'src/maprayui.ts',
    output: {
      file: outdir+'es/maprayui.mjs',
      format: 'es',
      indent: false
    },
    external: makeExternalPredicate([
      ...Object.keys(pkg.peerDependencies || {})
    ]),
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: outdir+'es/',
      }),
      terser()
    ]
  },
  
  // UMD Development
  {
    input: 'src/maprayui.ts',
    output: {
      file: outdir+'umd/maprayui.js',
      format: 'umd',
      name: 'maprayui',
      indent: false,
      sourcemap: true,
      globals: {
        '@mapray/mapray-js': 'mapray'
      }
    },
    external: ['@mapray/mapray-js'],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: outdir+'umd/',
        sourceMap: true,
        declaration: true,
        declarationDir: '@type',
        declarationMap: true,
      })
    ]
  },
  
  // UMD Production
  {
    input: 'src/maprayui.ts',
    output: {
      file: outdir+'umd/maprayui.min.js',
      format: 'umd',
      name: 'maprayui',
      indent: false,
      globals: {
        '@mapray/mapray-js': 'mapray'
      }
    },
    external: ['@mapray/mapray-js'],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: outdir+'umd/',
      }),
      terser()
    ]
  }
]
