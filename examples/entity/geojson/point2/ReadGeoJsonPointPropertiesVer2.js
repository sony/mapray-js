// JavaScript source code
class ReadGeoJsonPointProperties extends mapray.RenderCallback {
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
            display: "国土数値情報　ダウンロードサービス　学校データ（H25年度）（shape形式からGeoJSON形式に変換）",
            link: "http://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P29.html"
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
        // 球面座標系（経度、緯度、高度）で視点を設定。座標は京都市付近
        var home_pos = { longitude: 135.760206, latitude: 35.047252, height: 100.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3( [0, -20000, 4000] );
        var cam_end_pos = mapray.GeoMath.createVector3( [0, 0, 0] );
        var cam_up = mapray.GeoMath.createVector3( [0, 0, 1] );

        // ビュー変換行列を作成
        var view_to_home = mapray.GeoMath.createMatrix();
        mapray.GeoMath.lookat_matrix( cam_pos, cam_end_pos, cam_up, view_to_home );

        // カメラの位置と視線方向からカメラの姿勢を変更
        var view_to_gocs = this.viewer.camera.view_to_gocs;
        mapray.GeoMath.mul_AA( home_view_to_gocs, view_to_home, view_to_gocs );

        // カメラのnear、farの設定
        this.viewer.camera.near = 30;
        this.viewer.camera.far = 500000;
    }

    // GeoJSONの読み込み
    LoadGeoJson() {
        var loader = new mapray.GeoJSONLoader( this._viewer.scene, "./data/kyoto_school.json", {
            onLoad: ( loader, isSuccess ) => { console.log( "success load geojson" ) },
            getPointFGColor: d => d.properties && d.properties.color ? d.properties.color : [1.0, 1.0, 1.0],
            getPointBGColor: d => d.properties ? this.GetBGColor( d.properties ) : [0.0, 0.0, 0.0],
            getPointIconId: () => "circle-11",
            getPointSize: () => 20,
            getAltitudeMode: () => mapray.AltitudeMode.CLAMP
        } );

        loader.load();
    }

    // プロパティから線の色を決定し返す
    GetBGColor( properties = {} ) {
        var RGBArray = [0.0, 0.0, 0.0];
        var school_class = properties.P29_004;

        // 学校分類が大学かどうかで色を決定する
        if ( school_class == 16007 ) {
            RGBArray = [0.0, 1.0, 1.0];
        }
        else {
            RGBArray = [1.0, 0.0, 0.0];
        }

        return RGBArray;
    }

}
