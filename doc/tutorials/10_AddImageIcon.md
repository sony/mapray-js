## イメージアイコンの表示（addImageIconを使った表示）

mapray.ImageIconEntityのaddImageIconを使ってイメージアイコンを表示する方法を説明します。

### サンプルコード
mapray.ImageIconEntityのaddImageIconを使ってイメージアイコンを表示する**AddImageIcon.html**のサンプルコードです。
このサンプルコードでは、東京タワーにイメージアイコンを表示します。

```HTML
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>AddImageIconSample</title>
        <script src="https://resource.mapray.com/mapray-js/v0.8.0/mapray.min.js"></script>
        <link rel="stylesheet" href="https://resource.mapray.com/styles/v1/mapray.css">
        <style>
            html, body {
                height: 100%;
                margin: 0;
            }

            div#mapray-container {
                display: flex;
                position: relative;
                height: 100%;
            }
        </style>
    </head>

    <body>
        <div id="mapray-container"></div>
    </body>
</html>

<script>
    // Access Tokenを設定
    var accessToken = "<your access token here>";

    // Viewerを作成する
    viewer = new mapray.Viewer(
        "mapray-container", {
            image_provider: new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18),
            dem_provider: new mapray.CloudDemProvider(accessToken)
        }
    );

    // 球面座標系（経度、緯度、高度）で視点を設定。東京タワー付近35.657281, 139.745265
    var home_pos = { longitude: 139.745265, latitude: 35.657281, height: 50 };

    // 球面座標から地心直交座標へ変換
    var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
    var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

    // 視線方向を定義
    var cam_pos = mapray.GeoMath.createVector3([0, -1000, 300]);
    var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
    var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

    // ビュー変換行列を作成
    var view_to_home = mapray.GeoMath.createMatrix();
    mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

    // カメラの位置と視線方向からカメラの姿勢を変更
    var view_to_gocs = viewer.camera.view_to_gocs;
    mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

    // カメラのnear  farの設定
    viewer.camera.near = 30;
    viewer.camera.far = 500000;

    // イメージアイコンのエンティティを作成
    var imag_icon_entity = new mapray.ImageIconEntity(viewer.scene);

    // 東京タワーの座標を求める
    var image_icon_Point = new mapray.GeoPoint(139.745340, 35.658694, 100);

    // イメージアイコンを追加
    imag_icon_entity.addImageIcon("./image/TokyoTower.jpg", image_icon_Point, { size: [300, 200] });

    // エンティティをシーンに追加
    viewer.scene.addEntity(imag_icon_entity);
</script>
```

このサンプルコードの詳細を以下で解説します。

#### htmlの記述
1～25行目がでhtmlの定義です。ヘルプページ『**緯度経度によるカメラ位置の指定**』で示したhtmlファイルからタイトルのみを変更します。
詳細はヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```HTML
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>AddImageIconSample</title>
        <script src="https://resource.mapray.com/mapray-js/v0.8.0/mapray.min.js"></script>
        <link rel="stylesheet" href="https://resource.mapray.com/styles/v1/mapray.css">
        <style>
            html, body {
                height: 100%;
                margin: 0;
            }

            div#mapray-container {
                display: flex;
                position: relative;
                height: 100%;
            }
        </style>
    </head>

    <body>
        <div id="mapray-container"></div>
    </body>
</html>
```

#### カメラ位置・向きの設定
29～61行目でMapray.Viewerクラスを作成し、カメラ位置・向きを設定します。
詳細はヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```JavaScript
// Access Tokenを設定
var accessToken = "<your access token here>";

// Viewerを作成する
viewer = new mapray.Viewer(
    "mapray-container", {
        image_provider: new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18),
        dem_provider: new mapray.CloudDemProvider(accessToken)
    }
);

// 球面座標系（経度、緯度、高度）で視点を設定。東京タワー付近35.657281, 139.745265
var home_pos = { longitude: 139.745265, latitude: 35.657281, height: 50 };

// 球面座標から地心直交座標へ変換
var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

// 視線方向を定義
var cam_pos = mapray.GeoMath.createVector3([0, -1000, 300]);
var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

// ビュー変換行列を作成
var view_to_home = mapray.GeoMath.createMatrix();
mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

// カメラの位置と視線方向からカメラの姿勢を変更
var view_to_gocs = viewer.camera.view_to_gocs;
mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

// カメラのnear、farの設定
viewer.camera.near = 30;
viewer.camera.far = 500000;
```

#### ImageIconEntityの生成
イメージアイコンを表示するためには、イメージアイコンの情報を管理するクラス（ImageIconEntity）が必要です。そのため、64行目でImageIconEntityのインスタンスを生成します。コンストラクタの引数には、作成したMapray.Viewerのシーン（Mapray.Viewer.scene）を指定します。

```JavaScript
// イメージアイコンのエンティティを作成
var imag_icon_entity = new mapray.ImageIconEntity(viewer.scene);
```

#### イメージアイコンの生成
67～70行目で、イメージアイコンを生成します。67行目で東京タワーの経度・緯度・高度からGeoPointクラスを定義し、70行目のaddImageIcon関数でピンを作成します。addImageIcon関数には、表示する画像のURL、ピンを表示する位置、生成オプションとしてアイコンの大きさ（縦、横）を、それぞれ設定します。

```JavaScript
// 東京タワーの座標を求める
var image_icon_Point = new mapray.GeoPoint(139.745340, 35.658694, 100);

// イメージアイコンを追加
imag_icon_entity.addImageIcon("./image/TokyoTower.jpg", image_icon_Point, { size: [300, 200] });
```

#### ImageIconEntityの追加
73行目でImageIconEntityを作成したmapray.Viewerのシーンに追加します。mapray.Viewerのシーンに追加することでイメージアイコンが表示されます。

```JavaScript
// エンティティをシーンに追加
viewer.scene.addEntity(imag_icon_entity);
```

### 出力イメージ
このサンプルコードの出力イメージは下図のようになります。
![出力イメージ](image/SampleImageAddImageIcon.png)
