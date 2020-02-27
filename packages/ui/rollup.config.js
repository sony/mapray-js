import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

var outdir = "dist/";

export default [  
  // ES
  {
    input: 'src/index.js',
    output: { file: outdir+'es/maprayui.js', format: 'es', indent: false },
    plugins: [
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
  
  // ES for Browsers
  {
    input: 'src/index.js',
    output: { file: outdir+'es/maprayui.mjs', format: 'es', indent: false },
    plugins: [
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
      name: 'mapray',
      indent: false,
      sourcemap: true
    },
    plugins: [
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
      name: 'mapray',
      indent: false
    },
    plugins: [
      babel({
        exclude: 'node_modules/**'
      }),
      terser()
    ]
  }
]
