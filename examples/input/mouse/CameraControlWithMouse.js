// JavaScript source code
var GeoMath = mapray.GeoMath;

class CameraControl extends mapray.RenderCallback{

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

        // 球面座標系（経度、緯度、高度）で視点の初期値を設定。座標は富士山から7kmほど南西の場所
        this.camera_Pos = { longitude: 138.668035, latitude: 35.290262, height: 5500.0 };
        this.camera_Vec = [0, 0, 0];                // カメラの前進後退方向
        this.camera_Turn_Angle = 145;               // ターン角度
        this.camera_Pitch = 20;                     // 仰俯角
        this.camera_Move_Correction = 30;           // 前進後退の補正値
        this.camera_Turn_Correction = 0.1;          // ターン、仰俯角の補正値
        this.camera_Height_Correction = 0.5;        // 高度更新の補正値

        // 入力検知クラス
        this.input_Checker = new CheckInput(this.viewer);

        this.SetCamera();
    }

    // フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time)  // override
    {
        // カメラ回転
        var turn_Drag_Vec = [0, 0];
        if (this.input_Checker.IsCameraTurn(turn_Drag_Vec)) {
            this.TurnCamera(turn_Drag_Vec);
        }

        // カメラの高度変更
        var height_Move_Drag_Vec = [0, 0];
        if (this.input_Checker.IsCameraHeightMove(height_Move_Drag_Vec)) {
            this.UpdateCameraHeight(height_Move_Drag_Vec);
        }

        // カメラ前進
        if (this.input_Checker.IsForward()) {
            this.ForwardCameraPos();
        }

        // カメラ後退
        if (this.input_Checker.IsBackward()) {
            this.BackwardCameraPos();
        }

        this.SetCamera();

        var click_Pos = [0, 0];

        // 緯度経度高度表示
        if (this.input_Checker.IsMouseClick(click_Pos)) {
            this.SetClickPosLongitudeAndLatitudeAndHeight(click_Pos);
        }

        this.input_Checker.endFrame();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標から地心直交座標へ変換
        var camera_geoPoint = new mapray.GeoPoint( this.camera_Pos.longitude, this.camera_Pos.latitude, this.camera_Pos.height );
        var camera_Pos_Gocs = camera_geoPoint.getMlocsToGocsMatrix( GeoMath.createMatrix() );

        var camera_End_Pos_Mat = GeoMath.createMatrix();
        GeoMath.setIdentity(camera_End_Pos_Mat);

        // カメラの位置をY軸方向に移動させる
        camera_End_Pos_Mat[13] = -1;

        // z軸でcamera_Turn_Angle分回転させる回転行列を求める
        var turn_Mat = GeoMath.rotation_matrix([0, 0, 1], this.camera_Turn_Angle, GeoMath.createMatrix());

        // x軸でcamera_Pitch分回転させる回転行列を求める
        var pitch_Mat = GeoMath.rotation_matrix([1, 0, 0], this.camera_Pitch, GeoMath.createMatrix());

        // カメラの位置にX軸の回転行列をかける
        GeoMath.mul_AA(pitch_Mat, camera_End_Pos_Mat, camera_End_Pos_Mat);

        // カメラの位置にZ軸の回転行列をかける
        GeoMath.mul_AA(turn_Mat, camera_End_Pos_Mat, camera_End_Pos_Mat);

        // 視線方向を定義
        var cam_Start_Pos = GeoMath.createVector3([0, 0, 0]);
        var camera_End_Pos = GeoMath.createVector3([camera_End_Pos_Mat[12], camera_End_Pos_Mat[13], camera_End_Pos_Mat[14]]);

        // 視点、注視点ベクトルとZ軸で外積をして垂直な軸を求める
        var tmp_closs_vec = GeoMath.cross3(camera_End_Pos, GeoMath.createVector3([0, 0, -1]), GeoMath.createVector3());
        GeoMath.normalize3(tmp_closs_vec, tmp_closs_vec);
        
        // 視点、注視点ベクトルと垂直な軸で外積をしてアップベクトルを求める
        var cam_Up = GeoMath.cross3(camera_End_Pos, tmp_closs_vec, GeoMath.createVector3());

        // ビュー変換行列を作成
        var view_To_Home = GeoMath.createMatrix();
        GeoMath.lookat_matrix(cam_Start_Pos, camera_End_Pos, cam_Up, view_To_Home);

        // カメラの位置と視線方向からカメラの姿勢を変更
        var view_To_Gocs = this.viewer.camera.view_to_gocs;
        GeoMath.mul_AA(camera_Pos_Gocs, view_To_Home, view_To_Gocs);

        // カメラの視線方向を取得
        this.camera_Vec = [view_To_Gocs[8], view_To_Gocs[9], view_To_Gocs[10]];

        // カメラのnear、farの設定
        this.viewer.camera.near = 30;
        this.viewer.camera.far = 500000;
    }

    SetClickPosLongitudeAndLatitudeAndHeight(clickPos) {
        // キャンバス座標のレイを取得
        var ray = this.viewer.camera.getCanvasRay(clickPos, new mapray.Ray());

        // レイと地表の交点を求める
        var clossPoint = this.viewer.getRayIntersection(ray);

        if (clossPoint != null) {
            // 交点を球面座標系に変換する
            var closs_geoPoint = new mapray.GeoPoint();
            closs_geoPoint.setFromGocs( clossPoint );

            // UIを更新する
            document.getElementById( "LongitudeValue" ).innerText = closs_geoPoint.longitude.toFixed(6);
            document.getElementById( "LatitudeValue" ).innerText = closs_geoPoint.latitude.toFixed(6);
            document.getElementById( "HeightValue" ).innerText = closs_geoPoint.altitude.toFixed(6);
        }
    }

    ForwardCameraPos() {
        // 球面座標から地心直交座標へ変換
        var camera_geoPoint = new mapray.GeoPoint( this.camera_Pos.longitude, this.camera_Pos.latitude, this.camera_Pos.height );
        var camera_Pos_Gocs = camera_geoPoint.getMlocsToGocsMatrix( GeoMath.createMatrix() );

        // 地心直交座標の平行移動成分を変更
        camera_Pos_Gocs[12] -= this.camera_Vec[0] * this.camera_Move_Correction;
        camera_Pos_Gocs[13] -= this.camera_Vec[1] * this.camera_Move_Correction;
        camera_Pos_Gocs[14] -= this.camera_Vec[2] * this.camera_Move_Correction;

        // 地心直交座標を球面座標に変換する
        var next_camera_geoPoint = new mapray.GeoPoint();
        next_camera_geoPoint.setFromGocs( [camera_Pos_Gocs[12], camera_Pos_Gocs[13], camera_Pos_Gocs[14]] );
        
        this.camera_Pos.longitude = next_camera_geoPoint.longitude;
        this.camera_Pos.latitude = next_camera_geoPoint.latitude;
        this.camera_Pos.height = next_camera_geoPoint.altitude;
    }

    BackwardCameraPos() {
        // 球面座標から地心直交座標へ変換
        var camera_geoPoint = new mapray.GeoPoint( this.camera_Pos.longitude, this.camera_Pos.latitude, this.camera_Pos.height );
        var camera_Pos_Gocs = camera_geoPoint.getMlocsToGocsMatrix( GeoMath.createMatrix() );

        // 地心直交座標の平行移動成分を変更
        camera_Pos_Gocs[12] += this.camera_Vec[0] * this.camera_Move_Correction;
        camera_Pos_Gocs[13] += this.camera_Vec[1] * this.camera_Move_Correction;
        camera_Pos_Gocs[14] += this.camera_Vec[2] * this.camera_Move_Correction;

        // 地心直交座標を球面座標に変換する
        var next_camera_geoPoint = new mapray.GeoPoint();
        next_camera_geoPoint.setFromGocs( [camera_Pos_Gocs[12], camera_Pos_Gocs[13], camera_Pos_Gocs[14]] );

        this.camera_Pos.longitude = next_camera_geoPoint.longitude;
        this.camera_Pos.latitude = next_camera_geoPoint.latitude;
        this.camera_Pos.height = next_camera_geoPoint.altitude;
    }

    TurnCamera(drag_Vec) {
        // ターン、仰俯角の角度の更新量決定
        var add_Turn_Angle = drag_Vec[0] * this.camera_Turn_Correction;
        var add_Pitch = drag_Vec[1] * this.camera_Turn_Correction;

        // 更新量が少なかったら０にする
        if (add_Turn_Angle > -0.3 & add_Turn_Angle < 0.3) {
            add_Turn_Angle = 0;
        }

        if (add_Pitch > -0.3 & add_Pitch < 0.3) {
            add_Pitch = 0;
        }

        // ターン、仰俯角の角度更新
        this.camera_Turn_Angle -= add_Turn_Angle;
        this.camera_Pitch += add_Pitch;
    }

    UpdateCameraHeight(drag_Vec) {
        // 高度の変更量決定
        var add_Height = drag_Vec[1] * this.camera_Height_Correction;
        
        // 値が小さい場合０にする
        if (add_Height > -1 & add_Height < 1) {
            add_Height = 0;
        }

        // カメラ座標の高度を更新する
        this.camera_Pos.height -= add_Height;
    }
    
}
