// JavaScript source code
class LoadLine {
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

        this.SetCamera();

        this.LoadScene();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標系（経度、緯度、高度）で視点を設定。座標は東京タワーとスカイツリーの中間付近
        var home_pos = { longitude: 139.783217, latitude: 35.685173, height: 50 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 16000]);
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
        this.viewer.camera.far = 500000;
    }

    LoadScene() {
        var scene_File_URL = "https://storage.googleapis.com/mapray-examples/line/line.json";
        //シーンを読み込む
        var loader = new mapray.SceneLoader(this.viewer.scene, scene_File_URL, {
            callback: (loader, isSuccess) => { this.onLoadScene(loader, isSuccess); }
        });
    }

    onLoadScene(loader, isSuccess) {
        //読み込みに成功
        if (isSuccess) {
            //追加するラインポイントの座標を求める。座標はスカイツリー
            var point = { longitude: 139.8107, latitude: 35.710063, height: 350 };

            var point_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(point, mapray.GeoMath.createMatrix());

            var points = [point_Gocs[12], point_Gocs[13], point_Gocs[14]];

            //sceneのラインEntityにポイントを追加する
            var lineEntity = this.viewer.scene.getEntity(0);
            lineEntity.addPoints(points);

            //ラインポイントの場所名表示
            this.SetLinePointStr();
        }
    }

    SetLinePointStr() {
        //文字のエンティティを作成
        var entity = new mapray.TextEntity(this.viewer.scene);
        //皇居より100mほど北の場所
        var fast_Font_Pos = { longitude: 139.7528, latitude: 35.685947, height: 350 }

        var fast_Font_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(fast_Font_Pos, mapray.GeoMath.createMatrix());

        entity.addText("The Imperial Palace",
                 [fast_Font_View_To_Gocs[12], fast_Font_View_To_Gocs[13], fast_Font_View_To_Gocs[14]],
                 { color: [1, 1, 0], font_size: 25 });
        //東京タワーより200mほど南の場所
        var second_Font_Pos = { longitude: 139.745433, latitude: 35.656687, height: 350 }

        var second_Font_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(second_Font_Pos, mapray.GeoMath.createMatrix());

        entity.addText("Tokyo Tower",
                 [second_Font_View_To_Gocs[12], second_Font_View_To_Gocs[13], second_Font_View_To_Gocs[14]],
                 { color: [1, 1, 0], font_size: 25 });

        //東京スカイツリーより100mほど北の場所
        var third_Font_Pos = { longitude: 139.8107, latitude: 35.710934, height: 350 }

        var third_Font_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(third_Font_Pos, mapray.GeoMath.createMatrix());

        entity.addText("TOKYO SKYTREE",
                 [third_Font_View_To_Gocs[12], third_Font_View_To_Gocs[13], third_Font_View_To_Gocs[14]],
                 { color: [1, 1, 0], font_size: 25 });

        //エンティティをシーンに追加
        this.viewer.scene.addEntity(entity);
    }
}
