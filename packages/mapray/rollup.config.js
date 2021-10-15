import { terser } from 'rollup-plugin-terser'
import babel from 'rollup-plugin-babel'
import { string } from 'rollup-plugin-string'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import strip from '@rollup/plugin-strip';
// import typescript from '@rollup/plugin-typescript'
import typescript from 'rollup-plugin-typescript2';



const extensions = ['**/*.vert', '**/*.frag', '**/*.glsl']
var outdir = "dist/"



const strip_option = (
    process.env.BUILD === "production" ?
    {
        debugger: false,
        functions: [ 'console.assert' ],
        labels: [ 'ASSERT', 'DEBUG' ],
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
    input: 'src/mapray.ts',
    preserveModules: true,
    output: {
      dir: outdir + 'es/',
      format: 'es',
      indent: false,
      sourcemap: false,
    },
    external: [
      'tslib',
    ],
    plugins: [
      resolve(),
      strip(strip_option),
      string({
        include: extensions
      }),
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
    input: 'src/mapray.ts',
    output: {
      file: outdir + 'es/mapray.mjs',
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
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            outDir: outdir + 'es/',
          }
        }
      }),
      terser()
    ]
  },

  // UMD Development
  {
    input: 'src/index.ts',
    output: {
      file: outdir + 'umd/mapray.js',
      format: 'umd',
      name: 'mapray',
      exports: 'named',
      indent: false,
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs(),
      strip(strip_option),
      string({
        include: extensions
      }),
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
      file: outdir + 'umd/mapray.min.js',
      format: 'umd',
      name: 'mapray',
      exports: 'named',
      indent: false,
    },
    plugins: [
      resolve(),
      commonjs(),
      strip(strip_option),
      string({
        include: extensions
      }),
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
