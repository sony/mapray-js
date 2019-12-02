// JavaScript source code
var read_GeoJson_polygon_properties;

class ReadGeoJsonPolygonProperties extends mapray.RenderCallback {
    constructor(container) {
        super();

        // Access Tokenを設定
        var accessToken = "<your access token here>";

        // Viewerを作成する
        new mapray.Viewer(container, {
            render_callback: this,
            image_provider: this.createImageProvider(),
            dem_provider: new mapray.CloudDemProvider(accessToken)
        });

        // geoJSONファイルのライセンス表示
        this.viewer.attribution_controller.addAttribution( {
            display: "国土数値情報　ダウンロードサービス 1kmメッシュ別将来推計人口（H29国政局推計）（shape形式からGeoJSON形式に変換）",
            link: "http://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-mesh1000.html"
        } );

        this.SetCamera();
        
        this.AddText();

        this.LoadGeoJson();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    // カメラ位置の設定
    SetCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。座標は府中市付近
        var home_pos = { longitude: 139.529127, latitude: 35.677033, height: 100.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 100000]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

        // ビュー変換行列を作成
        var view_to_home = mapray.GeoMath.createMatrix();
        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

        // カメラの位置と視線方向からカメラの姿勢を変更
        var view_to_gocs = this.viewer.camera.view_to_gocs;
        mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

        // カメラのnear、farの設定
        this.viewer.camera.near = 30;
        this.viewer.camera.far = 500000;
    }

    // テキストの表示
    AddText() {
        // 文字のエンティティを作成
        var font_Entity = new mapray.TextEntity(this.viewer.scene);

        // 府中市付近
        var Font_Point = new mapray.GeoPoint(139.529127, 35.677033, 5000);

        font_Entity.addText("Tokyo", Font_Point, { color: [0, 0, 0], font_size: 50 });

        // エンティティをシーンに追加
        this.viewer.scene.addEntity(font_Entity);
    }

    // GeoJSONの読み込み
    LoadGeoJson() {
        var loader = new mapray.GeoJSONLoader( this._viewer.scene, "./data/tokyo_population.json", {
            onLoad: (loader, isSuccess) => { console.log("success load geojson") },
            getFillColor: d => d.properties ? this.GetFillColor(d.properties) : [1.0, 0.0, 1.0, 0.5],
            getAltitude: () => 2000
        } );

        loader.load();
    }

    // プロパティから線の色を決定し返す
    GetFillColor( properties={} ) {
        var RGBArray = [0.0, 0.0, 0.0, 0.5];

        if( properties.POP2010 ) {
            var pop2010 = properties.POP2010;

            // 人口密度が一定数以上かどうかで色を決定する
            if ( pop2010 > 20000 ) {
                RGBArray = [1.0, 0.0, 0.0, 0.5];
            }
            else if ( pop2010 > 15000 ) {
                RGBArray = [1.0, 0.3, 0.0, 0.5];
            }
            else if ( pop2010 > 10000 ) {
                RGBArray = [1.0, 0.6, 0.0, 0.5];                
            }
            else {
                RGBArray = [1.0, 1.0, 0.0, 0.5];
            }
        }

        return RGBArray;
    }
    
    ChangeOpacity() {
        // プルダウンの値取得
        var opacity_Value = parseFloat(document.getElementById("OpacityPullDown").value);

        // プルダウンの値を設定
        for ( var i = 1; i < this.viewer.scene.num_entities; ++i ) {
            var polygonEntity = this.viewer.scene.getEntity(i);
            polygonEntity.setOpacity(opacity_Value);
        }
    }

}

function CreateReadGeoJsonPolygonPropertiesInstance(container) {
    read_GeoJson_polygon_properties = new ReadGeoJsonPolygonProperties(container);
}

function OpacityValueChanged() {
    read_GeoJson_polygon_properties.ChangeOpacity()
}
