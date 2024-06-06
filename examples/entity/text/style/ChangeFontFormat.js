// JavaScript source code
var change_Font_Format;

class ChangeFontFormat {

    constructor(container) {
        // Access Tokenを設定
        var accessToken = "<your access token here>";

        // Viewerを作成する
        this.viewer = new mapray.Viewer(
            container, {
                image_provider: this.createImageProvider(),
                dem_provider: new mapray.CloudDemProvider(accessToken)
            }
        );

        this.SetCamera();

        this.WriteUIFormatStr();
    }

    WriteUIFormatStr() {
        // 文字のエンティティを作成
        var entity = new mapray.TextEntity(this.viewer.scene);

        // 座標は富士山山頂付近
        var font_position = { longitude: 138.730647, latitude: 35.362773, height: 4000 };

        // GeoPointクラスを生成して、テキストを追加
        var font_geopoint = new mapray.GeoPoint( font_position.longitude, font_position.latitude, font_position.height );
        entity.addText( "Mt.Fuji", font_geopoint);

        // プルダウンの値取得
        var font_Style_Value = document.getElementById("FontStylePullDown").value;
        var font_Weight_Value = document.getElementById("FontWeightPullDown").value;
        var font_Size_Value = parseFloat(document.getElementById("FontSizePullDown").value);
        var font_ColorChord = document.getElementById("FontColorPallet").value;
        var font_Family_Value = document.getElementById("FontFamilyPullDown").value;

        // ColorChordをRBGに変換
        var RGBArray = this.convertColorChordToRGB(font_ColorChord);

        // プルダウンの値を設定
        entity.setFontStyle(font_Style_Value);
        entity.setFontWeight(font_Weight_Value);
        entity.setFontSize(font_Size_Value);
        entity.setColor(RGBArray);
        entity.setFontFamily(font_Family_Value);

        // エンティティをシーンに追加
        this.viewer.scene.addEntity(entity);
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider( { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", format: "jpg", min_level: 2, max_level: 18 } );
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標系（経度、緯度、高度）で視点を設定。富士山より５kmほど南の場所
        var home_pos = { longitude: 138.736758, latitude: 35.359326, height: 4000 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([3000, -2600, 1500]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

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

    ChangeFontStyle() {
        // プルダウンの値取得
        var font_Style_Value = document.getElementById("FontStylePullDown").value;

        // プルダウンの値を設定
        var textEntity = this.viewer.scene.getEntity(0);
        textEntity.setFontStyle(font_Style_Value);
    }

    ChangeFontWeight() {
        // プルダウンの値取得
        var font_Weight_Value = document.getElementById("FontWeightPullDown").value;

        // プルダウンの値を設定
        var textEntity = this.viewer.scene.getEntity(0);
        textEntity.setFontWeight(font_Weight_Value);
    }

    ChangeFontSize() {
        // プルダウンの値取得
        var font_Size_Value = parseFloat(document.getElementById("FontSizePullDown").value);

        // プルダウンの値を設定
        var textEntity = this.viewer.scene.getEntity(0);
        textEntity.setFontSize(font_Size_Value);
    }

    ChangeFontColor() {
        // プルダウンの値取得
        var font_ColorChord = document.getElementById("FontColorPallet").value;

        // ColorChordをRBGに変換
        var RGBArray = this.convertColorChordToRGB(font_ColorChord);

        // プルダウンの値を設定
        var textEntity = this.viewer.scene.getEntity(0);
        textEntity.setColor(RGBArray);
    }

    ChangeFontFamily() {
        // プルダウンの値取得
        var font_Family_Value = document.getElementById("FontFamilyPullDown").value;

        // プルダウンの値を設定
        var textEntity = this.viewer.scene.getEntity(0);
        textEntity.setFontFamily(font_Family_Value);
    }

    convertColorChordToRGB(colorChord) {
        var colorChordChars = colorChord.split('')

        var r = parseInt(colorChordChars[1].toString() + colorChordChars[2].toString(), 16) / 255;
        var g = parseInt(colorChordChars[3].toString() + colorChordChars[4].toString(), 16) / 255;
        var b = parseInt(colorChordChars[5].toString() + colorChordChars[6].toString(), 16) / 255;

        return [r,g,b];
    }
}

function CreateChangeFontStyleInstance(container) {
    change_Font_Format = new ChangeFontFormat(container);
}

function FontStyleValueChanged() {
    change_Font_Format.ChangeFontStyle();
}

function FontWeightValueChanged() {
    change_Font_Format.ChangeFontWeight();
}

function FontSizeValueChanged() {
    change_Font_Format.ChangeFontSize();
}

function FontColorValueChanged() {
    change_Font_Format.ChangeFontColor();
}

function FontFamilyValueChanged() {
    change_Font_Format.ChangeFontFamily();
}
