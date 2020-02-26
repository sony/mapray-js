import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import { string } from 'rollup-plugin-string'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const extensions = ['**/*.vert', '**/*.frag', '**/*.glsl']
var outdir = "dist/";

export default [  
  // ES
  {
    input: 'src/index.js',
    output: { file: outdir+'es/mapray.js', format: 'es', indent: false },
    plugins: [
      commonjs(),
      resolve(),
      string({
        include: extensions
      }),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
  
  // ES for Browsers
  {
    input: 'src/index.js',
    output: { file: outdir+'es/mapray.mjs', format: 'es', indent: false },
    plugins: [
      commonjs(),
      resolve(),
      string({
        include: extensions
      }),
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
      file: outdir+'umd/mapray.js',
      format: 'umd',
      name: 'mapray',
      indent: false,
      sourcemap: true
    },
    plugins: [
      commonjs(),
      resolve(),
      string({
        include: extensions
      }),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
  
  // UMD Production
  {
    input: 'src/index.js',
    output: {
      file: outdir+'umd/mapray.min.js',
      format: 'umd',
      name: 'mapray',
      indent: false
    },
    plugins: [
      commonjs(),
      resolve(),
      string({
        include: extensions
      }),
      babel({
        exclude: 'node_modules/**'
      }),
      terser()
    ]
  }
]
