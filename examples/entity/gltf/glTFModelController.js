// JavaScript source code
var model_Controller;

class ModelController {
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

        // glTFモデルのライセンス表示
        this.viewer.attribution_controller.addAttribution( {
            display: "Created by modifying truck-wip by Renafox: Creative Commons - Attribution",
            link: "https://sketchfab.com/3d-models/truck-wip-33e925207e134652bd8c2465e5c16957"
        } );

        this.model_Point = new mapray.GeoPoint(135.759309, 35.025891, 55.0);    // モデルの球面座標(経度、緯度、高度)
        this.move_Vec = [0, 1, 0];                                              // モデルの移動方向(X:経度 Y:緯度 Z:高度)
        this.model_Angle = 0;                                                   // モデルの向いている向き（Z軸回転）
        this.isLoadedModel = false;                                             // モデルをロードできたか
        this.move_Correction = 0.00007;                                         // 移動量の補正値

        this.SetCamera();

        this.LoadScene();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    // カメラ位置の設定
    SetCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。座標は京都御所前
        var home_pos = { longitude: 135.759366, latitude: 35.025891, height: 50.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([-400, 10, 400]);
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

    // シーンの読み込み
    LoadScene() {
        var scene_File_URL = "./data/glTFController.json";

        /* glTFController.json links glTF file "./truck_wip/scene.gltf". 
        You need to get this glTF file from the web. The following is how to download it.
        
        - Access [Sketchfab] (https://sketchfab.com/3d-models/truck-wip-33e925207e134652bd8c2465e5c16957) and download the data in glTF file format
        - Click [Download link] (https://storage.cloud.google.com/mapray-examples/model/download/truck_wip.zip) to download it
        
        If you download from the download link, please unzip and use it. 
        The following explanation is based on the assumption that 
        the expanded data is stored in the following directory 
        with the relative path from the root directory of mapray-js.

        ```
        ./examples/entity/gltf/data/
        ```

        The data is not our copyrighted contents. The copyright belongs to the creator of each data. 
        Please refer to the LICENSE file in the folder for details.
        Please note that we do not take any responsibility if you infringe on the content rights.
        */

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
            this.isLoadedModel = true;

            this.UpdateModelPosition();
        }
    }

    UpdateModelPosition() {
        // sceneのEntityを取得
        var entity = this.viewer.scene.getEntity(0);

        // モデルの位置を設定
        entity.setPosition(this.model_Point);

        // モデルの回転
        entity.setOrientation(new mapray.Orientation(-this.model_Angle, 0, 0)); 
    }

    UpdateMoveVec() {
        // モデルの回転行列を求める
        var rot_mat = mapray.GeoMath.rotation_matrix([0, 0, 1], this.model_Angle, mapray.GeoMath.createMatrix());

        // 移動マトリックス生成
        var move_mat = mapray.GeoMath.createMatrix();

        // 単位行列に変換
        mapray.GeoMath.setIdentity(move_mat);

        // Yの平行成分を更新
        move_mat[13] = 1;

        // 移動マトリックスに回転行列をかける
        var rot_move_mat = mapray.GeoMath.mul_AA(rot_mat, move_mat, mapray.GeoMath.createMatrix());

        // 回転後マトリックスから座標を取得
        this.move_Vec = [rot_move_mat[12], rot_move_mat[13], rot_move_mat[14]];
    }
    
    Forward() {
        if (this.isLoadedModel == false) {
            return;
        }

        this.model_Point.longitude += this.move_Vec[0] * this.move_Correction;
        this.model_Point.latitude += this.move_Vec[1] * this.move_Correction;

        this.UpdateModelPosition();
    }

    Backward() {
        if (this.isLoadedModel == false) {
            return;
        }

        this.model_Point.longitude -= this.move_Vec[0] * this.move_Correction;
        this.model_Point.latitude -= this.move_Vec[1] * this.move_Correction;

        this.UpdateModelPosition();
    }

    LeftTurn() {
        if (this.isLoadedModel == false) {
            return;
        }

        this.model_Angle += 90;

        this.UpdateMoveVec();

        this.UpdateModelPosition();
    }

    RightTurn() {
        if (this.isLoadedModel == false) {
            return;
        }

        this.model_Angle -= 90;

        this.UpdateMoveVec();

        this.UpdateModelPosition();
    }

}

function CreateModelControllerInstance(container) {
    model_Controller = new ModelController(container);
}

function ForwardButtonClicked() {
    model_Controller.Forward();
}

function BackwardButtonClicked() {
    model_Controller.Backward();
}

function LeftTurnButtonClicked() {
    model_Controller.LeftTurn();
}

function RightTurnButtonClicked() {
    model_Controller.RightTurn();
}
