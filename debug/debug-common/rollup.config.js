import pluginNodeResolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

const outdir = "dist/";

const { BUILD } = process.env;
const production = BUILD === 'production';

export default function() {

    const bundle = {
        input: 'src/debug-common.ts',
        output: {
            dir: outdir + 'es/',
            format: 'es',
            indent: false,
            sourcemap:  production ? true : 'inline',
            preserveModules: true
        },
        external: [
          'tslib',
          '@mapray/mapray-js',
          '@mapray/ui',
        ],
        plugins: [
            pluginNodeResolve(),
            typescript({
              tsconfig: './tsconfig.json',
              useTsconfigDeclarationDir: true,
              tsconfigOverride: {
                compilerOptions: {
                  outDir: outdir + 'es/',
                  declarationDir: outdir + 'es/@types',
                }
              }
            }),
        ],
    }

    return bundle;
}
