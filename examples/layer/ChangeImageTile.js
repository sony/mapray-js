// JavaScript source code
var viewer_Image_Control;

class ViewerImageControl {

    constructor(container) {
        // Access Tokenを設定
        this.accessToken = "<your access token here>";

        this.container = container;

        // Viewerを作成する
        this.viewer = new mapray.Viewer(
            this.container, {
                image_provider: this.createImageProvider(),
                dem_provider: new mapray.CloudDemProvider(this.accessToken)
            }
        );

        this.SetCamera();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        //UIのマップタイルを取得
        var map_Tile_Value = document.getElementById("MapTilePullDown").value;

        if (map_Tile_Value == "std") {
            // 国土地理院提供の標準地図タイルを設定
            return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 5, 18);
        } else {
            // 国土地理院提供の写真タイルを設定
            return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
        }
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標系（経度、緯度、高度）で視点を設定。座標は皇居
        var home_pos = { longitude: 139.7528, latitude: 35.685175, height: 45000 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 7000]);
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
        this.viewer.camera.far = 1000000;
    }

    ChangeMapTile() {
        // Viewerのインスタンスを破棄
        this.viewer.destroy();

        // Viewerを作成
        this.viewer = new mapray.Viewer(
            this.container, {
                image_provider: this.createImageProvider(),
                dem_provider: new mapray.CloudDemProvider(this.accessToken)
            }
        );

        this.SetCamera();
    }
    
}

function CreateViewerImageControlInstance(container) {
    viewer_Image_Control = new ViewerImageControl(container);
}

function MapTileValueChanged() {
    viewer_Image_Control.ChangeMapTile();
}
