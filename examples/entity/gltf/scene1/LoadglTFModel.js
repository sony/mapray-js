// JavaScript source code
class LoadModel {
    constructor(container) {
        // Access Tokenを設定
        var accessToken = "<your access token here>";

        // Viewerを作成する
        this.viewer = new mapray.Viewer(
            container, {
                image_provider: this.createImageProvider(),
                dem_provider: new mapray.CloudDemProvider(accessToken),
            }
        );

        // glTFモデルのライセンス表示
        this.viewer.attribution_controller.addAttribution( {
            display: "Yakushiji Temple by Daily CAD is licensed under: Creative Commons - Attribution - ShareAlike International",
            link: "https://b2b.partcommunity.com/community/knowledge/ja/detail/435/Yakushi-ji"
        } );

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
        // 球面座標系（経度、緯度、高度）で視点を設定。モデルの座標を設定
        var home_pos = { longitude: 135.784682, latitude: 34.668107, height: 100.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
        var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([100, -300, 100]);
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
        var scene_File_URL = "./data/glTFLoad.json";

        /* glTFLoad.json links glTF file "./Yakushiji_Temple/Yakushiji_Temple.gltf".
        You need to get this glTF file from the web. The following is how to download it.

        - Access [PARTcommunity] (https://b2b.partcommunity.com/community/knowledge/ja/detail/435/Yakushi-ji) and download the data in glTF file format
        - Click [Download link] (https://resource.mapray.com/assets/www/download/Yakushiji_Temple.zip) to download it

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
            //sceneのEntityを取得
            var entity = this.viewer.scene.getEntity(0);

            //モデルの回転
            entity.setOrientation(new mapray.Orientation(180, 0, 0));
        }
    }

}
