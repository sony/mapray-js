import { terser } from 'rollup-plugin-terser'
import { string } from 'rollup-plugin-string'
import resolve from 'rollup-plugin-node-resolve'
import strip from '@rollup/plugin-strip';
import typescript from '@rollup/plugin-typescript'

const extensions = ['**/*.vert', '**/*.frag', '**/*.glsl']
var outdir = "dist/"

const strip_option = (
    process.env.BUILD === "production" ?
    {
        debugger: false,
        functions: [ 'console.assert' ],
        labels: [ 'ASSERT' ],
        sourceMap: true,
    }:
    {
        debugger: false,
        functions: [],
        labels: [],
        sourceMap: false,
    }
);

export default [  
  // ES
  {
    input: 'src/index.ts',
    output: { 
      file: outdir+'es/mapray.js', 
      format: 'es', 
      indent: false, 
      sourcemap: true
    },
    plugins: [
      resolve(),
      strip(strip_option),
      string({
        include: extensions
      }),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: outdir+'es/',
        sourceMap: true,
        declaration: true,
        declarationDir: '@type',
        declarationMap: true,
      }),
      terser()
    ]
  },
  
  // ES for Browsers
  {
    input: 'src/index.ts',
    output: {
      file: outdir+'es/mapray.mjs',
      format: 'es',
      indent: false,
    },
    plugins: [
      resolve(),
      strip(strip_option),
      string({
        include: extensions
      }),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: outdir+'es/',
      }),
      terser()
    ]
  },

  // UMD Development
  {
    input: 'src/index.ts',
    output: {
      file: outdir+'umd/mapray.js',
      format: 'umd',
      name: 'mapray',
      indent: false,
      sourcemap: true
    },
    plugins: [
      resolve(),
      strip(strip_option),
      string({
        include: extensions
      }),
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
    input: 'src/index.ts',
    output: {
      file: outdir+'umd/mapray.min.js',
      format: 'umd',
      name: 'mapray',
      indent: false
    },
    plugins: [
      resolve(),
      strip(strip_option),
      string({
        include: extensions
      }),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: outdir+'umd/',
      }),
      terser()
    ]
  }
]
