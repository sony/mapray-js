class AnimePathEasyBinding extends mapray.RenderCallback {
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

        // BindingBlockの作成
        this.block = new mapray.animation.EasyBindingBlock();

        // Updaterの作成
        this.updater = new mapray.animation.Updater();

        // アニメーションの開始フラグ
        this.is_animation_start = false;

        // 経過時間
        this.total_time = 0;

        // カメラの設定
        this.setCamera();

        // エンティティの作成
        this.createText();
        this.createPin();
        this.createPath();

        // BindingBlockの作成
        this.createBlock();

        // キーフレームデータの作成
        this.createCurve();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider( { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", format: "jpg", min_level: 2, max_level: 18 } );
    }

    // カメラ位置の設定
    setCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。モデルの座標を設定
        var home_pos = { longitude: 130.873921, latitude: 33.884291, height: 3.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([1000, 1000, 500]);
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

    // エンティティの作成
    createText() {
      // 文字のエンティティを作成
      var entity = new mapray.TextEntity(this.viewer.scene);

      // 仮の位置
      var font_point = new mapray.GeoPoint(0, 0, 0);

      entity.addText("0", font_point, { id: 0, color: [1, 1, 0], font_size: 50 });

      // エンティティをシーンに追加
      this.viewer.scene.addEntity(entity);
      this.text_entity = entity.getEntry(0);
    }

    // エンティティの作成
    createPin() {
      // ピンのエンティティを作成
      var entity = new mapray.PinEntity(this.viewer.scene);

      // 仮の位置
      var point = new mapray.GeoPoint(0, 0, 0);

      // ピンを追加
      entity.addPin(point, { id: 0, size: 50, bg_color: [0.5, 1, 1], fg_color: [0, 0, 0] });

      // エンティティをシーンに追加
      this.viewer.scene.addEntity(entity);
      this.pin_entity = entity.getEntry(0);
    }

    // エンティティの作成
    createPath() {
        // エンティティを作成
        var entity = new mapray.PathEntity(this.viewer.scene);
        entity.altitude_mode = mapray.AltitudeMode.CLAMP;
        // entity.altitude_mode = mapray.AltitudeMode.RELATIVE;

        var pos1 = [130.875921, 33.886291, 50.0];
        var pos2 = [130.873921, 33.884291, 50.0];
        var pos3 = [130.873921, 33.882291, 50.0];
        var pos4 = [130.874921, 33.881291, 50.0];

        var length = [0, 10, 20, 30];

        var pos_array = pos1;
        var length_array = [length[0]];

        var all_pos = pos1.concat(pos2).concat(pos3).concat(pos4);

        for (let i = 0; i < all_pos.length - 3; i = i + 3) {
            for (let j = 1; j <= 100; ++j) {
                var dis = [
                    all_pos[i    ] + (all_pos[i + 3] - all_pos[i    ]) / 100 * j,
                    all_pos[i + 1] + (all_pos[i + 4] - all_pos[i + 1]) / 100 * j,
                    all_pos[i + 2] + (all_pos[i + 5] - all_pos[i + 2]) / 100 * j
                ];

                pos_array = pos_array.concat(dis);
                length_array = length_array.concat(length[i / 3] + j / 10);
            }
        }

        this.position_array = pos_array;

        entity.addPoints(all_pos, length);
        entity.setLineWidth(5);
        entity.setColor(mapray.GeoMath.createVector3([1.0, 0.0, 0.0]));
        entity.setUpperLength(30);

        // エンティティをシーンに追加
        this.viewer.scene.addEntity(entity);
        this.path_entity = entity;
    }

    // EasyBindingBlockにアニメーション可能パラメータを追加
    createBlock() {
      const number = mapray.animation.Type.find( "number" );

      this.block.addEntry( "length", [number], null, value => {
          const position_value = Math.floor(value*10);
          if(this.position_array.length > position_value*3) {
            const text_value = Math.floor(value);
            this.text_entity.setText(text_value);
            var altitude = this.viewer.getElevation(this.position_array[position_value*3+1], this.position_array[position_value*3+0]);
            const text_position = new mapray.GeoPoint(this.position_array[position_value*3+0], this.position_array[position_value*3+1], altitude + 120);
            this.text_entity.setPosition(text_position);
            const pin_position = new mapray.GeoPoint(this.position_array[position_value*3+0], this.position_array[position_value*3+1], altitude);
            this.pin_entity.setPosition(pin_position);
          }
          this.path_entity.setUpperLength(value);
      } );
    }

    // キーフレームデータの作成
    createCurve() {
        var marker_line = this.viewer.scene.getEntity(0);

        let keyframes = [];

        this.curve = new mapray.animation.KFLinearCurve(mapray.animation.Type.find("number"));

        // キーフレームデータの作成
        keyframes.push(mapray.animation.Time.fromNumber(0));
        keyframes.push(0);
        keyframes.push(mapray.animation.Time.fromNumber(30));
        keyframes.push(30);
        this.curve.setKeyFrames(keyframes);

        // 経過時間の初期化
        this.total_time = 0;

        // UpdaterにBindingBlockを紐づける
        this.block.bind("length", this.updater, this.curve);

        // アニメーションを開始
        this.is_animation_start = true;
    }

    onTransform(url, type) {
        return {
            url: url,
            credentials: mapray.CredentialMode.SAME_ORIGIN,
            headers: {}
        };
    }

    // override フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time) {
        if (this.is_animation_start) {
            // 経過時間の更新
            this.total_time += delta_time;

            // Updaterに時間を投げる
            this.updater.update(mapray.animation.Time.fromNumber(this.total_time));
        }
    }
}
