## 線の表示（addPointsを使った表示）

mapray.MarkerLineEntityのaddPointsを使って線を表示する方法を説明します。

### サンプルコード
mapray.MarkerLineEntityのaddPointsを使って線を表示する**AddLine.html**のサンプルコードです。
このサンプルコードでは、皇居と東京タワーを結ぶ直線を表示します。

```HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AddLineSample</title>
    <script src="https://api.mapray.com/mapray-js/v0.5.1/mapray.js"></script>
    <style>
        html, body {
            height: 100%;
            margin: 0;
        }

        div#mapray-container {
            display: flex;
            height: 97%;
        }

         div#mapInfo{
            display: flex;
            width: 50px;
            height: 25px;
            margin-left: auto;
            margin-right: 10px;
            align-items: center;
        }
    </style>
</head>

<body>
    <div id="mapray-container"></div>
    <div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
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

    // カメラ位置の設定

    // 球面座標系（経度、緯度、高度）で視点を設定。皇居と東京タワーの中間点付近
    var home_pos = { longitude: 139.749486, latitude: 35.671190, height: 50 };

    // 球面座標から地心直交座標へ変換
    var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

    // 視線方向を定義
    var cam_pos = mapray.GeoMath.createVector3([0, 0, 7500]);
    var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
    var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

    //ビュー変換行列を作成
    var view_to_home = mapray.GeoMath.createMatrix();
    mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

    // カメラの位置と視線方向からカメラの姿勢を変更
    var view_to_gocs = viewer.camera.view_to_gocs;
    mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

    // カメラのnear  farの設定
    viewer.camera.near = 30;
    viewer.camera.far = 500000;

    //直線のエンティティを作成
    var line_Entity = new mapray.MarkerLineEntity(viewer.scene);

    //皇居の座標を求める
    var line_Fast_Pos = { longitude: 139.7528, latitude: 35.685175, height: 350 }
    var line_Fast_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(line_Fast_Pos, mapray.GeoMath.createMatrix());

    //東京タワーの座標を求める
    var line_Second_Pos = { longitude: 139.745433, latitude: 35.658581, height: 350 }
    var line_Second_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(line_Second_Pos, mapray.GeoMath.createMatrix());

    var points = [line_Fast_View_To_Gocs[12], line_Fast_View_To_Gocs[13], line_Fast_View_To_Gocs[14],
                  line_Second_View_To_Gocs[12], line_Second_View_To_Gocs[13], line_Second_View_To_Gocs[14]]

    line_Entity.addPoints(points)

    //エンティティをシーンに追加
    viewer.scene.addEntity(line_Entity);

    //文字のエンティティを作成
    var font_Entity = new mapray.TextEntity(viewer.scene);
    //皇居より400mほど東の場所
    var fast_Font_Pos = { longitude: 139.758503, latitude: 35.685030, height: 350 }

    var fast_Font_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(fast_Font_Pos, mapray.GeoMath.createMatrix());

    font_Entity.addText("The Imperial Palace",
             [fast_Font_View_To_Gocs[12], fast_Font_View_To_Gocs[13], fast_Font_View_To_Gocs[14]],
             { color: [1, 1, 0], font_size: 25 });
    //東京タワーより300mほど東の場所
    var second_Font_Pos = { longitude: 139.749069, latitude: 35.658182, height: 350 }

    var second_Font_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(second_Font_Pos, mapray.GeoMath.createMatrix());

    font_Entity.addText("Tokyo Tower",
             [second_Font_View_To_Gocs[12], second_Font_View_To_Gocs[13], second_Font_View_To_Gocs[14]],
             { color: [1, 1, 0], font_size: 25 });

    //エンティティをシーンに追加
    viewer.scene.addEntity(font_Entity);

</script>
```

このサンプルコードの詳細を以下で解説します。

#### htmlの記述
1～33行目がでhtmlの定義です。ヘルプページ『**緯度経度によるカメラ位置の指定**』で示したhtmlファイルからタイトルのみを変更します。
詳細はヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AddLineSample</title>
    <script src="https://api.mapray.com/mapray-js/v0.5.1/mapray.js"></script>
    <style>
        html, body {
            height: 100%;
            margin: 0;
        }

        div#mapray-container {
            display: flex;
            height: 97%;
        }

         div#mapInfo{
            display: flex;
            width: 50px;
            height: 25px;
            margin-left: auto;
            margin-right: 10px;
            align-items: center;
        }
    </style>
</head>

<body>
    <div id="mapray-container"></div>
    <div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
</body>
</html>
```

#### カメラ位置・向きの設定
36～70行目でMapray.Viewerクラスを作成し、カメラ位置・向きを設定します。
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

// カメラ位置の設定

// 球面座標系（経度、緯度、高度）で視点を設定。皇居と東京タワーの中間点付近
var home_pos = { longitude: 139.749486, latitude: 35.671190, height: 50 };

// 球面座標から地心直交座標へ変換
var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

// 視線方向を定義
var cam_pos = mapray.GeoMath.createVector3([0, 0, 7500]);
var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
var cam_up = mapray.GeoMath.createVector3([0, 1, 0]);

//ビュー変換行列を作成
var view_to_home = mapray.GeoMath.createMatrix();
mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

// カメラの位置と視線方向からカメラの姿勢を変更
var view_to_gocs = viewer.camera.view_to_gocs;
mapray.GeoMath.mul_AA(home_view_to_gocs, view_to_home, view_to_gocs);

// カメラのnear  farの設定
viewer.camera.near = 30;
viewer.camera.far = 500000;
```

#### MarkerLineEntityの生成
線を表示するためには、線の情報を管理するクラス（MarkerLineEntity）が必要です。そのため、72、73行目でMarkerLineEntityのインスタンスを生成します。コンストラクタの引数には、作成したMapray.Viewerのシーン（Mapray.Viewer.scene）を指定します。

```JavaScript
//直線のエンティティを作成
var line_Entity = new mapray.MarkerLineEntity(viewer.scene);
```

#### 線の表示座標の生成
75～81行目でiscs_to_gocs_matrix関数を使用して、皇居と東京タワーの経度・緯度・高度を球面座標系から地心直交座標へ変換します。

```JavaScript
//皇居の座標を求める
var line_Fast_Pos = { longitude: 139.7528, latitude: 35.685175, height: 350 }
var line_Fast_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(line_Fast_Pos, mapray.GeoMath.createMatrix());

//東京タワーの座標を求める
var line_Second_Pos = { longitude: 139.745433, latitude: 35.658581, height: 350 }
var line_Second_View_To_Gocs = mapray.GeoMath.iscs_to_gocs_matrix(line_Second_Pos, mapray.GeoMath.createMatrix());
```

#### 線の座標の設定
線の座標を設定するaddPoints関数は、線の座標の配列を引数で指定します。そのため、83、84行目で先ほど求めた皇居と東京タワーの座標を配列に格納します。ただし、線の座標の配列は、対象の座標をX、Y、Z座標の順で格納することとします。その配列を86行目のaddPoints関数に渡すことで、線の座標を設定します。

```JavaScript
var points = [line_Fast_View_To_Gocs[12], line_Fast_View_To_Gocs[13], line_Fast_View_To_Gocs[14],
              line_Second_View_To_Gocs[12], line_Second_View_To_Gocs[13], line_Second_View_To_Gocs[14]]

line_Entity.addPoints(points)
```

#### MarkerLineEntityの追加
88、89行目でMarkerLineEntityを作成したmapray.Viewerのシーンに追加します。mapray.Viewerのシーンに追加することで線が表示されます。

```JavaScript
//エンティティをシーンに追加
viewer.scene.addEntity(line_Entity);
```

### 出力イメージ
このサンプルコードの出力イメージは下図のようになります。
![出力イメージ](image/SampleImageAddLine.png)
