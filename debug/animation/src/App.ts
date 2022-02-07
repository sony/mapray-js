import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

import CosCurve from "./CosCurve";

import BingMapsImageProvider from "./BingMapsImageProvider";

const MAPRAY_ACCESS_TOKEN = "<your access token here>";

const BINGMAP_TOKEN = "<your Bing Maps Key here>";

// FLAT DEMを使用
const USE_FLATDEM = false;

interface Option {
    tools?: HTMLElement;
}

export default class App extends maprayui.StandardUIViewer {

    private _render_mode: mapray.Viewer.RenderMode;

    private _is_animation_start: boolean;

    private _total_time: number;

    private _animation_updater: mapray.animation.Updater;

    constructor( container: string, options: Option = {} ) {
        super( container, MAPRAY_ACCESS_TOKEN, {
                debug_stats: new mapray.DebugStats(),
                image_provider: (
                    BINGMAP_TOKEN !== "<your Bing Maps Key here" + ">" ?
                    new BingMapsImageProvider( {
                            uriScheme: "https",
                            key: BINGMAP_TOKEN,
                            maxLevel: 19
                    } ): undefined
                ),
                dem_provider: (
                    USE_FLATDEM ? new mapray.FlatDemProvider()
                    : undefined
                )
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
        this.setCameraPosition( init_camera );
        this.setLookAtPosition( lookat_position );

        this._render_mode = mapray.Viewer.RenderMode.SURFACE;

        // アニメーション開始フラグ
        this._is_animation_start = false;

        // アニメーション用タイム
        this._total_time = 0;

        // Updaterの作成
        this._animation_updater = new mapray.animation.Updater();
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
                console.log( 'start animation 1' );
                this._startAnimation1_2(1);
            } break;
            case "2": {
                console.log( 'start animation 2' );
                this._startAnimation1_2(2);
            } break;
            case "3": {
                console.log( 'start animation 3' );
                this._startAnimation3();
            } break;
            case "4": {
                console.log( 'start animation 4' );
                this._startAnimation4();
            } break;
            case "5": {
                console.log( 'start animation 5' );
                this._startAnimation5();
            } break;
            default: {
                super.onKeyDown( event );
            }
        }
    }

    override onUpdateFrame( delta_time: number ) {
        super.onUpdateFrame( delta_time );

        const viewer = this.viewer;
        if ( viewer.render_mode !== this._render_mode ) {
            viewer.render_mode = this._render_mode;
        }

        if ( this._is_animation_start ) {
            // 経過時間の更新
            this._total_time += delta_time;

            // Updaterに時間を投げる
            this._animation_updater.update( mapray.animation.Time.fromNumber( this._total_time ) );
        }
    }


     /**
      * Animation Example 1 or 2
      * @param animation アニメ種類
      */
      _startAnimation1_2( animation: number ) {
        // Entityのクリア
        this.viewer.scene.clearEntities();

        //// エンティティの設定
        // 文字のエンティティを作成
        const font_entity = new mapray.TextEntity( this.viewer.scene );

        // 新宿駅付近
        const font_point = new mapray.GeoPoint( 139.699985, 35.690777, 100 );

        // テキスト設定
        font_entity.addText( "Shinjuku", font_point, { color: mapray.Color.createColor([0, 0, 0, 1]), font_size: 50 } );

        // エンティティをシーンに追加
        this.viewer.scene.addEntity( font_entity );

        // ピンのエンティティを作成
        const pin_entity = new mapray.PinEntity( this.viewer.scene );

        // 新宿駅付近
        const pin_point = new mapray.GeoPoint( 139.699985, 35.690777, 100 );

        // ピンを追加
        pin_entity.addPin( pin_point, { id: '0', size: 40, bg_color: [1, 0, 0] } );

        // エンティティをシーンに追加
        this.viewer.scene.addEntity( pin_entity );

        // PinEntryを取得
        const pin_entry = pin_entity.getEntry( '0' );


        //// アニメーションの設定
        // Curveの作成
        let curve1;
        let curve2;

        if ( animation === 1 ) {
            // KF Linear Curve
            curve1 = new mapray.animation.KFLinearCurve( mapray.animation.Type.find("number") );
            curve2 = new mapray.animation.KFLinearCurve( mapray.animation.Type.find("vector3") );
        } else {
            // KF Step Curve
            curve1 = new mapray.animation.KFStepCurve( mapray.animation.Type.find("number") );
            curve2 = new mapray.animation.KFStepCurve( mapray.animation.Type.find("vector3") );
        }

        // キーフレームデータの作成
        const keyframes1 = [];
        const keyframes2 = [];

        keyframes1.push( mapray.animation.Time.fromNumber( 0 ) );
        keyframes1.push( 5.0 );
        keyframes1.push( mapray.animation.Time.fromNumber( 1 ) );
        keyframes1.push( 40.0 );
        curve1.setKeyFrames( keyframes1 );

        keyframes2.push( mapray.animation.Time.fromNumber( 0 ) );
        keyframes2.push( mapray.GeoMath.createVector3([ 0, 1.0, 0 ]));
        keyframes2.push( mapray.animation.Time.fromNumber( 1 ));
        keyframes2.push( mapray.GeoMath.createVector3([ 0, 0, 1.0 ]));
        keyframes2.push( mapray.animation.Time.fromNumber( 2 ) );
        keyframes2.push( mapray.GeoMath.createVector3([ 1.0, 0, 0 ]));
        for ( let t = 0; t <= 5; ++t ) {
            keyframes2.push(mapray.animation.Time.fromNumber( 2.5 + t ));
            keyframes2.push(mapray.GeoMath.createVector3([ 1.0, 1.0, 1.0 ]));
            keyframes2.push(mapray.animation.Time.fromNumber( 3 + t ));
            keyframes2.push(mapray.GeoMath.createVector3([ 1.0, 0, 0 ]));
        }
        curve2.setKeyFrames( keyframes2 );

        // 経過時間の初期化
        this._total_time = 0;
        
        // UpdaterにBindingBlockを紐づける
        if( pin_entry ) {
            pin_entry.animation.bind( "size", this._animation_updater, curve1 );
            pin_entry.animation.bind( "bg_color", this._animation_updater, curve2 );
        }

        // Animation開始
        this._is_animation_start = true;
     }


      /**
     * Animation Example 3
     */
     _startAnimation3() {
        // Entityのクリア
        this.viewer.scene.clearEntities();

        //// エンティティの設定
        // 文字のエンティティを作成
        const font_entity = new mapray.TextEntity( this.viewer.scene );

        // 新宿駅付近
        const font_point = new mapray.GeoPoint( 139.699985, 35.690777, 100 );

        // テキスト設定
        font_entity.addText( "Shinjuku", font_point, { color: mapray.Color.createColor([0, 0, 0, 1]), font_size: 50 } );

        // エンティティをシーンに追加
        this.viewer.scene.addEntity( font_entity );

        // ピンのエンティティを作成
        const pin_entity = new mapray.PinEntity( this.viewer.scene );

        // 新宿駅付近
        const pin_point = new mapray.GeoPoint( 139.699985, 35.690777, 100 );

        // ピンを追加
        pin_entity.addPin( pin_point, { id: '0', size: 40, bg_color: [1, 0, 0] } );

        // エンティティをシーンに追加
        this.viewer.scene.addEntity( pin_entity );

        // PinEntryを取得
        const pin_entry = pin_entity.getEntry( '0' );


        //// アニメーションの設定
        // コサイン動作のCurveの作成
        const curve = new CosCurve(mapray.animation.Type.find( "number" ));

        curve.setRatio(30);
        curve.setBaseValue(10.0);
        curve.setValueRatio(80.0);

        // 経過時間の初期化
        this._total_time = 0;

        // UpdaterにBindingBlockを紐づける
        if ( pin_entry ) {
            pin_entry.animation.bind( "size", this._animation_updater, curve );
        }

        // Animation開始
        this._is_animation_start = true;
    }


    /**
     * Animation Example 4
     */
     _startAnimation4() {
        // Entityのクリア
        this.viewer.scene.clearEntities();

        // エンティティの作成
        // 文字のエンティティを作成
        const text_entity = new mapray.TextEntity( this.viewer.scene );

        // 仮の位置
        const font_point = new mapray.GeoPoint(0, 0, 0);

        // テキスト設定
        text_entity.addText( "0", font_point, { id: '0', color: mapray.Color.createColor([1, 1, 0, 1]), font_size: 50 } );

        // エンティティをシーンに追加
        this.viewer.scene.addEntity( text_entity );
        const text_entry = text_entity.getEntry( '0' );
      
        // ピンのエンティティを作成
        const pin_entity = new mapray.PinEntity( this.viewer.scene );

        // 仮の位置
        const point = new mapray.GeoPoint( 0, 0, 0 );

        // ピンを追加
        pin_entity.addPin( point, { id: '0', size: 50, bg_color: [0.5, 1, 1], fg_color: [0, 0, 0] } );

        // エンティティをシーンに追加
        this.viewer.scene.addEntity( pin_entity );
        const pin_entry = pin_entity.getEntry( '0' );

        // パスのエンティティを作成
        const path_entity = new mapray.PathEntity( this.viewer.scene );
        path_entity.altitude_mode = mapray.AltitudeMode.CLAMP;
        // entity.altitude_mode = mapray.AltitudeMode.RELATIVE;

        const all_pos = [
            139.713444, 35.679143, 50.0,
            139.713836, 35.681189, 50.0,
            139.715163, 35.682239, 50.0,
            139.714321, 35.682875, 50.0,
        ];

        const length = [ 0, 10, 20, 30 ];

        let pos_array = [ all_pos[ 0 ], all_pos[ 1 ], all_pos[ 2 ] ];
        let length_array = [ length[0] ];

        for ( let i = 0; i < all_pos.length - 3; i = i + 3 ) {
            for ( let j = 1; j <= 100; ++j ) {
                const dis = [
                    all_pos[i    ] + (all_pos[i + 3] - all_pos[i    ]) / 100 * j,
                    all_pos[i + 1] + (all_pos[i + 4] - all_pos[i + 1]) / 100 * j,
                    all_pos[i + 2] + (all_pos[i + 5] - all_pos[i + 2]) / 100 * j
                ];

                pos_array = pos_array.concat( dis );
                length_array = length_array.concat( length[i / 3] + j / 10 );
            }
        }

        path_entity.addPoints( all_pos, length );
        path_entity.setLineWidth( 5 );
        path_entity.setColor( mapray.Color.createOpaqueColor([1.0, 0.0, 0.0]) );
        path_entity.setUpperLength( 30 );

        // エンティティをシーンに追加
        this.viewer.scene.addEntity( path_entity );


        //// アニメーションの設定
        // BindingBlockの作成
        const number = mapray.animation.Type.find( "number" );
        const block = new mapray.animation.EasyBindingBlock();

        if ( text_entry && pin_entry ) {
            block.addEntry( "length", [number], null, value => {
                const position_value = Math.floor( value * 10 );
                if ( pos_array.length > position_value * 3 ) {
                    const text_value = Math.floor( value );
                    if ( text_value < 10 ) {
                        text_entry.setText( 'go straight : ' + text_value.toString() );
                    } else if( text_value < 20) {
                        text_entry.setText( 'turn right : ' + text_value.toString() );
                    } else if( text_value < 30) {
                        text_entry.setText( 'turn left : ' + text_value.toString() );
                    } else {
                        text_entry.setText( 'arrived : ' + text_value.toString() );
                    }
                    const altitude = this.viewer.getElevation( pos_array[ position_value * 3 + 1 ], pos_array[ position_value * 3 + 0 ] );
                    const text_position = new mapray.GeoPoint( pos_array[ position_value * 3 + 0 ], pos_array[ position_value * 3 + 1 ], altitude + 220 );
                    text_entry.setPosition( text_position );
                    const pin_position = new mapray.GeoPoint( pos_array[ position_value * 3 + 0 ], pos_array[ position_value * 3 + 1 ], altitude );
                    pin_entry.setPosition( pin_position );
                }
                path_entity.setUpperLength( value );
            } );
        }
        
        // Curveの作成
        const curve = new mapray.animation.KFLinearCurve( mapray.animation.Type.find( "number" ) );

        // キーフレームデータの作成
        const keyframes = [];
        keyframes.push( mapray.animation.Time.fromNumber( 0 ));
        keyframes.push( 0 );
        keyframes.push( mapray.animation.Time.fromNumber( 30 ));
        keyframes.push( 30 );
        curve.setKeyFrames( keyframes );

        // 経過時間の初期化
        this._total_time = 0;

        // UpdaterにBindingBlockを紐づける
        block.bind( "length", this._animation_updater, curve );

        // アニメーションを開始
        this._is_animation_start = true;
     }


    /**
     * Animation Example 5
     */
     async _startAnimation5() {
         await this.startFlyCamera({
                 end_altitude: 800,
                 end_from_lookat: 300,
                 iscs_end: new mapray.GeoPoint( 139.7527, 35.6835 ),
                 time: 3,
         });
         console.log( "done" );
    }

}


// @ts-ignore
window.mapray = mapray;
