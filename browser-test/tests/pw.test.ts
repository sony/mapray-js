// tests/pw.test.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';

import type { mapray, BasicTesterGlobal, FlatTesterGlobal } from "../apps/";


// check snapshots
const dirPath = './golden-images/pw.test.ts-snapshots';
const files = fs.readdirSync( dirPath )
if ( files.length === 0 ) {
    throw new Error(
        'No comparison images. You must get or create comparison images.\n' +
        'Execute the following command.\n' +
        'yarn test-setup\n'
    );
}



const BASE_URL = "http://localhost:7070/";



test( 'flat', async ( { page } ) => {
    const app_url = BASE_URL + 'apps/flat_tester/';
    const pixel_diff = 780;

    // jp
    await gotoPage( page, app_url );
    await waitAndShapshot( page, 'flat-surface-jp.png', pixel_diff );

    await changeRenderMode( page, "wireframe" );
    await waitAndShapshot( page, 'flat-wire-jp.png', pixel_diff );

    await changeRenderMode( page, "surface" );

    // us
    await gotoPage( page, app_url + '#36.1518162343/-112.0098504417/1960.91791a/73.12717t/57911.60625r/-20.46415h' );
    await waitAndShapshot( page, 'flat-surface-us.png', pixel_diff );

    await changeRenderMode( page, "wireframe" );
    await waitAndShapshot( page, 'flat-wire-us.png', pixel_diff );

    await changeRenderMode( page, "surface" );

    // sa
    await gotoPage( page, app_url + '#-33.6467295048/21.3060654199/480.49364a/66.87765t/268793.20919r/9.25171h' );
    await waitAndShapshot( page, 'flat-surface-sa.png', pixel_diff );
    await changeRenderMode( page, "wireframe" );
    await waitAndShapshot( page, 'flat-wire-sa.png', pixel_diff );

    // fov
    await changeRenderMode( page, "surface" );
    await page.evaluateHandle( () => {
        const { app } = window as unknown as FlatTesterGlobal;
        app.setCameraParameter( { fov: 100.0 } );
    });
    await waitAndShapshot( page, 'flat-surface-sa-fov.png', pixel_diff );

});



test( 'entity', async ( { page } ) => {
    const app_url = BASE_URL + 'apps/flat_tester/';
    const pixel_diff = 780;

    await gotoPage( page, app_url );
    // disable surface
    await page.evaluate( () => {
        const { mapray, app } = window as unknown as FlatTesterGlobal;
        app.viewer.setVisibility( mapray.Viewer.Category.GROUND, false );
    });
    // load 2D & 3D
    await page.evaluate( () => {
        const { app } = window as unknown  as FlatTesterGlobal;
        app.addMarkerLineEntity();
        app.addImageIconEntity();
        app.add2DEntity();
        app.add3DEntity();
    });
    await waitAndShapshot( page, 'entity-line.png', pixel_diff );

    // 2D (Pin/Path/Polygon) & 3D (Model)
    await gotoPage( page, app_url + '#35.2892866244/138.8453707909/742.61400a/75.04498t/53667.33246r/73.07741h');
    await waitAndShapshot( page, 'entity-2d3d.png', pixel_diff );

    // PointCloud
    await gotoPage( page, app_url + '#35.5663825590/139.4034165561/114.60596a/74.51198t/432.99670r/12.80000h');
    // clear entities
    await page.evaluate( () => {
        const { app } = window as unknown as BasicTesterGlobal;
        const entity_count = app.getEntityNum();
        for ( let i = 0; i < entity_count ; i++ ) {
            app.getEntity(i).setVisibility( false );
        }
    });
    // load point cloud
    await page.evaluate( () => {
        const { app } = window as unknown as BasicTesterGlobal;
        app.addPointCloud();
    });
    await waitAndShapshot( page, 'entity-pc.png', pixel_diff );

    // B3d
    await gotoPage( page, app_url + '#35.6420029924/139.7488512803/3.16785a/62.68040t/1662.34885r/5.59657h');
    // load b3d
    await page.evaluate( () => {
        const { app } = window as unknown as BasicTesterGlobal;
        app.addB3d();
    });
    await waitAndShapshot( page, 'entity-b3d.png', pixel_diff );
});



test( 'basic', async ( { page } ) => {
    const app_url = BASE_URL + 'apps/basic_tester/';
    const pixel_diff = 780;

    // jp (Markerline & ImageIcon)
    await gotoPage( page, app_url );
    await waitAndShapshot( page, 'basic-jp.png', pixel_diff );

/*  pin test is disable now
    // click to set pin
    await page.keyboard.down('Control');
    await page.mouse.move(512, 400);
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.up('Control', { delay: 500 });
    await expect(page).toHaveScreenshot('basic-click-pin.png');

    // click to change pin color
    await page.keyboard.down('Shift');
    await page.mouse.move(512, 400);
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.up('Shift', { delay: 500 });
    await expect(page).toHaveScreenshot('basic-click-pin2.png');
*/
    // us
    await gotoPage( page, app_url + '#36.1518162343/-112.0098504417/1960.91791a/73.12717t/57911.60625r/-20.46415h');
    await waitAndShapshot( page, 'basic-us.png', pixel_diff );

    // sa
    await gotoPage( page, app_url + '#-33.6467295048/21.3060654199/480.49364a/66.87765t/268793.20919r/9.25171h');
    await waitAndShapshot( page, 'basic-sa.png', pixel_diff );

    // Atmosphere
    await gotoPage( page, app_url + '#7.3062860512/169.5243914103/0.00000a/0.00000t/25433394.66931r/20.08803h');
    // clear entities
    await page.evaluate( () => {
        const { app } = window as unknown as BasicTesterGlobal;
        const entity_count = app.getEntityNum();
        for ( let i = 0; i < entity_count ; i++ ) {
            app.getEntity(i).setVisibility( false );
        }
    });
    // display atmosphere
    await page.evaluate( () => {
        const { app } = window as unknown as BasicTesterGlobal;
        app.setAtmosphereVisibility( true );
    });
    await waitAndShapshot( page, 'basic-atmosphere.png', pixel_diff );
});



// goto page url and focus page
async function gotoPage( page, url ) {
    await page.goto( url );
    await page.waitForSelector( '#ui' );
    await page.locator( '#ui' ).click();
}



// wait for loaded and take shapshot
async function waitAndShapshot( page, image_name, diff_pixels = 0 ) {
    await page.evaluate( async () => {
        return await new Promise( resolve => {
            const { app } = window as unknown as BasicTesterGlobal | FlatTesterGlobal;
            let counter = 0; // フレーム安定カウンタ
            // @ts-ignore
            app.viewer.addPostProcess(() => {
                if ( app.viewer.load_status.total_loading > 0 ) {
                    counter = 0;
                    return true;
                }
                if ( counter++ < 100 ) {
                    return true;
                }
                else {
                    resolve( true );
                    return false;
                }
            })
        });
    });
    await expect(page).toHaveScreenshot( image_name, { maxDiffPixels: diff_pixels });
}



// change render mode
async function changeRenderMode( page, renderMode: "wireframe" | "surface" )
{
    await page.evaluate( ( renderMode ) => {
            const { mapray, app } = window as unknown as BasicTesterGlobal | FlatTesterGlobal
            app.setRenderMode(
                renderMode === "surface" ? mapray.Viewer.RenderMode.SURFACE :
                mapray.Viewer.RenderMode.WIREFRAME
            );
        },
        renderMode
    );
}
