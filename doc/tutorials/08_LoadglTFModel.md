## glTFモデルの表示（SceneLoaderを使った表示）

mapray.SceneLoaderを使ってglTFモデルを表示する方法を説明します。

### サンプルコード
mapray.SceneLoaderを使ってglTFモデルを表示する**LoadglTFModel.html**及び、**LoadglTFModel.js**のサンプルコードとシーンファイル（**glTFLoad.json**）です。
このサンプルコードでは、薬師寺の場所に3Dモデルを表示します。

#### LoadglTFModel.html
```HTML
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>LoadglTFModelSample</title>
        <script src="https://resource.mapray.com/mapray-js/v0.7.0/mapray.js"></script>
        <script src="LoadglTFModel.js"></script>
        <style>
            html, body {
                height: 100%;
                margin: 0;
            }

            div#mapray-container {
                display: flex;
                height: 94%;
            }

            div#mapInfo{
                display: flex;
                width: 50px;
                height: 25px;
                margin-left: auto;
                margin-right: 10px;
                align-items: center;
            }

            div#modelInfo{
                display: flex;
                width: 520px;
                height: 25px;
                margin-left: auto;
                margin-right: 10px;
                align-items: center;
            }
        </style>
    </head>

    <body onload="new LoadModel('mapray-container');">
        <div id="mapray-container"></div>
        <div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
        <div id="modelInfo"><a href="https://b2b.partcommunity.com/community/knowledge/ja/detail/435/Yakushi-ji" style="font-size: 9px">Yakushiji Temple by Daily CAD is licensed under: Creative Commons - Attribution-ShareAlike International</a></div>
    </body>
</html>
```

#### LoadglTFModel.js
```JavaScript
class LoadModel {
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

    // カメラ位置の設定
    SetCamera() {
        // 球面座標系（経度、緯度、高度）で視点を設定。モデルの座標を設定
        var home_pos = { longitude: 135.784682, latitude: 34.668107, height: 100.0 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

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
            // sceneのEntityを取得
            var entity = this.viewer.scene.getEntity(0);

            // モデルの回転
            entity.setOrientation(new mapray.Orientation(180, 0, 0));
        }
    }

}
```

#### シーンファイル（glTFLoad.json）
```json
{
  "model_register": { "model-0": { "link": "./Yakushiji_Temple/Yakushiji_Temple.gltf" } },
  "entity_list": [{
    "type": "model",
    "mode": "basic",
    "transform": { "position": [135.784682, 34.668107, 57.0] },
    "ref_model": "model-0",
    "altitude_mode": "absolute"
    }
  ]
}
```

### htmlのサンプルコードの詳細
htmlのサンプルコードの詳細を以下で解説します。

#### htmlの文字コード設定
4行目でhtmlの文字コードを設定します。このサンプルコードでは、utf-8を設定します。

```HTML
<meta charset="UTF-8">
```

#### タイトルの設定
5行目でタイトルを設定します。このサンプルコードでは、LoadglTFModelSampleを設定します。

```HTML
<title>LoadglTFModelSample</title>
```

#### JavaScriptファイルのパス設定
6～7行目で参照するJavaScriptのパスを設定します。このサンプルコードでは、maprayのJavaScriptファイルとモデルのシーンを読み込むJavaScriptファイル（**Load3DModel.js**）を設定します。

```HTML
<script src="https://resource.mapray.com/mapray-js/v0.7.0/mapray.js"></script>
<script src="LoadglTFModel.js"></script>
```

#### スタイルの設定
8～36行目で表示する要素のスタイルを設定します。このサンプルコードでは、下記のスタイルを設定します。
- html
- body
- div#mapray-container（地図表示部分）
- div#mapInfo（出典表示部分）
- div#modelInfo（モデル出典表示部分）

```HTML
<style>
    html, body {
        height: 100%;
        margin: 0;
    }

    div#mapray-container {
        display: flex;
        height: 94%;
    }

    div#mapInfo{
        display: flex;
        width: 50px;
        height: 25px;
        margin-left: auto;
        margin-right: 10px;
        align-items: center;
    }

    div#modelInfo{
        display: flex;
        width: 520px;
        height: 25px;
        margin-left: auto;
        margin-right: 10px;
        align-items: center;
    }
</style>
```

#### loadイベントの処理
画面を表示するときに、モデルシーン読み込みクラスを生成します。そのため、39行目でページの読み込み時に、地図表示部分のブロックのidからモデルシーン読み込みクラスのインスタンスを生成します。
モデルシーン読み込みクラスはJavaScriptのサンプルコードの詳細で説明します。

```HTML
<body onload="new LoadModel('mapray-container');">
```

#### 地図表示部分と出典表示部分の指定
40行目で地図表示部分になるブロックを記述し、41行目で出典を明記するためのブロックを記述します。
詳細はヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```HTML
<div id="mapray-container"></div>
<div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
```

#### glTFモデルの出典表示部分の設定
42行目で、glTFモデルの出典を明記するためのブロックを記述します。

```HTML
<div id="modelInfo"><a href="https://b2b.partcommunity.com/community/knowledge/ja/detail/435/Yakushi-ji" style="font-size: 9px">Yakushiji Temple by Daily CAD is licensed under: Creative Commons - Attribution-ShareAlike International</a></div>
```


### JavaScriptのサンプルコードの詳細
JavaScriptのサンプルコードの詳細を以下で解説します。

#### クラスの説明
2～84行目で、モデルシーンを読み込み、表示するクラスを定義します。クラス内の各メソッドの詳細は以降で解説します。

```JavaScript
class LoadModel {

  //中略

}
```

#### コンストラクタ
2～17行目がモデルシーンを読み込み、表示するクラスのコンストラクタです。引数として渡されるブロックのidに対して、mapray.Viewerを作成し、カメラの位置・向きの設定メソッドを呼び出します。その後、シーンのロードメソッドを呼び出します。viewerを作成する際の画像プロバイダは画像プロバイダの生成メソッドから取得します。
mapray.Viewerの作成の詳細は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```JavaScript
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
```

#### 画像プロバイダの生成
20～23行目が画像プロバイダの生成メソッドです。生成した画像プロバイダを返します。
画像プロバイダの生成の詳細は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```JavaScript
// 画像プロバイダを生成
createImageProvider() {
    // 国土地理院提供の汎用的な地図タイルを設定
    return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
}
```

#### カメラの位置・向きの設定
26～49行目がカメラの位置・向きの設定メソッドです。
カメラの位置・向きの設定は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```JavaScript
// カメラ位置の設定
SetCamera() {
    // 球面座標系（経度、緯度、高度）で視点を設定。モデルの座標を設定
    var home_pos = { longitude: 135.784682, latitude: 34.668107, height: 100.0 };

    // 球面座標から地心直交座標へ変換
    var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

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
```

#### シーンのロード
52～64行目がシーンのロードメソッドです。mapray.SceneLoaderでシーンを読み込みます。
SceneLoaderクラス生成時の引数には、シーンファイルのエンティティを追加するシーン、読み込むシーンファイルのURL、オプション集合の順に指定します。このサンプルコードでは、viewerクラスのシーン、54行目で設定したURL、リソース要求変換関数、シーンのロードが終了した時のコールバック関数の順に指定します。読み込むシーンのURLはhttpもしくはhttpsでアクセスできるURLを指定します。最後に、63行目のload関数を呼び出すことでシーンの読み込みができます。

```JavaScript
// シーンの読み込み
LoadScene() {
    var scene_File_URL = "./data/glTFLoad.json";

    // シーンを読み込む
    var loader = new mapray.SceneLoader(this.viewer.scene, scene_File_URL, {
        transform: (url, type) => this.onTransform(url, type),
        callback: (loader, isSuccess) => {
            this.onLoadScene(loader, isSuccess);
        }
    });

    loader.load();
}
```

#### リソース要求変換
66～72行目はリソース要求変換メソッドです。リソースのリクエスト時にURLなどを変換する内容を定義します。このサンプルコードでは、特に指定はしないので、リファレンスに沿った内容で定義します。

```JavaScript
onTransform(url, type) {
    return {
        url: url,
        credentials: mapray.CredentialMode.SAME_ORIGIN,
        headers: {}
    };
}
```

#### シーンのロード終了イベント
74～82行目がシーンのロード終了イベントメソッドです。引数のisSuccessには、読み込み結果が格納されており、trueの場合のみ読み込んだglTFモデルを表示します。
読み込んだモデルの向きを調整するため、80行目で、適切な向きをエンティティに反映させることで、地図上にglTFモデルを表示します。なお、読み込んだモデルは1つ目のエンティティとなるため、エンティティ取得時の引数には0を指定します。

```JavaScript
onLoadScene(loader, isSuccess) {
    if (isSuccess) {
        // sceneのEntityを取得
        var entity = this.viewer.scene.getEntity(0);

        // モデルの回転
        entity.setOrientation(new mapray.Orientation(180, 0, 0));
    }
}
```

### シーンファイルの詳細
シーンファイルの詳細を以下で解説します。なお、シーンファイルはJSON形式で記述します。

#### エンティティの設定
3行目でentity_listという名称でエンティティを定義し、その中にエンティティの詳細を定義します。4行目のtypeという名称は、エンティティの種類を表し、glTFモデルの場合はmodelを指定します。

```json
{

  中略

  "entity_list": [{
    "type": "model",

      中略

    }
  ]
}
```

#### glTFモデルのデータ
2行目でmodel_registerという名称でモデルデータを定義します。このシーンファイルでは、モデルデータのIDをmodel-0とし、モデルファイルをファイルから読み込むために、linkという名称にglTFファイルのURLを指定します。

```json
"model_register": { "model-0": { "link": "./Yakushiji_Temple/Yakushiji_Temple.gltf" } },
```

#### 汎用エンティティの設定
4～8行目で汎用エンティティの設定をします。汎用エンティティには以下の内容を定義します。
- モード（mode）　⇒　basic
- 初期姿勢（transform）　⇒　球面座標系（position）での初期位置
- モデルデータ（ref_model）　⇒　モデルデータのID（model-0）
- 高度モード（altitude_mode）　⇒　初期位置の高度を絶対値で指定（absolute）

```json
"type": "model",
"mode": "basic",
"transform": { "position": [135.784682, 34.668107, 57.0] },
"ref_model": "model-0",
"altitude_mode": "absolute"
```

### 出力イメージ
このサンプルコードの出力イメージは下図のようになります。
![出力イメージ](image/SampleImageLoadglTFModel.png)
