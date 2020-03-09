import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

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
    input: 'src/index.js',
    output: { 
      file: outdir+'es/maprayui.js', 
      format: 'es', 
      indent: false,
      sourcemap: 'inline'
    },
    external: makeExternalPredicate([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ]),
    plugins: [
      commonjs(),
      resolve(),
      babel()
    ]
  },
  
  // ES for Browsers
  {
    input: 'src/index.js',
    output: { file: outdir+'es/maprayui.mjs', format: 'es', indent: false },
    external: makeExternalPredicate([
      ...Object.keys(pkg.peerDependencies || {})
    ]),
    plugins: [
      commonjs(),
      resolve(),
      babel({
        exclude: 'node_modules/**'
      }),
      terser()
    ]
  },
  
  // UMD Development
  {
    input: 'src/index.js',
    output: {
      file: outdir+'umd/maprayui.js',
      format: 'umd',
      name: 'maprayui',
      indent: false,
      sourcemap: true,
      globals: {
        '@mapray/mapray-js-dummy': 'mapray'
      }
    },
    external: ['@mapray/mapray-js-dummy'],
    plugins: [
      commonjs(),
      resolve(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
  
  // UMD Production
  {
    input: 'src/index.js',
    output: {
      file: outdir+'umd/maprayui.min.js',
      format: 'umd',
      name: 'maprayui',
      indent: false,
      globals: {
        '@mapray/mapray-js-dummy': 'mapray'
      }
    },
    external: ['@mapray/mapray-js-dummy'],
    plugins: [
      commonjs(),
      resolve(),
      babel({
        exclude: 'node_modules/**'
      }),
      terser()
    ]
  }
]
