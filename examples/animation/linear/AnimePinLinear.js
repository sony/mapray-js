// JavaScript source code
class AnimePinLinear extends mapray.RenderCallback {
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

        // カメラ設定
        this.SetCamera();

        // キーフレームデータの作成
        this.createCurve();

        // Entity追加
        this.AddEntity();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider( { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", format: "jpg", min_level: 2, max_level: 18 } );
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

    // キーフレームデータの作成
    createCurve() {
        var keyframes1 = [];
        var keyframes2 = [];

        this.curve1 = new mapray.animation.KFLinearCurve(mapray.animation.Type.find("number"));
        this.curve2 = new mapray.animation.KFLinearCurve(mapray.animation.Type.find("vector3"));

        // キーフレームデータの作成
        keyframes1.push(mapray.animation.Time.fromNumber(0));
        keyframes1.push(5.0);
        keyframes1.push(mapray.animation.Time.fromNumber(1));
        keyframes1.push(40.0);
        this.curve1.setKeyFrames(keyframes1);

        keyframes2.push(mapray.animation.Time.fromNumber(0));
        keyframes2.push(mapray.GeoMath.createVector3([0, 1.0, 0]));
        keyframes2.push(mapray.animation.Time.fromNumber(1));
        keyframes2.push(mapray.GeoMath.createVector3([0, 0, 1.0]));
        keyframes2.push(mapray.animation.Time.fromNumber(2));
        keyframes2.push(mapray.GeoMath.createVector3([1.0, 0, 0]));
        for (let t = 0; t <= 5; ++t) {
          keyframes2.push(mapray.animation.Time.fromNumber(2.5 + t));
          keyframes2.push(mapray.GeoMath.createVector3([1.0, 1.0, 1.0]));
          keyframes2.push(mapray.animation.Time.fromNumber(3 + t));
          keyframes2.push(mapray.GeoMath.createVector3([1.0, 0, 0]));
        }
        this.curve2.setKeyFrames(keyframes2);

        // 経過時間の初期化
        this.total_time = 0;
    }

    // Entityの設定
    AddEntity() {
        // 文字のエンティティを作成
        var font_entity = new mapray.TextEntity(this.viewer.scene);

        // 新宿駅付近
        var font_point = new mapray.GeoPoint(139.699985, 35.690777, 100);

        font_entity.addText("Shinjuku", font_point, { color: [0, 0, 0], font_size: 50 });

        // エンティティをシーンに追加
        this.viewer.scene.addEntity(font_entity);


        // ピンのエンティティを作成
        var pin_entity = new mapray.PinEntity(this.viewer.scene);

        // 新宿駅付近
        var pin_point = new mapray.GeoPoint(139.699985, 35.690777, 100)

        // ピンを追加
        pin_entity.addPin(pin_point, { id: 0, size: 40, bg_color: [1, 0, 0] });

        // エンティティをシーンに追加
        this.viewer.scene.addEntity(pin_entity);

        // PinEntityを記憶
        this.pin_entity = this.viewer.scene.getEntity(1).getEntry(0);

        // UpdaterにBindingBlockを紐づける
        this.pin_entity.animation.bind("size", this.updater, this.curve1);
        this.pin_entity.animation.bind("bg_color", this.updater, this.curve2);

        // Animation開始
        this.is_animation_start = true;
    }

    onUpdateFrame(delta_time)  // override
    {
      if (this.is_animation_start) {
          // 経過時間の更新
          this.total_time += delta_time;

          // Updaterに時間を投げる
          this.updater.update(mapray.animation.Time.fromNumber(this.total_time));
      }
    }

}
