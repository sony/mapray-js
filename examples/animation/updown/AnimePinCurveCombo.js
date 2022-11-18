// JavaScript source code
class AnimePinCurveCombo extends mapray.RenderCallback {
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

        // Updaterの作成
        this.updater = new mapray.animation.Updater();

        // アニメーションの開始フラグ
        this.is_animation_start = false;

        // 経過時間
        this.total_time = 0;

        // Pin数
        this.pin_count = 0;

        this.SetCamera();

        this.AddText();

        // 入力検知クラス
        this.input_checker = new CheckInput(this.viewer);
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    // カメラ位置の設定
    SetCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。座標は新宿駅付近
        var home_pos = { longitude: 139.69685, latitude: 35.689777, height: 100.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, -2000, 500]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

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

    // テキストの表示
    AddText() {
        // 文字のエンティティを作成
        var font_Entity = new mapray.TextEntity(this.viewer.scene);

        // 新宿駅付近
        var Font_Point = new mapray.GeoPoint(139.699985, 35.690777, 100);

        font_Entity.addText("Shinjuku", Font_Point, { color: [0, 0, 0], font_size: 50 });

        // エンティティをシーンに追加
        this.viewer.scene.addEntity(font_Entity);
    }

    onUpdateFrame(delta_time)  // override
    {
      var click_Pos = [0, 0];

      // 緯度経度高度表示
      if (this.input_checker.IsMouseUp(click_Pos) && this.pin_count === 0) {
          this.SetClickPosLongitudeAndLatitudeAndHeight(click_Pos);
          this.pin_count += 1;
      }

      if (this.is_animation_start) {
          // 経過時間の更新
          this.total_time += delta_time;

          // Updaterに時間を投げる
          this.updater.update(mapray.animation.Time.fromNumber(this.total_time));
      }

      this.input_checker.endFrame();
    }

    SetClickPosLongitudeAndLatitudeAndHeight(clickPos) {
        // キャンバス座標のレイを取得
        var ray = this.viewer.camera.getCanvasRay(clickPos, new mapray.Ray());

        // レイと地表の交点を求める
        var clossResult = this.viewer.pickWithRay( ray );

        if ( clossResult ) {
            // 交点を球面座標系に変換する
            var closs_geoPoint = new mapray.GeoPoint();
            closs_geoPoint.setFromGocs( clossResult.position );

            // ピンのエンティティを作成
            var pin_entity = new mapray.PinEntity(this.viewer.scene);

            // ピンを追加
            pin_entity.addPin(closs_geoPoint, { id: 0, size: 40, bg_color: [1, 0, 0] });

            // エンティティをシーンに追加
            this.viewer.scene.addEntity(pin_entity);

            // キーフレームデータの作成
            this.createCurve(closs_geoPoint);

            this.pin_entity = pin_entity.getEntry(0);

            // UpdaterにBindingBlockを紐づける
            this.pin_entity.animation.bind("position", this.updater, this.curve);

            this.is_animation_start = true;

        }
    }

    // キーフレームデータの作成
    createCurve(closs_geoPoint) {
        var keyframes1 = [];
        var keyframes2 = [];

        this.curve = new mapray.animation.ComboVectorCurve(mapray.animation.Type.find("vector3"));
        this.curve1 = new mapray.animation.ConstantCurve(mapray.animation.Type.find("number"));
        this.curve2 = new mapray.animation.ConstantCurve(mapray.animation.Type.find("number"));
        this.curve3 = new CosCurveWithTime(mapray.animation.Type.find("number"));

        // キーフレームデータの作成
        this.curve1.setConstantValue(closs_geoPoint.longitude);

        this.curve2.setConstantValue(closs_geoPoint.latitude);

        this.curve3.setRatio(45);
        this.curve3.setBaseValue(closs_geoPoint.altitude);
        this.curve3.setValueRatio(200.0);
        this.curve3.setStartTime(0);
        this.curve3.setEndTime(30);

        this.curve.setChildren([this.curve1,this.curve2,this.curve3]);

        // 経過時間の初期化
        this.total_time = 0;
    }


}
