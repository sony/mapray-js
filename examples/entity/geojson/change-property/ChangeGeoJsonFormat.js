// JavaScript source code
var change_GeoJSON_Format;

class ChangeGeoJSONFormat extends mapray.RenderCallback {
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

        this.LoadScene();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider( { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", format: "jpg", min_level: 2, max_level: 18 } );
    }

    // カメラ位置の設定
    SetCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。座標は高槻市付近
        var home_pos = { longitude: 135.642749, latitude: 34.849955, height: 500.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 70000]);
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
        //文字のエンティティを作成
        var font_Entity = new mapray.TextEntity(this.viewer.scene);

        //新大阪駅付近
        var fast_Font_Point = new mapray.GeoPoint(135.501101, 34.722939, 500);

        font_Entity.addText("Shin-Osaka", fast_Font_Point, { color: [0, 0, 0], font_size: 25 });

        //京都駅付近
        var second_Font_Point = new mapray.GeoPoint(135.778568, 34.976024, 500);

        font_Entity.addText("Kyoto", second_Font_Point, { color: [0, 0, 0], font_size: 25 });

        //エンティティをシーンに追加
        this.viewer.scene.addEntity(font_Entity);
    }

    // シーンの読み込み
    LoadScene() {
        var loader = new mapray.GeoJSONLoader( this._viewer.scene, "./data/RouteLine.json", {
            onLoad: (loader, isSuccess) => { console.log("success load geojson") },
            getLineColor: d => d.properties && d.properties.color ? d.properties.color : [0, 0, 255, 1.0],
            getLineWidth: d => d.properties && d.properties.width ? d.properties.width : 3,
            getAltitude: () => 100
        } );

        loader.load();
    }

    ChangeLineWidth() {
        // プルダウンの値取得
        var line_Width_Value = parseFloat(document.getElementById("LineWidthPullDown").value);

        // プルダウンの値を設定
        var lineEntity = this.viewer.scene.getEntity(1);
        lineEntity.setLineWidth(line_Width_Value);
    }

    ChangeLineColor() {
        // プルダウンの値取得
        var line_ColorChord = document.getElementById("LineColorPallet").value;

        // カラーコードをRBGに変換
        var RGBArray = this.convertColorChordToRGB(line_ColorChord);

        // プルダウンの値を設定
        var lineEntity = this.viewer.scene.getEntity(1);
        lineEntity.setColor(RGBArray);
    }

    convertColorChordToRGB(colorChord) {
        var colorChordChars = colorChord.split('')

        var r = parseInt(colorChordChars[1].toString() + colorChordChars[2].toString(), 16) / 255;
        var g = parseInt(colorChordChars[3].toString() + colorChordChars[4].toString(), 16) / 255;
        var b = parseInt(colorChordChars[5].toString() + colorChordChars[6].toString(), 16) / 255;

        return [r, g, b]
    }

}

function CreateChangeGeoJSONFormatInstance(container) {
    change_GeoJSON_Format = new ChangeGeoJSONFormat(container);
}

function LineWidthValueChanged() {
    change_GeoJSON_Format.ChangeLineWidth()
}

function LineColorValueChanged() {
    change_GeoJSON_Format.ChangeLineColor()
}
