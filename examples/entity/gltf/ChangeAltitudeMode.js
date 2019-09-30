// JavaScript source code
var change_altitude_mode;

class ChangeAltitudeMode {
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
        
        this.model_Point = new mapray.GeoPoint(140.379528, 35.758832, 40.0);    //モデルの球面座標(経度、緯度、高度)
        this.altitude_mode = mapray.AltitudeMode.ABSOLUTE;

        this.SetCamera()

        this.LoadScene();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    // カメラ位置の設定
    SetCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。成田国際空港付近
        var home_pos = { longitude: 140.379528, latitude: 35.758832, height: 40 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([-500, -1500, 500]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

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

    // シーンの読み込み
    LoadScene() {
        var scene_File_URL = "./data/glTFChangeAltitudeMode.json";

        // シーンを読み込む
        var loader = new mapray.SceneLoader(this.viewer.scene, scene_File_URL, {
            transform: (url, type) => this.onTransform(url, type),
            callback: (loader, isSuccess) => {
                this.onLoadScene(loader, isSuccess);
            }
        });

        loader.load();
    }

    onTransform(url, type) {
        return {
            url: url,
            credentials: mapray.CredentialMode.SAME_ORIGIN,
            headers: {}
        };
    }

    onLoadScene(loader, isSuccess) {
        if (isSuccess) {
            this.UpdateModelPosition();
        }
    }
    
    UpdateModelPosition() {
        // sceneのEntityを取得
        var entity = this.viewer.scene.getEntity(0);

        // 高度モードを設定
        entity.altitude_mode = this.altitude_mode;

        // モデルの位置を設定
        entity.setPosition(this.model_Point);
        
        // モデルの回転
        entity.setOrientation(new mapray.Orientation(130, -90, 0)); 

        // モデルのスケールを設定
        entity.setScale([0.2, 0.2, 0.2]); 
    }

    ChangeAltitudeMode() {
        // プルダウンの値取得
        var altitude_mode_Value = document.getElementById("AltitudeModePullDown").value;

        // プルダウンの値を設定
        this.altitude_mode = altitude_mode_Value;

        switch ( altitude_mode_Value ) {
            case mapray.AltitudeMode.ABSOLUTE.id:
                    this.altitude_mode = mapray.AltitudeMode.ABSOLUTE;
                break;
            case mapray.AltitudeMode.RELATIVE.id:
                    this.altitude_mode = mapray.AltitudeMode.RELATIVE;
                break;
        }

        this.UpdateModelPosition();
    }

    ChangeHeight() {
        // プルダウンの値取得
        var height_Value = parseFloat(document.getElementById("HeightPullDown").value);

        // プルダウンの値を設定
        this.model_Point.altitude = height_Value;

        this.UpdateModelPosition();
    }
}

function CreateChangeAltitudeModeInstance(container) {
    change_altitude_mode = new ChangeAltitudeMode(container);
}

function AltitudeModeValueChanged() {
    change_altitude_mode.ChangeAltitudeMode()
}

function HeightValueChanged() {
    change_altitude_mode.ChangeHeight()
}