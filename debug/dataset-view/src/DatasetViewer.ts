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



const MAPRAY_ACCESS_TOKEN = "<your access token here>";
const MAPRAY_API_BASE_PATH = "https://cloud.mapray.com";
const MAPRAY_API_ACCESS_TOKEN = MAPRAY_ACCESS_TOKEN;
const MAPRAY_API_USER_ID = "<your user id>";
const DATASET_2D_ID = "<2d dataset id>";
const DATASET_3D_ID = "<3d dataset id>";

const DATASET_POINT_CLOUD_ID = "<point cloud dataset id>";
const DATASET_B3D_ID = "<b3d dataset id>";

const BINGMAP_TOKEN = "<your Bing Maps Key here>";


class DatasetViewer extends DebugViewer {

    constructor( container: string | HTMLElement )
    {
        super( container, {
                mapray_access_token: MAPRAY_ACCESS_TOKEN,
                bingmap_token: BINGMAP_TOKEN,
                atmosphere: new mapray.Atmosphere(),
                sun_visualizer: new mapray.SunVisualizer( 32 ),
                moon_visualizer: new mapray.MoonVisualizer( './data/moon.jpg' ),
                star_visualizer: new mapray.StarVisualizer( './data/star75.json', './data/starmap_512n2.jpg' ),
                north_pole: { color: [0, 0.07, 0.12], },
                south_pole: { color: [0.88, 0.89, 0.94], },
        } );

        this.setMaprayApi( new mapray.MaprayApi({
                    basePath: MAPRAY_API_BASE_PATH,
                    version: "v1",
                    userId: MAPRAY_API_USER_ID,
                    token: MAPRAY_API_ACCESS_TOKEN,
        }));

        // Night Layer
        this.addLayer( { 
            image_provider: new mapray.StandardImageProvider("https://storage.googleapis.com/inou-dev-mapray-additional-resources/image-tile/night/", ".png", 256, 0, 8),
            opacity: 1.0,
            type: mapray.Layer.LayerType.NIGHT
        } );
    }


    protected override populateModules( modules: Module[] ): void
    {
        // GeoJson
        if ( !DATASET_2D_ID.startsWith( "<" ) ) {
            modules.push( new Dataset2dModule({
                        datasets: [ DATASET_2D_ID ],
            }) );
        }

        // 3D
        if ( !DATASET_3D_ID.startsWith( "<" ) ) {
            modules.push( new Dataset3dModule({
                        datasets: [ DATASET_3D_ID ],
            }) );
        }

        if ( !DATASET_POINT_CLOUD_ID.startsWith( "<" ) ) {
            modules.push( new PointCloudModule({
                        datasets: [ DATASET_POINT_CLOUD_ID ],
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
