import terser from '@rollup/plugin-terser'
import babel from '@rollup/plugin-babel'
import { string } from 'rollup-plugin-string'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import strip from '@rollup/plugin-strip';
import { base64 } from 'rollup-plugin-base64';
import typescript from 'rollup-plugin-typescript2';


const {BUILD, MINIFY} = process.env;
const production = BUILD === 'production';
const minified = MINIFY === 'true';
const extensions = ['**/*.vert', '**/*.frag', '**/*.glsl', '**/*.svg'];
const outdir = "dist/";
const outputFileUMD= umdBuildType(production, minified);

const strip_option = (
    production ?
    {
        include: '**/*.(ts|js)',
        debugger: false,
        functions: [ 'console.assert', 'cfa_assert' ],
        labels: [ 'ASSERT', 'DEBUG' ],
        sourceMap: true,
    }:
    {
        include: '**/*.(ts|js)',
        debugger: false,
        functions: [],
        labels: [],
        sourceMap: false,
    }
);

function umdBuildType(isProd, minified) {
  if (isProd) {
    if (minified) {
      return outdir + 'umd/mapray.min.js';
    }
    return outdir + 'umd/mapray.js';
  }

  return outdir + 'umd/mapray-dev.js'
}

console.log("production:" + production);
console.log("minify:" + minified);

export default [
  // ES
  {
    input: 'src/mapray.ts',
    output: {
      dir: outdir + 'es/',
      format: 'es',
      indent: false,
      sourcemap: production ? true : 'inline',
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external: [
      'mapbox-gl/dist/style-spec/index.es.js',
      'tslib',
    ],
    plugins: [
      resolve(),
      base64({
        include: '**/*.wasm'
      }),
      string({
        include: extensions
      }),
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
      strip(strip_option),
      minified ? terser() : false
    ]
  },
  // UMD
  {
    input: 'src/index.ts',
    output: {
      file: outputFileUMD,
      format: 'umd',
      name: 'mapray',
      exports: 'named',
      indent: false,
      sourcemap: production ? true : 'inline'
    },
    plugins: [
      resolve(),
      commonjs(),
      base64({
        include: '**/*.wasm'
      }),
      string({
        include: extensions
      }),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: {
            outDir: outdir + 'umd/',
            declarationDir: outdir + 'umd/@types',
            target: 'es5',
            module: 'es2015',
          }
        }
      }),
      strip(strip_option),
      babel({ // this is for js file in src dir
        exclude: 'node_modules/**'
      }),
      minified ? terser() : false
    ]
  }
]
