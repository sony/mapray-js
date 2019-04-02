// JavaScript source code
var GeoMath = mapray.GeoMath;

class LineAnimation extends mapray.RenderCallback {

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

        this.line_Pos_Array = [{ longitude: 139.7528, latitude: 35.685175, height: 500.0 },     //仮想パスの終点(皇居)
                               { longitude: 139.745433, latitude: 35.658581, height: 500.0 },     //仮想パスの終点(東京タワー)
                               { longitude: 139.8107, latitude: 35.710063, height: 500.0 },     //仮想パスの終点(スカイツリー)
                               { longitude: 139.751891, latitude: 35.70564, height: 500.0 },     //仮想パスの終点(東京ドーム)
                               { longitude: 139.7528, latitude: 35.685175, height: 500.0 }]//仮想パスの始点(皇居)

        this.ratio_Increment = 0.15;    //毎フレームの線形補間割合増加分
        this.ratio = 0.0;            //線形補間の割合
        this.line_Pos_Index = 0;

        this.CreateMarkerLineEntityAndAddLineStartPoint();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標系（経度、緯度、高度）で視点を設定。座標は皇居
        var home_pos = { longitude: 139.7528, latitude: 35.685175, height: 20000 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 7000]);
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
        this.viewer.camera.far = 1000000;
    }

    CreateMarkerLineEntityAndAddLineStartPoint() {
        //直線のエンティティを作成
        var entity = new mapray.MarkerLineEntity(this.viewer.scene);

        var line_Point_Gocs = this.createPointToGocsMatrix(this.line_Pos_Array[0]);

        var points = [line_Point_Gocs[12], line_Point_Gocs[13], line_Point_Gocs[14]];

        entity.addPoints(points);

        entity.setLineWidth(11)

        //エンティティをシーンに追加
        this.viewer.scene.addEntity(entity);
    }

    createPointToGocsMatrix(point) {
        var point_To_Gocs = GeoMath.createMatrix();
        GeoMath.iscs_to_gocs_matrix({
            longitude: point.longitude,
            latitude: point.latitude,
            height: point.height
        }, point_To_Gocs);
        return point_To_Gocs;
    }

    onStart()  // override
    {
        // 初期化（経過時間、ポイント経度、緯度）
        this.ratio = 0.0;
    }

    //フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time)  // override
    {
        // 次の線形補間の割合
        this.ratio += this.ratio_Increment * delta_time;

        if (this.ratio > 1.0) {
            this.ratio = 0.0;
            this.line_Pos_Index += 1
        }

        if (this.line_Pos_Index == this.line_Pos_Array.length - 1) {
            this.line_Pos_Index = 0

            this.viewer.scene.clearEntities();

            this.CreateMarkerLineEntityAndAddLineStartPoint();
        }

        //始点終点間の緯度経度高度のベクトル作成
        var vec = [this.line_Pos_Array[this.line_Pos_Index + 1].longitude - this.line_Pos_Array[this.line_Pos_Index].longitude,
                   this.line_Pos_Array[this.line_Pos_Index + 1].latitude - this.line_Pos_Array[this.line_Pos_Index].latitude,
                   this.line_Pos_Array[this.line_Pos_Index + 1].height - this.line_Pos_Array[this.line_Pos_Index].height];
        GeoMath.normalize3(vec, vec);
        //外積で補正方向算出
        var closs_Vec = GeoMath.cross3(vec, [0, 0, 1], GeoMath.createVector3());

        //次のラインの緯度経度高度を算出
        var line_Point = {longitude: (this.line_Pos_Array[this.line_Pos_Index].longitude * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].longitude * this.ratio) + (closs_Vec[0] * 0.02) * Math.sin(this.ratio * 180 * GeoMath.DEGREE),
                          latitude: (this.line_Pos_Array[this.line_Pos_Index].latitude * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].latitude * this.ratio) + (closs_Vec[1] * 0.02) * Math.sin(this.ratio * 180 * GeoMath.DEGREE),
                          height: this.line_Pos_Array[this.line_Pos_Index].height * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].height * this.ratio}

        //球面座標系から地心座標系に変換
        var line_Point_Gocs = this.createPointToGocsMatrix(line_Point);

        this.AddLinePoint([line_Point_Gocs[12], line_Point_Gocs[13], line_Point_Gocs[14]]);

    }

    AddLinePoint(point_xyz)
    {
        //ラインの点を追加する
        var line_Entity = this.viewer.scene.getEntity(0);
        line_Entity.addPoints(point_xyz);
    }

}
