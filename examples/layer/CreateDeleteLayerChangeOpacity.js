// JavaScript source code
var layer_Control;

class LayerControl {

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

    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標系（経度、緯度、高度）で視点を設定。座標は東京ドーム
        var home_pos = { longitude: 139.751891, latitude: 35.70564, height: 50.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([-500, 500, 200]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

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

    createLayerImageProvider() {
        // レイヤー用の地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 5, 18);
    }

    AddLayer() {
        //UI不透明度取得
        var opacity_Value = parseFloat(document.getElementById("LayerOpacityPullDown").value);

        //レイヤーを末尾に追加
        this.viewer.layers.add({ image_provider: this.createLayerImageProvider(), opacity: opacity_Value });
    }

    DeleteLayer() {
        //末尾のレイヤーを削除
        if (this.viewer.layers.num_layers == 0) {
            return;
        }

        this.viewer.layers.remove(this.viewer.layers.num_layers - 1);
    }

    ChangeOpacity() {
        if (this.viewer.layers.num_layers == 0) {
            return;
        }

        //UI不透明度取得
        var opacity_Value = parseFloat(document.getElementById("LayerOpacityPullDown").value);

        //末尾のレイヤー不透明度を変更
        this.viewer.layers.getLayer(this.viewer.layers.num_layers - 1).setOpacity(opacity_Value);
    }
}

function CreateLayerControlInstance(container) {
    layer_Control = new LayerControl(container);
}

function CreateLayerButtonClicked() {
    layer_Control.AddLayer()
}

function DeleteLayerButtonClicked() {
    layer_Control.DeleteLayer()
}

function LayerOpacityValueChanged() {
    layer_Control.ChangeOpacity()
}
