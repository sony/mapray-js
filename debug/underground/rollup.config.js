import fs from 'node:fs';
import path from 'node:path';

import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import pluginNodeResolve from '@rollup/plugin-node-resolve';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import typescript from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';


const outdir = 'dist/';


function loadDotEnv( filePath ) {
    if ( !fs.existsSync( filePath ) ) {
        return {};
    }

    const source = fs.readFileSync( filePath, 'utf8' );
    const result = {};

    for ( const rawLine of source.split( /\r?\n/ ) ) {
        const line = rawLine.trim();
        if ( !line || line.startsWith( '#' ) ) {
            continue;
        }

        const separator = line.indexOf( '=' );
        if ( separator < 0 ) {
            continue;
        }

        const key = line.slice( 0, separator ).trim();
        const value = line.slice( separator + 1 ).trim().replace( /^['"]|['"]$/g, '' );
        result[key] = value;
    }

    return result;
}


const dotenv = loadDotEnv( path.resolve( '.env' ) );
const env = {
    MAPRAY_ACCESS_TOKEN: process.env.MAPRAY_ACCESS_TOKEN ?? dotenv.MAPRAY_ACCESS_TOKEN,
    DATASET_3D_ID: process.env.DATASET_3D_ID ?? dotenv.DATASET_3D_ID,
    DATASET_POINT_CLOUD_ID: process.env.DATASET_POINT_CLOUD_ID ?? dotenv.DATASET_POINT_CLOUD_ID,
};

const { BUILD } = process.env;
const production = BUILD === 'production';


export default function() {

    const bundle = {
        input: 'src/index.ts',
        output: {
            file: outdir + 'bundle.js',
            format: 'iife',
            indent: false,
            sourcemap: production ? true : 'inline',
            name: 'startApp',
        },
        plugins: [
            postcss(),
            injectProcessEnv( env, {
                include: ['./src/**/*.ts'],
            } ),
            sourcemaps(),
            pluginNodeResolve(),
            typescript( {
                tsconfig: './tsconfig.json',
                clean: true,
                tsconfigOverride: {
                    compilerOptions: {
                        sourceMap: true,
                    }
                }
            } ),
            ( production ?
                terser( {
                    compress: {
                        unused: false,
                        collapse_vars: false,
                    },
                    output: {
                        comments: false,
                    },
                } ) :
                null
            ),
        ],
    };

    return bundle;
}
