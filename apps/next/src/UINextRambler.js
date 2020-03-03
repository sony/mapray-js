import BingMapsImageProvider from "./BingMapsImageProvider"
import StatusBar from "./StatusBar";

const accessToken = "MTU0ODcyODQ5OTczOTBjZmVmZjBjY2VhYmEyNTE3";

const NATS_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2FthreeDModel%2FNATS%2FNATS.json?alt=media&token=081ad161-ad70-449e-b279-c2ea2beb109b";
const NATS_MARKER_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2Fmarker%2FDemoNATS.json?alt=media&token=ba0298fb-042a-4ae0-b0fd-3427b457cf8a";
const AED_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2Fmarker%2FDemoAED.json?alt=media&token=04715b01-d890-4f18-b22f-aa831598ab39";
const MOUNTAIN_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2Fmarker%2FDemoMountain.json?alt=media&token=18b2b427-bac0-43ec-aace-8d34cdc30d07";

// Attirbute
const DEM_ATTRIBUTE = "この地図の作成に当たっては、国土地理院の承認を得て、同院発行の基盤地図情報を使用した。（承認番号　平30情使、 第626号）";
const BING_ATTRIBUTE = "© 2018 Microsoft Corporation, © 2018 DigitalGlobe, ©CNES (2018) Distribution Airbus DS, © 2018 SK telecom / NGII, Earthstar Geographics  SIO";
const GSI_ATTRIBUTE = "国土地理院";

class UINextRambler extends maprayui.StandardUIViewer {

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container )
    {
        super( container, accessToken, { debug_stats: new mapray.DebugStats() } );

        this.addLayer( { image_provider: this._createLayerImageProvider(), opacity: 1.0 } );

        this._statusbar = new StatusBar( this._viewer, DEM_ATTRIBUTE + ", " + GSI_ATTRIBUTE );

        this._container = container;

        // カメラの初期設定
        this._init_camera = {
            latitude: 28.0,         // 緯度
            longitude: 142.0,       // 経度
            height: 2500000,        // 高度
            fov: 46.0               // 画角
        };

        // 注視点の初期設定（長野県松本市付近）
        this._lookat_position = {
            latitude: 38.00,
            longitude: 138.00,
            height: 1000
        };

        // カメラ位置
        this.setCameraPosition( this._init_camera );

        // 注視点
        this.setLookAtPosition( this._lookat_position );
        
        // カメラパラメータ
        this.setCameraParameter( this._init_camera );

        // コンテンツ制御
        this._isChangedGIS = false;
        this._isChangedBing = false;
        this._isChangedRenderMode = false;
        this._isChangedRenderMode = false;
        this._layerUpParameter = 0;

        // DEMOコンテンツ
        this._isGIS = false;
        this._isBing = false;
        this._layer_transparency = 10; //layer
    }

    /**
     * Viewerを閉じる
     */
    _closeViewer() 
    {
        this.destroy();
        this._statusBar = null;
        this._isGIS = false;
        this._layer_transparency = 10;
    }

    /**
     * Layer用の画像プロバイダを生成
     */
    _createLayerImageProvider() 
    {
        return new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/20160414kumamoto_0429dol1/", ".png", 256, 10, 18 );
    }

    /**
     * GIS情報の表示
     */
    _loadGISInfo() 
    {
        // シーンの読み込みを開始
        // 3D
        /*  new mapray.SceneLoader( this._viewer.scene, NATS_JSON_URL, {
              transform: (url, type) => this._onTransform( url, type ),
              callback: (loader, isSuccess) => {
                  this._onLoadScene( loader, isSuccess );
              }
          } );
  
          // NATS marker
          new mapray.SceneLoader( this._viewer.scene, NATS_MARKER_JSON_URL, {
              transform: (url, type) => this._onTransform( url, type ),
              callback: (loader, isSuccess) => {
                  this._onLoadScene( loader, isSuccess );
              }
          } );
          // AED
          new mapray.SceneLoader( this._viewer.scene, AED_JSON_URL, {
              callback: (loader, isSuccess) => { this._onLoadScene( loader, isSuccess ); }
          } );
          // Mountain
          new mapray.SceneLoader( this._viewer.scene, MOUNTAIN_JSON_URL, {
              callback: (loader, isSuccess) => { this._onLoadScene( loader, isSuccess ); }
          } ); */

        // GeoJSON
        new mapray.GeoJSONLoader( this._viewer.scene, "./shinjuku_linestring.json", {
            onLoad: ( loader, isSuccess ) => { console.log( "success load geojson" ) },
            getLineColor: d => d.properties && d.properties.color ? d.properties.color : [0, 255, 255, 255],
            getLineWidth: d => d.properties && d.properties.width ? d.properties.width : 3,
            getExtrudedHeight: () => null,
            getAltitude: () => 40
        } );
    }

    /**
     * GIS情報の非表示
     */
    _clearGISInfo()
    {
        this._viewer.scene.clearEntities();
    }

    /**
     * シーンを読み込み終わったときの処理
     */
    _onLoadScene( loader, isSuccess )
    {

    }

    /**
     * リソース要求関数
     */
    _onTransform( url, type )
    {
        return {
            url: url,
            credentials: mapray.CredentialMode.SAME_ORIGIN,
            headers: {}
        };
    }

    onUpdateFrame( delta_time )
    {
        super.onUpdateFrame( delta_time );

        this._updateRenderMode();
        this._updateLayerParams();
        this._updateGISMode();
        this._updateBingLayerParams();

        var elevation = this._viewer.getElevation( this._camera_parameter.latitude, this._camera_parameter.longitude );

        var camera_matrix = this._viewer.camera.view_to_gocs
        var direction = [camera_matrix[4], camera_matrix[5], camera_matrix[6] ];
        var pitch = this._camera_parameter.pitch - 90;

        // ステータスバーを更新
        var statusbar = this._statusbar;
        statusbar.setCameraPosition( this._camera_parameter );
        statusbar.setElevation( elevation );
        statusbar.setDirection( direction, pitch );
        statusbar.setFovAngle( this._camera_parameter.fov );
        statusbar.updateElements( delta_time );
        statusbar.setLayer( this._layer_transparency );
    }

    _onKeyDown( event )
    {
        super._onKeyDown( event );

        switch ( event.key )
        {
            // [m] レンダリングモードの変更
            case "m": 
            case "M":
                this._isChangedRenderMode = true;
                break;

            // [>] 透過率UP
            case ">":
                this._layerUpParameter = 1;
                break;

            // [>] 透過率DOWN
            case "<":
                this._layerUpParameter = -1;
                break;

            // [g] GISモードの変更
            case "g": case "G":
                this._isChangedGIS = true;
                break;

            
            // [b] Bingモードの変更
            case "b": case "B":
                this._isChangedBing = true;
                break;
        }
    }

    /**
     * @summary Viewer のレンダリングモードを更新
     * @private
     */
    _updateRenderMode()
    {
        if ( this._isChangedRenderMode )
        {
            var RenderMode = mapray.Viewer.RenderMode;
            var viewer = this._viewer;
            var rmode = viewer.render_mode;
            if ( rmode === RenderMode.SURFACE )
            {
                viewer.render_mode = RenderMode.WIREFRAME;
            }
            else
            {
                viewer.render_mode = RenderMode.SURFACE;
            }

            this._isChangedRenderMode = false;
        }
    }

    /**
     * @summary Layerパラメータ更新
     * @desc
     * @private
     */
    _updateLayerParams()
    {
        if ( this._layerUpParameter != 0 )
        {
            this._layer_transparency = this._layer_transparency + this._layerUpParameter;
            if ( this._layer_transparency > 10 )
            {
                this._layer_transparency = 10;
            } else if ( this._layer_transparency < 0 )
            {
                this._layer_transparency = 0;
            }
            var d = ( this._layer_transparency ) / 10.0;
            if ( this._viewer.layers && this._viewer.layers.getLayer( 0 ) )
            {
                this._viewer.layers.getLayer( 0 ).setOpacity( d );
            }

            this._layerUpParameter = 0;
        }
    }

    _updateBingLayerParams()
    {
        if ( this._isChangedBing )
        {
            if ( this._isBing )
            {
                this._isBing = false;
                this.createViewer( this._container, accessToken, { debug_stats: new mapray.DebugStats() } );
                this._statusbar = new StatusBar( this._viewer, DEM_ATTRIBUTE + ", " + GSI_ATTRIBUTE );
            } else
            {
                this._isBing = true;
                this.createViewer( this._container, accessToken, { image_provider: this._createBingImageProvider(), debug_stats: new mapray.DebugStats() } );
                this._statusbar = new StatusBar( this._viewer, DEM_ATTRIBUTE + ", " + BING_ATTRIBUTE );
            }

            this._isChangedBing = false;
        }
    }

    /**
     * @summary Viewer のレンダリングモードを更新
     * @private
     */
    _updateGISMode()
    {
        if ( this._isChangedGIS )
        {
            if ( this._isGIS )
            {
                this._isGIS = false;
                this._clearGISInfo();
            } else
            {
                this._isGIS = true;
                this._loadGISInfo();
            }

            this._isChangedGIS = false;
        }
    }

    _createBingImageProvider()
    {
        return new BingMapsImageProvider( {
            uriScheme: "https",
            key: "<your Bing Maps Key here>"
        } );
    }
}

export default UINextRambler;
