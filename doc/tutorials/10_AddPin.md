<!---
title: "　10.1 ピンの表示"
date: 2019-12-02T18:35:00+09:00
draft: false
description: "ピンの表示"
keywords: ["チュートリアル", "皇居", "東京駅", "東京タワー", "ピン", "PinEntity"]
type: tutorials
menu: main
weight: 2101
--->

## ピンの表示

mapray.PinEntityを使ってピンを表示する方法を説明します。

### サンプルコード
mapray.PinEntityを使ってピンを表示する**AddPin.html**のサンプルコードです。
このサンプルコードでは、皇居と東京駅と東京タワーにピンを表示します。

<!--@ 1 -->
```HTML
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>AddPinSample</title>
        <script src="https://resource.mapray.com/mapray-js/v0.8.7/mapray.min.js"></script>
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

    // 球面座標系（経度、緯度、高度）で視点を設定。皇居と東京駅と東京タワーの中心点付近
    var home_pos = { longitude: 139.753175, latitude: 35.653943, height: 500 };

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
    var view_to_gocs = viewer.camera.view_to_gocs;
    mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

    // カメラのnear、farの設定
    viewer.camera.near = 30;
    viewer.camera.far = 500000;

    // ピンのエンティティを作成
    var pin_Entity = new mapray.PinEntity(viewer.scene);

    // 皇居の座標を設定
    var fast_Pin_Point = new mapray.GeoPoint(139.7528, 35.685175, 13);

    // ピンを追加
    pin_Entity.addPin(fast_Pin_Point, { size: 40, bg_color: [1, 0, 0] });

    // 東京駅の座標を設定
    var second_Pin_Point = new mapray.GeoPoint(139.767141, 35.681247, 3);

    // Makiアイコンピンを追加
    pin_Entity.addMakiIconPin("rail-15", second_Pin_Point, { size: 40, bg_color: [0, 1, 0] });

    // 東京タワーの座標を設定
    var third_Pin_Point = new mapray.GeoPoint(139.745440, 35.658594, 3);

    // テキストピンを追加
    pin_Entity.addTextPin("T", third_Pin_Point, { size: 40, bg_color: [0, 0, 1] });

    // エンティティをシーンに追加
    viewer.scene.addEntity(pin_Entity);
</script>
```

このサンプルコードの詳細を以下で解説します。

#### htmlの記述
1～25行目がでhtmlの定義です。ヘルプページ『**緯度経度によるカメラ位置の指定**』で示したhtmlファイルからタイトルのみを変更します。
詳細はヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

<!--@ 1 -->
```HTML
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>AddPinSample</title>
        <script src="https://resource.mapray.com/mapray-js/v0.8.7/mapray.min.js"></script>
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

<!--@ 28 -->
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

// 球面座標系（経度、緯度、高度）で視点を設定。皇居と東京駅と東京タワーの中心点付近
var home_pos = { longitude: 139.753175, latitude: 35.653943, height: 500 };

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
var view_to_gocs = viewer.camera.view_to_gocs;
mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

// カメラのnear、farの設定
viewer.camera.near = 30;
viewer.camera.far = 500000;
```

#### PinEntityの生成
ピンを表示するためには、ピンの情報を管理するクラス（PinEntity）が必要です。そのため、64行目でPinEntityのインスタンスを生成します。コンストラクタの引数には、作成したMapray.Viewerのシーン（Mapray.Viewer.scene）を指定します。

<!--@ 63 -->
```JavaScript
// ピンのエンティティを作成
var pin_Entity = new mapray.PinEntity(viewer.scene);
```

#### 表示ピンの生成
67～70行目で、標準のピンを生成します。67行目で皇居の経度・緯度・高度からGeoPointクラスを定義し、70行目のaddPin関数でピンを作成します。addPin関数には、ピンを表示する位置、生成オプションとしてピンの大きさと色を、それぞれ設定します。

<!--@ 66 -->
```JavaScript
// 皇居の座標を設定
var fast_Pin_Point = new mapray.GeoPoint(139.7528, 35.685175, 13);

// ピンを追加
pin_Entity.addPin(fast_Pin_Point, { size: 40, bg_color: [1, 0, 0] });
```

#### Makiアイコンピンの生成
73～76行目で、Makiアイコンのピンを生成します。73行目で東京駅の経度・緯度・高度からGeoPointクラスを定義し、76行目のaddMakiIconPin関数でピンを生成します。addMakiIconPin関数には、Makiアイコンの名称、ピンを表示する位置、生成オプションとしてピンの大きさと色を、それぞれ設定します。
Makiアイコンとは、[Makiアイコン](https://labs.mapbox.com/maki-icons/)に掲載されているアイコンを指します。各アイコンの名称を指定することで、自由にアイコンを使用することができます。

<!--@ 72 -->
```JavaScript
// 東京駅の座標を設定
var second_Pin_Point = new mapray.GeoPoint(139.767141, 35.681247, 3);

// Makiアイコンピンを追加
pin_Entity.addMakiIconPin("rail-15", second_Pin_Point, { size: 40, bg_color: [0, 1, 0] });
```

#### テキストピンの生成
79～82行目で、テキストのピンを生成します。79行目で東京タワーの経度・緯度・高度からGeoPointクラスを定義し、82行目のaddTextPin関数でピンを生成します。addTextPin関数には、表示する文字、ピンを表示する位置、生成オプションとしてピンの大きさと色を、それぞれ設定します。

<!--@ 78 -->
```JavaScript
// 東京タワーの座標を設定
var third_Pin_Point = new mapray.GeoPoint(139.745440, 35.658594, 3);

// テキストピンを追加
pin_Entity.addTextPin("T", third_Pin_Point, { size: 40, bg_color: [0, 0, 1] });
```

#### PinEntityの追加
85行目でPinEntityを作成したmapray.Viewerのシーンに追加します。mapray.Viewerのシーンに追加することでピンが表示されます。

<!--@ 84 -->
```JavaScript
// エンティティをシーンに追加
viewer.scene.addEntity(pin_Entity);
```

### 出力イメージ
このサンプルコードの出力イメージは下図のようになります。
![出力イメージ](image/SampleImageAddPin.png)
