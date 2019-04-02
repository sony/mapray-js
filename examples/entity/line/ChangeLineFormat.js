// JavaScript source code
var change_Line_Format;

class ChangeLineFormat {

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

        this.SetCamera()

        this.MakeUIFormatLine()

        this.SetLinePointStr()
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標系（経度、緯度、高度）で視点を設定。皇居と東京タワーの中間点付近
        var home_pos = { longitude: 139.749486, latitude: 35.671190, height: 50 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 7500]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

        //ビュー変換行列を作成
        var view_to_home = mapray.GeoMath.createMatrix();
        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

        // カメラの位置と視線方向からカメラの姿勢を変更
        var view_to_gocs = this.viewer.camera.view_to_gocs;
        mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

        // カメラのnear  farの設定
        this.viewer.camera.near = 30;
        this.viewer.camera.far = 500000;
    }

    MakeUIFormatLine() {
        //直線のエンティティを作成
        var entity = new mapray.MarkerLineEntity(this.viewer.scene);

        //皇居の座標を求める
        var line_Fast_Pos = { longitude: 139.7528, latitude: 35.685175, height: 350 }
        var line_Fast_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(line_Fast_Pos, mapray.GeoMath.createMatrix());

        //東京タワーの座標を求める
        var line_Second_Pos = { longitude: 139.745433, latitude: 35.658581, height: 350 }
        var line_Second_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(line_Second_Pos, mapray.GeoMath.createMatrix());

        var points = [line_Fast_View_To_Gocs[12], line_Fast_View_To_Gocs[13], line_Fast_View_To_Gocs[14],
                      line_Second_View_To_Gocs[12], line_Second_View_To_Gocs[13], line_Second_View_To_Gocs[14]]

        entity.addPoints(points)

        //プルダウンの値取得
        var line_Width_Value = parseFloat(document.getElementById("LineWidthPullDown").value);
        var line_CollarChord = document.getElementById("LineCollarPallet").value;

        //CollarChordをRBGに変換
        var RGBArray = this.convertCollarChordToRGB(line_CollarChord);

        //プルダウンの値を設定
        entity.setLineWidth(line_Width_Value);
        entity.setColor(RGBArray);

        //エンティティをシーンに追加
        this.viewer.scene.addEntity(entity);
    }

    SetLinePointStr() {
        //文字のエンティティを作成
        var entity = new mapray.TextEntity(this.viewer.scene);
        //皇居より400mほど東の場所
        var fast_Font_Pos = { longitude: 139.758503, latitude: 35.685030, height: 350 }

        var fast_Font_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(fast_Font_Pos, mapray.GeoMath.createMatrix());

        entity.addText("The Imperial Palace",
                 [fast_Font_View_To_Gocs[12], fast_Font_View_To_Gocs[13], fast_Font_View_To_Gocs[14]],
                 { color: [1, 1, 0], font_size: 25 });
        //東京タワーより300mほど東の場所
        var second_Font_Pos = { longitude: 139.749169, latitude: 35.658252, height: 350 }

        var second_Font_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(second_Font_Pos, mapray.GeoMath.createMatrix());

        entity.addText("Tokyo Tower",
                 [second_Font_View_To_Gocs[12], second_Font_View_To_Gocs[13], second_Font_View_To_Gocs[14]],
                 { color: [1, 1, 0], font_size: 25 });

        //エンティティをシーンに追加
        this.viewer.scene.addEntity(entity);
    }

    ChangeLineWidth() {
        //プルダウンの値取得
        var line_Width_Value = parseFloat(document.getElementById("LineWidthPullDown").value);

        //プルダウンの値を設定
        var lineEntity = this.viewer.scene.getEntity(0);
        lineEntity.setLineWidth(line_Width_Value);

    }

    ChangeLineCollar() {
        //プルダウンの値取得
        var line_CollarChord = document.getElementById("LineCollarPallet").value;

        //CollarChordをRBGに変換
        var RGBArray = this.convertCollarChordToRGB(line_CollarChord);

        //プルダウンの値を設定
        var lineEntity = this.viewer.scene.getEntity(0);
        lineEntity.setColor(RGBArray);

    }

    convertCollarChordToRGB(collarChord) {
        var collarChordChars = collarChord.split('')

        var r = parseInt(collarChordChars[1].toString() + collarChordChars[2].toString(), 16) / 255;
        var g = parseInt(collarChordChars[3].toString() + collarChordChars[4].toString(), 16) / 255;
        var b = parseInt(collarChordChars[5].toString() + collarChordChars[6].toString(), 16) / 255;

        return [r, g, b]
    }
}

function CreateChangeLineFormatInstance(container) {
    change_Line_Format = new ChangeLineFormat(container);
}

function LineWidthValueChanged() {
    change_Line_Format.ChangeLineWidth()
}

function LineCollarValueChanged() {
    change_Line_Format.ChangeLineCollar()
}
