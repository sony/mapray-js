// JavaScript source code
var GeoMath = mapray.GeoMath;

class VirtualPathCameraAnimation extends mapray.RenderCallback {

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

        this.path_Pos_Array = [{ longitude: 139.7528, latitude: 35.685175, height: 50.0 },      // 仮想パスの終点(皇居)
                               { longitude: 139.745433, latitude: 35.658581, height: 50.0 },    // 仮想パスの終点(東京タワー)
                               { longitude: 139.8107, latitude: 35.710063, height: 50.0 },      // 仮想パスの終点(スカイツリー)
                               { longitude: 139.751891, latitude: 35.70564, height: 50.0 },     // 仮想パスの終点(東京ドーム)
                               { longitude: 139.7528, latitude: 35.685175, height: 50.0 }]      // 仮想パスの始点(皇居)
        this.distance = 3000.0;         // 基準点からの距離
        this.pitch_angle = -30.0;       // 仰俯角
        this.ratio_Increment = 0.15;    // 毎フレームの線形補間割合増加分
        this.ratio = 0.0;               // 線形補間の割合
        this.path_Pos_Index = 0;
    }

    onStart()  // override
    {
        // 初期の線形補間の割合を設定
        this.ratio = 0.0;
    }

    //フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time)  // override
    {
        var camera = this.viewer.camera;

        // カメラに変換行列を設定
        GeoMath.mul_AA(this.createInterpolationBaseToGocsMatrix(), this.createViewToBaseMatrix(), camera.view_to_gocs);

        // カメラに近接遠方平面を設定
        camera.near = this.distance / 2;
        camera.far = camera.near * 1000;

        // 次の線形補間の割合
        this.ratio += this.ratio_Increment * delta_time;

        if (this.ratio > 1.0) {
            this.ratio = 0.0;
            this.path_Pos_Index += 1;
        }

        if (this.path_Pos_Index == this.path_Pos_Array.length - 1) {
            this.path_Pos_Index = 0;
        }
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    // 2点の間を線形保管し、基準座標系から GOCS への変換行列を生成
    createInterpolationBaseToGocsMatrix() {
        var interpolation_Pos = {
            longitude: this.path_Pos_Array[this.path_Pos_Index].longitude * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].longitude * this.ratio,
            latitude: this.path_Pos_Array[this.path_Pos_Index].latitude * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].latitude * this.ratio,
            height: this.path_Pos_Array[this.path_Pos_Index].height * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].height * this.ratio
        };

        var base_to_gocs = GeoMath.createMatrix();
        GeoMath.iscs_to_gocs_matrix({
            longitude: interpolation_Pos.longitude,
            latitude: interpolation_Pos.latitude,
            height: interpolation_Pos.height
        }, base_to_gocs);

        return base_to_gocs;
    }

    // カメラの相対位置を計算し、姿勢を決める
    createViewToBaseMatrix() {
        var d = this.distance;

        var mat = GeoMath.createMatrix();

        var camera_pos_mat = GeoMath.createMatrix();
        GeoMath.setIdentity(camera_pos_mat);

        // カメラの位置をY軸方向に距離分移動させる
        camera_pos_mat[13] = -d;
        
        // x軸でpitch_angle分回転させる回転行列を求める
        var pitch_Mat = GeoMath.rotation_matrix([1, 0, 0], this.pitch_angle, GeoMath.createMatrix());
        
        // カメラの位置にX軸の回転行列をかける
        GeoMath.mul_AA(pitch_Mat, camera_pos_mat, camera_pos_mat);

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([camera_pos_mat[12], camera_pos_mat[13], camera_pos_mat[14]]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

        // ビュー変換行列を作成
        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, mat);

        return mat;
    }

}
