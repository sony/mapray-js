import mapray  from "@mapray/mapray-js";

import debugCommon, {
    DebugViewer, Option, StatusBar, Commander, BingMapsImageProvider, DomTool,
    Module,
    PointCloudModule,
    B3dTileModule,
    AtmosphereModule,
    Dataset2dModule,
    Dataset3dModule
} from "debug-common";



class DatasetViewer extends DebugViewer {

    constructor( container: string | HTMLElement )
    {
        super( container, {
                mapray_access_token: process.env.MAPRAY_ACCESS_TOKEN as string,
                bingmap_token: process.env.BINGMAP_ACCESS_TOKEN as string,
                atmosphere: new mapray.Atmosphere(),
                sun_visualizer: new mapray.SunVisualizer( 32 ),
                moon_visualizer: new mapray.MoonVisualizer( './data/moon.jpg' ),
                star_visualizer: new mapray.StarVisualizer( './data/star75.json', './data/starmap_512n2.jpg' ),
                // north_pole: { color: [0, 0.07, 0.12], },
                // south_pole: { color: [0.88, 0.89, 0.94], },
        } );

        this.setCloudApi( new mapray.cloud.CloudApiV1({
                    basePath: process.env.MAPRAY_API_BASE_PATH || undefined,
                    userId: process.env.MAPRAY_API_USER_ID as string,
                    token: process.env.MAPRAY_API_KEY as string,
        }));

        // Night Layer
        this.addLayer( { 
            image_provider: new mapray.StandardImageProvider("https://opentiles.mapray.com/xyz/night-satellite/", ".png", 256, 0, 8),
            opacity: 1.0,
            type: mapray.Layer.LayerType.NIGHT
        } );
    }


    protected override populateModules( modules: Module[] ): void
    {
        // GeoJson
        if ( process.env.DATASET_2D_ID ) {
            modules.push( new Dataset2dModule({
                        datasets: [ process.env.DATASET_2D_ID ],
            }) );
        }

        // 3D
        if ( process.env.DATASET_3D_ID ) {
            modules.push( new Dataset3dModule({
                        datasets: [ process.env.DATASET_3D_ID ],
            }) );
        }

        // Point Cloud
        if ( process.env.DATASET_POINT_CLOUD_ID ) {
            modules.push( new PointCloudModule({
                        datasets: [ process.env.DATASET_POINT_CLOUD_ID ],
            }));
        }

        modules.push( new B3dTileModule() );
        modules.push( new AtmosphereModule() );
    }


    /**
     * G key Toggle
     */
    override async loadGISInfo()
    {
        // Pin
        const pin_pos1 = new mapray.GeoPoint(137.7238014361, 34.7111256306);
        this.addPinEntity( pin_pos1, { size: 30, fg_color: [0.2, 0.2, 0.2], bg_color: [1.0, 1.0, 1.0] } );
        const pin_pos2 = new mapray.GeoPoint(137.7238014361, 35.7111256306);
        this.addTextPinEntity( pin_pos2, 'A', { size: 30, fg_color: [0.2, 0.2, 0.2], bg_color: [1.0, 1.0, 1.0] } );
        const pin_pos3 = new mapray.GeoPoint(137.7238014361, 36.7111256306);
        this.addIconPinEntity( pin_pos3, 'rail-15', { size: 30, fg_color: [0.2, 0.2, 0.2], bg_color: [1.0, 1.0, 1.0] } );

        // Text
        const text_pos = new mapray.GeoPoint(137.7238014361, 34.7111256306, 1000);
        this.addTextEntity( text_pos, 'Text', { color: [1, 0, 0], font_size: 25 } );

        for ( const module of this.modules ) {
            console.log(`loading ${module.name}`);
            await module.loadData();
        }
    }

    /**
     * G key Toggle
     */
    override async clearGISInfo()
    {
        // 2D
        this.removeGeoJson();

        // 3D
        this.removeModelEntity();

        // PointCloud
        this.removePointCloud();

        // B3D
        this.removeB3d();

        // Pin
        this.removePinEntity();

        // Text
        this.removeTextEntity();

        // debug ui
        this.clearDebugUI();

        for ( const module of this.modules ) {
            console.log(`loading ${module.name}`);
            await module.unloadData();
        }
    }

}

export default DatasetViewer;
