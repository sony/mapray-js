import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import replace from 'rollup-plugin-replace'
import resolve from 'rollup-plugin-node-resolve'

import pkg from './package.json'
const extensions = ['.vert', '.frag', '.glsl']

var outdir = "dist/";

const makeExternalPredicate = externalArr => {
  if (externalArr.length === 0) {
    return () => false
  }
  const pattern = new RegExp(`^(${externalArr.join('|')})($|/)`)
  return id => pattern.test(id)
}

export default [
  // CommonJS
  {
    input: 'src/index.js',
    output: { file: outdir+'lib/mapray.js', format: 'cjs', indent: false },
    external: makeExternalPredicate([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ]),
    plugin: [
        resolve(),
        babel({
          extensions,
          plugins: [
              ['raw-loader']
          ],
          runtimeHelpers: true
      })
    ]
  },
  
  // ES
  {
    input: 'src/index.js',
    output: { file: outdir+'es/mapray.js', format: 'es', indent: false },
    plugin: [
      resolve(),
      babel({
        extensions,
        plugins: [
          ['raw-loader']
        ],
        runtimeHelpers: true
      })
    ]
  },
  
  // ES for Browsers
  {
    input: 'src/index.js',
    output: { file: 'es/mapray.mjs', format: 'es', indent: false },
    plugins: [
      resolve(),
      babel({
        extensions,
        plugins: [
          ['raw-loader']
        ],
        runtimeHelpers: true
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ]
  },
  
  // UMD Development
  {
    input: 'src/index.js',
    output: {
      file: outdir+'dist/redux.js',
      format: 'umd',
      name: 'mapray',
      indent: false
    },
    plugins: [
      resolve(),
      babel({
        extensions,
        plugins: [
          ['raw-loader']
        ],
        runtimeHelpers: true
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('development')
      })
    ]
  },
  
  // UMD Production
  {
    input: 'src/index.js',
    output: {
      file: outdir+'dist/redux.min.js',
      format: 'umd',
      name: 'mapray',
      indent: false
    },
    plugins: [
      resolve(),
      babel({
        extensions,
        plugins: [
          ['raw-loader']
        ],
        runtimeHelpers: true
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ]
  }
]

