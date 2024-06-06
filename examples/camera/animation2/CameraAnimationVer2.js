// JavaScript source code
class CameraAnimation2 extends mapray.RenderCallback {

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

        this.longitude = 135.526202;    // 大阪城の経度
        this.latitude = 34.686502;      // 大阪城の緯度
        this.height = 1000;             // 大阪城の高度
        this.distance = 5000.0;         // 大阪城からの距離
        this.pitch_angle = -30.0;       // 仰俯角
        this.angular_velocity = 5.0;    // 毎フレームの回転角度
        this.turn_angle = 0;            // ターン角
        this.angle_Of_View_min = 30     // 最小画角
        this.angle_Of_View_max = 70     // 最大画角
        this.angle_Of_View = 0          // 画角
    }

    onStart()  // override
    {
        // 初期のターン角度
        this.turn_angle = 0;

        // 初期の画角
        this.angle_Of_View = 0
    }

    // フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time)  // override
    {
        var camera = this.viewer.camera;

        // カメラに変換行列を設定
        mapray.GeoMath.mul_AA(this.createBaseToGocsMatrix(), this.createViewToBaseMatrix(), camera.view_to_gocs);

        // カメラに近接遠方平面を設定
        camera.near = this.distance / 2;
        camera.far = camera.near * 1000;

        // 画角を設定
        camera.fov = this.angle_Of_View;

        // 次のターン角度
        this.turn_angle += this.angular_velocity * delta_time;

        // 次の画角
        if (this.turn_angle % 360 > 180)
        {
            this.angle_Of_View = this.angle_Of_View_min * (this.turn_angle % 180 / 180) + this.angle_Of_View_max * (1 - (this.turn_angle % 180 / 180));
        }
        else
        {
            this.angle_Of_View = this.angle_Of_View_min * (1 - (this.turn_angle % 180 / 180)) + this.angle_Of_View_max * (this.turn_angle % 180 / 180);
        }
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider( { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", format: "jpg", min_level: 2, max_level: 18 } );

    }

    // 基準座標系から GOCS への変換行列を生成
    createBaseToGocsMatrix() {
        var base_geoPoint = new mapray.GeoPoint( this.longitude, this.latitude, this.height );
        var base_to_gocs = base_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        return base_to_gocs;
    }

    // カメラの相対位置を計算し、姿勢を決める
    createViewToBaseMatrix() {
        var d = this.distance;

        var mat = mapray.GeoMath.createMatrix();

        var camera_pos_mat = mapray.GeoMath.createMatrix();
        mapray.GeoMath.setIdentity(camera_pos_mat);

        // カメラの位置をY軸方向に距離分移動させる
        camera_pos_mat[13] = -d;
        
        // z軸でturn_angle分回転させる回転行列を求める
        var turn_Mat = mapray.GeoMath.rotation_matrix([0, 0, 1], this.turn_angle, mapray.GeoMath.createMatrix());
        
        // x軸でpitch_angle分回転させる回転行列を求める
        var pitch_Mat = mapray.GeoMath.rotation_matrix([1, 0, 0], this.pitch_angle, mapray.GeoMath.createMatrix());
        
        // カメラの位置にX軸の回転行列をかける
        mapray.GeoMath.mul_AA(pitch_Mat, camera_pos_mat, camera_pos_mat);
        
        // カメラの位置にZ軸の回転行列をかける
        mapray.GeoMath.mul_AA(turn_Mat, camera_pos_mat, camera_pos_mat);

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([camera_pos_mat[12], camera_pos_mat[13], camera_pos_mat[14]]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

        // ビュー変換行列を作成
        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, mat);

        return mat;
    }

}
