import mapray, { AltitudeMode, animation } from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

// FLAT DEMを使用
const USE_FLATDEM = false;

interface Option {
    tools?: HTMLElement;
}

type PointCloudStatistics = {
    setStatisticsHandler (handler: (stat: {loading_boxes: number}) => void): void;
}



export default class App extends maprayui.StandardUIViewer {

    private _render_mode: mapray.Viewer.RenderMode;

    private _total_time: number;

    private _pc: number;

    constructor( container: string, options: Option = {} )
    {
        super( container, process.env.MAPRAY_API_KEY as string, {
                debug_stats: new mapray.DebugStats(),
                dem_provider: (
                    USE_FLATDEM ? new mapray.FlatDemProvider()
                    : undefined
                ),
                atmosphere: new mapray.Atmosphere(),
                sun_visualizer: new mapray.SunVisualizer( 32 ),
        } );

        const init_camera = {
            longitude: 139.73685,
            latitude: 35.680,
            height: 1000
        };
        const lookat_position = {
            longitude: 139.69685,
            latitude: 35.689777,
            height: 0
        };

        const init_camera_parameter = {
            fov: 46.0,
        };

        // カメラ位置
        this.setCameraPosition( init_camera );

        // 注視点
        this.setLookAtPosition( lookat_position );

        // カメラパラメータ
        this.setCameraParameter( init_camera_parameter );

        this.enableURLUpdate( true );

        this._render_mode = mapray.Viewer.RenderMode.SURFACE;

        // Atmosphere
        this.viewer.sun.setSunDirection( [ 1, 0, 0 ] );
        this.addLayer( { image_provider: new mapray.StandardImageProvider("https://opentiles.mapray.com/xyz/night-satellite/", ".png", 256, 0, 8), opacity: 1.0, type: mapray.Layer.LayerType.NIGHT } );
        this.setAtmosphereVisibility( false );

        // // 文字のエンティティを作成
        // const font_entity = new mapray.TextEntity(this.viewer.scene);
        // // 新宿駅付近
        // const font_point = new mapray.GeoPoint(139.699985, 35.690777, 100);
        // font_entity.addText("Shinjuku", font_point, { color: [0, 0, 1], font_size: 50 });
        // this.addEntity(font_entity);

        // // pin
        // const pin = new mapray.PinEntity(this.viewer.scene);
        // const pin_entry = pin.addPin( new mapray.GeoPoint(139.766, 35.6361) );
        // this.addEntity( pin );
        // pin_entry.setBGColor( [1,0,1] );

/*
        // MarkerLineEntity
        this.addMarkerLineEntity();

        // ImageIcon
        this.addImageIconEntity();

        // 2D
        this.add2DEntity();

        // 3D
        this.add3DEntity();
*/
        // アニメーション用タイム
        this._total_time = 0;

        (mapray.PointCloud as unknown as PointCloudStatistics).setStatisticsHandler((stat) => {
            this._pc = stat.loading_boxes;
        });

        this._pc = 0;

    }

    setRenderMode( render_mode: mapray.Viewer.RenderMode )
    {
        this._render_mode = render_mode;
    }

    addMarkerLineEntity()
    {
        const line_entity = new mapray.MarkerLineEntity(this.viewer.scene);
        const line_fast_position = { longitude: 139.699985, latitude: 35.680777, height: 350 };
        const line_second_position = { longitude: 139.699985, latitude: 35.693777, height: 350 };
        const position_array = [line_fast_position.longitude, line_fast_position.latitude, line_fast_position.height,
                            line_second_position.longitude, line_second_position.latitude, line_second_position.height];
        line_entity.addPoints(position_array);
        line_entity.setLineWidth(5.9);
        line_entity.setColor( [1.0, 0.2, 0.2] );
        line_entity.altitude_mode = mapray.AltitudeMode.CLAMP;
        this.viewer.scene.addEntity(line_entity);
    }

    addImageIconEntity()
    {
        const imag_icon_entity = new mapray.ImageIconEntity( this.viewer.scene );
        const  image_icon_Point = new mapray.GeoPoint( 139.699985, 35.693777, 100 );
        imag_icon_entity.addImageIcon("../../data/grad.jpg", image_icon_Point, { size: [300, 200] });
        this.viewer.scene.addEntity(imag_icon_entity);
    }

    add2DEntity()
    {
        const loader = new mapray.GeoJSONLoader( this.viewer.scene, "../../data/multi_test.json", {
            // getAltitude: () => 4000,
            onEntity: ( loader, entity  ) =>{
                entity.altitude_mode = mapray.AltitudeMode.CLAMP;
                // entity.altitude_mode = mapray.AltitudeMode.RELATIVE;
                if ( entity instanceof mapray.PolygonEntity ) {
                    entity.setColor( [1, 0, 0] );
                }
                if ( entity instanceof mapray.MarkerLineEntity ) {
                    entity.setColor( [1, 1, 0] );
                }
                loader.scene.addEntity( entity );
            }
        } );
        loader.load();
    }

    add3DEntity()
    {
        const scene_File_URL = "../../data/box/boxScene.json";

        const loader = new mapray.SceneLoader(this.viewer.scene, scene_File_URL, {
            transform: (url, type) => {
                return {
                    url: url,
                    credentials: mapray.CredentialMode.SAME_ORIGIN,
                    headers: {}
                };
            },
        });
        loader.load();
    }

    addPointCloud()
    {
        // Add Point Cloud
        const point_cloud_url = "https://opentiles.mapray.com/pc/raw/dronebird/aoyamagakuin2";
        const infojson = point_cloud_url + "/info.json";
        this.viewer.point_cloud_collection.add( new mapray.RawPointCloudProvider( { url: infojson } ) );
    }

    addB3d()
    {
        // Add PLATEAU Bilding data from mapray opendata site
        const b3d_urls = [
            "https://opentiles.mapray.com/3dcity/tokyo_n/",
            "https://opentiles.mapray.com/3dcity/tokyo_s/",
        ];
        const scenes = b3d_urls.map(url => {
            const provider = new mapray.StandardB3dProvider(url, ".bin");
            return this.viewer.b3d_collection.createScene( provider );
        });
    }

    setAtmosphereVisibility( visible: boolean )
    {
        if ( this.viewer.atmosphere ) {
            this.viewer.atmosphere.setSkyVisibility( visible );
            this.viewer.atmosphere.setGroundVisibility( visible );
        }

        if ( this.viewer.sunVisualizer ) {
            this.viewer.sunVisualizer.setVisibility( visible );
        }

        if (this.viewer.layers && this.viewer.layers.getLayer(0)) {
            // visible
            this.viewer.layers.getLayer(0).setOpacity( visible? 100 : 0 );
        }
    }

    override onKeyDown( event: KeyboardEvent )
    {
        switch ( event.key ) {
            case "m": case "M": {
                this._render_mode = (
                    this._render_mode === mapray.Viewer.RenderMode.SURFACE ?
                    mapray.Viewer.RenderMode.WIREFRAME :
                    mapray.Viewer.RenderMode.SURFACE
                );
            } break;
            case "1": {
                this.setCameraParameter( { fov: 100.0 } );
            } break;
            case "2": {
                this.setCameraParameter( { fov: 46.0 } );
            } break;
            case "3": {
                this.addPointCloud();
            } break;
            case "4": {
                this.addB3d();
            } break;
            case "5": {
                this.setAtmosphereVisibility( true );
            } break;
            case "0": {
                const entity_count = this.getEntityNum();
                for( let i = 0; i < entity_count ; i++ ) {
                    this.getEntity(i).setVisibility(false);
                }
                this.viewer.point_cloud_collection.removeByIndex(0);
                this.viewer.b3d_collection.clearScenes();
            } break;
            case "e": {
                // MarkerLineEntity
                this.addMarkerLineEntity();

                // ImageIcon
                this.addImageIconEntity();

                // 2D
                this.add2DEntity();

                // 3D
                this.add3DEntity();
            } break;
            case "g": {
                this.viewer.setVisibility( mapray.Viewer.Category.GROUND, false );
            } break;
            default: {
                super.onKeyDown( event );
            }
        }
    }


    override onMouseDown( point: [x: number, y: number], event: MouseEvent )
    {
        if ( event.shiftKey ) {
            const pick_result = this.viewer.pick( point );
            if ( pick_result ) {
                if ( pick_result.entity instanceof mapray.PinEntity) {
                    pick_result.entity.setFGColor( [1, 0, 0] );
                }
            }
        }
        else if ( event.ctrlKey ) {
            const pick_result = this.viewer.pick( point );
            if ( pick_result ) {
                if ( pick_result.position ) {
                    const pin = new mapray.PinEntity( this.viewer.scene );
                    const p = new mapray.GeoPoint();
                    p.setFromGocs( pick_result.position );
                    pin.addMakiIconPin( "car-15", p, { id: "pos" } );
                    this.addEntity( pin );
                }
            }
        }
        else {
            super.onMouseDown( point, event );
        }
    }


    override onUpdateFrame( delta_time: number ) {
        super.onUpdateFrame( delta_time );

        const viewer = this.viewer;
        if ( viewer.render_mode !== this._render_mode ) {
            viewer.render_mode = this._render_mode;
        }
    }

}


// @ts-ignore
window.mapray = mapray;
