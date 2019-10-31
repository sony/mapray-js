// JavaScript source code
class ReadGeoJsonLineProperties extends mapray.RenderCallback {
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
        // 球面座標系（経度、緯度、高度）で視点を設定。座標は新宿駅付近
        var home_pos = { longitude: 139.69685, latitude: 35.689777, height: 100.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 5000]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

        // ビュー変換行列を作成
        var view_to_home = mapray.GeoMath.createMatrix();
        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

        // カメラの位置と視線方向からカメラの姿勢を変更
        var view_to_gocs = this.viewer.camera.view_to_gocs;
        mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

        // カメラのnear  farの設定
        this.viewer.camera.near = 30;
        this.viewer.camera.far = 500000;
    }

    // テキストの表示
    AddText() {
        // 文字のエンティティを作成
        var font_Entity = new mapray.TextEntity(this.viewer.scene);

        // 新宿駅付近
        var Font_Point = new mapray.GeoPoint(139.699985, 35.690777, 100);

        font_Entity.addText("Shinjuku", Font_Point, { color: [0, 0, 0], font_size: 50 });

        // エンティティをシーンに追加
        this.viewer.scene.addEntity(font_Entity);
    }
    
    // GeoJSONの読み込み
    LoadGeoJson() {
        var loader = new mapray.GeoJSONLoader( this._viewer.scene, "./data/shinjuku_barrier_free_line.json", {
            onLoad: (loader, isSuccess) => { console.log("success load geojson") },
            getLineWidth: () => 5,
            getLineColor: d => d.properties ? this.GetLineColor(d.properties) : [1.0, 1.0, 1.0, 1.0],
            getAltitude: () => 50
        } );

        loader.load();
    }

    // プロパティから線の色を決定し返す
    GetLineColor( properties={} ) {
        var RGBArray = [1.0, 1.0, 1.0, 1.0];

        // 道路の幅から色を決定する
        if ( properties.width ) {
            var width = properties.width;

            if ( width <= 1 ) {
                RGBArray = [1.0, 0.0, 0.0, 1.0];
            }
            else if ( width <= 2 ) {
                RGBArray = [1.0, 0.3, 0.0, 1.0];
            }
            else if ( width <= 3 ) {
                RGBArray = [1.0, 0.6, 0.0, 1.0];
            }
            else {
                RGBArray = [1.0, 1.0, 0.0, 1.0];
            }
        }

        return RGBArray;
    }

}
