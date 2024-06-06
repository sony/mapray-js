// JavaScript source code
class ReadGeoJsonLineProperties extends mapray.RenderCallback {
    constructor( container ) {
        super();

        // Access Tokenを設定
        var accessToken = "<your access token here>";

        // Viewerを作成する
        new mapray.Viewer( container, {
            render_callback: this,
            image_provider: this.createImageProvider(),
            dem_provider: new mapray.CloudDemProvider( accessToken )
        } );

        // geoJSONファイルのライセンス表示
        this.viewer.attribution_controller.addAttribution( {
            display: "国土数値情報　ダウンロードサービス　バスルート（H23年度）（shape形式からGeoJSON形式に変換）",
            link: "http://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N07.html"
        } );

        this.SetCamera();

        this.LoadGeoJson();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider( { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", format: "jpg", min_level: 2, max_level: 18 } );
    }

    // カメラ位置の設定
    SetCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。座標は神戸市付近
        var home_pos = { longitude: 135.241981, latitude: 34.728147, height: 100.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3( [3000, -8000, 6000] );
        var cam_end_pos = mapray.GeoMath.createVector3( [0, 0, 0] );
        var cam_up = mapray.GeoMath.createVector3( [0, 0, 1] );

        // ビュー変換行列を作成
        var view_to_home = mapray.GeoMath.createMatrix();
        mapray.GeoMath.lookat_matrix( cam_pos, cam_end_pos, cam_up, view_to_home );

        // カメラの位置と視線方向からカメラの姿勢を変更
        var view_to_gocs = this.viewer.camera.view_to_gocs;
        mapray.GeoMath.mul_AA( home_view_to_gocs, view_to_home, view_to_gocs );

        // カメラのnear  farの設定
        this.viewer.camera.near = 30;
        this.viewer.camera.far = 500000;
    }

    // GeoJSONの読み込み
    LoadGeoJson() {
        var loader = new mapray.GeoJSONLoader( this._viewer.scene, "./data/hyogo_buss.json", {
            onLoad: ( loader, isSuccess ) => { console.log( "success load geojson" ) },
            getLineWidth: () => 5,
            getLineColor: d => d.properties ? this.GetLineColor( d.properties ) : [1.0, 1.0, 1.0, 1.0],
            getAltitudeMode: () => mapray.AltitudeMode.CLAMP
        } );

        loader.load();
    }

    // プロパティから線の色を決定し返す
    GetLineColor( properties = {} ) {
        var RGBArray = [1.0, 1.0, 1.0, 1.0];

        // 平日運行頻度から色を決定する
        if ( properties.N07_004 ) {
            var frequency = properties.N07_004;

            if ( frequency <= 10 ) {
                RGBArray = [1.0, 0.0, 0.0, 1.0];
            }
            else if ( frequency <= 20 ) {
                RGBArray = [1.0, 0.3, 0.0, 1.0];
            }
            else if ( frequency <= 30 ) {
                RGBArray = [1.0, 0.6, 0.0, 1.0];
            }
            else {
                RGBArray = [1.0, 1.0, 0.0, 1.0];
            }
        }

        return RGBArray;
    }

}
