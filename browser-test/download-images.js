import https from 'https';
import fs from 'fs';
import exit from 'process';

const write_path = './golden-images/pw.test.ts-snapshots';

const server_path = 'https://resource.mapray.com/tests/img';

const files = [
    'flat-surface-jp-chromium-darwin.png',
    'flat-wire-jp-chromium-darwin.png',
    'flat-surface-us-chromium-darwin.png',
    'flat-wire-us-chromium-darwin.png',
    'flat-surface-sa-chromium-darwin.png',
    'flat-wire-sa-chromium-darwin.png',
    'flat-surface-sa-fov-chromium-darwin.png',
    'entity-line-chromium-darwin.png',
    'entity-2d3d-chromium-darwin.png',
    'entity-pc-chromium-darwin.png',
    'entity-b3d-chromium-darwin.png',
    'basic-jp-chromium-darwin.png',
    'basic-us-chromium-darwin.png',
    'basic-sa-chromium-darwin.png',
    'basic-atmosphere-chromium-darwin.png',
    'flat-surface-jp-chromium-linux.png',
    'flat-wire-jp-chromium-linux.png',
    'flat-surface-us-chromium-linux.png',
    'flat-wire-us-chromium-linux.png',
    'flat-surface-sa-chromium-linux.png',
    'flat-wire-sa-chromium-linux.png',
    'flat-surface-sa-fov-chromium-linux.png',
    'entity-line-chromium-linux.png',
    'entity-2d3d-chromium-linux.png',
    'entity-pc-chromium-linux.png',
    'entity-b3d-chromium-linux.png',
    'basic-jp-chromium-linux.png',
    'basic-us-chromium-linux.png',
    'basic-sa-chromium-linux.png',
    'basic-atmosphere-chromium-linux.png',
];


async function downloadFile( file ) {
    const url = ( process.env.IMAGE_SERVER_PATH ?? server_path ) + '/' + file;
    const file_name = write_path + '/' + file;
    return new Promise( ( resolve ) => {
        let data ='';
        https.get( url, ( res ) => {
            const status_code = res.statusCode ?? 999;
            if ( status_code === 200 ) {
                const file_stream = fs.createWriteStream( file_name );
                res.pipe( file_stream );

                file_stream.on( 'finish', () => {
                    file_stream.close();
                    resolve( true );
                });
            }
            else {
                resolve( false );
            }
        });
    });
}


async function main() {
    try {
        if ( !fs.existsSync( write_path ) ) {
            fs.mkdirSync( write_path );
        }

        for ( let i = 0; i < files.length; i++ ) {
            const file = files[i];
            console.log( 'download file (' + ( i + 1 ) + '/' + files.length + '): ' + file);
            const result = await downloadFile( file );
            if ( !result ) {
                console.log( 'Download Error.' );
                exit();
            }
        }
        console.log ( 'Download completed.' );
    } catch ( error ) {
        console.log( error );
    }
}


main();
