## パスに沿ったカメラアニメーション
仮想的なパスに沿ってカメラをアニメーションさせる方法を説明します。

### サンプルコード
仮想的なパスに沿ってカメラをアニメーションさせる**VirtualPathCameraAnimation.html**及び**VirtualPathCameraAnimation.js**のサンプルコードです。
このサンプルコードでは、皇居、東京タワー、東京スカイツリー、東京ドーム、皇居の順に各地を結ぶ仮想パスに沿ってカメラが移動します。

#### VirtualPathCameraAnimation.html

```HTML
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>VirtualPathCameraAnimationSample</title>
        <script src="https://resource.mapray.com/mapray-js/v0.7.0/mapray.js"></script>
        <script src="VirtualPathCameraAnimation.js"></script>
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

    <body onload="new VirtualPathCameraAnimation('mapray-container');">
        <div id="mapray-container"></div>
        <div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
    </body>
</html>
```

#### VirtualPathCameraAnimation.js

```JavaScript
var GeoMath = mapray.GeoMath;

class VirtualPathCameraAnimation extends mapray.RenderCallback {

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

        this.path_Pos_Array = [{ longitude: 139.7528, latitude: 35.685175, height: 50.0 },      // 仮想パスの終点(皇居)
                               { longitude: 139.745433, latitude: 35.658581, height: 50.0 },    // 仮想パスの終点(東京タワー)
                               { longitude: 139.8107, latitude: 35.710063, height: 50.0 },      // 仮想パスの終点(スカイツリー)
                               { longitude: 139.751891, latitude: 35.70564, height: 50.0 },     // 仮想パスの終点(東京ドーム)
                               { longitude: 139.7528, latitude: 35.685175, height: 50.0 }]      // 仮想パスの始点(皇居)
        this.distance = 3000.0;         // 基準点からの距離
        this.pitch_angle = -30.0;       // 仰俯角
        this.ratio_Increment = 0.15;    // 毎フレームの線形補間割合増加分
        this.ratio = 0.0;               // 線形補間の割合
        this.path_Pos_Index = 0;
    }

    onStart()  // override
    {
        // 初期の線形補間の割合を設定
        this.ratio = 0.0;
    }

    // フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time)  // override
    {
        var camera = this.viewer.camera;

        // カメラに変換行列を設定
        GeoMath.mul_AA(this.createInterpolationBaseToGocsMatrix(), this.createViewToBaseMatrix(), camera.view_to_gocs);

        // カメラに近接遠方平面を設定
        camera.near = this.distance / 2;
        camera.far = camera.near * 1000;

        // 次の線形補間の割合
        this.ratio += this.ratio_Increment * delta_time;

        if (this.ratio > 1.0) {
            this.ratio = 0.0;
            this.path_Pos_Index += 1;
        }

        if (this.path_Pos_Index == this.path_Pos_Array.length - 1) {
            this.path_Pos_Index = 0;
        }
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    // 2点の間を線形保管し、基準座標系から GOCS への変換行列を生成
    createInterpolationBaseToGocsMatrix() {
        var interpolation_Pos = {
            longitude: this.path_Pos_Array[this.path_Pos_Index].longitude * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].longitude * this.ratio,
            latitude: this.path_Pos_Array[this.path_Pos_Index].latitude * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].latitude * this.ratio,
            height: this.path_Pos_Array[this.path_Pos_Index].height * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].height * this.ratio
        };

        var base_to_gocs = GeoMath.createMatrix();
        GeoMath.iscs_to_gocs_matrix({
            longitude: interpolation_Pos.longitude,
            latitude: interpolation_Pos.latitude,
            height: interpolation_Pos.height
        }, base_to_gocs);

        return base_to_gocs;
    }

    // カメラの相対位置を計算し、姿勢を決める
    createViewToBaseMatrix() {
        var d = this.distance;

        var mat = GeoMath.createMatrix();

        var camera_pos_mat = GeoMath.createMatrix();
        GeoMath.setIdentity(camera_pos_mat);

        // カメラの位置をY軸方向に距離分移動させる
        camera_pos_mat[13] = -d;

        // x軸でpitch_angle分回転させる回転行列を求める
        var pitch_Mat = GeoMath.rotation_matrix([1, 0, 0], this.pitch_angle, GeoMath.createMatrix());

        // カメラの位置にX軸の回転行列をかける
        GeoMath.mul_AA(pitch_Mat, camera_pos_mat, camera_pos_mat);

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([camera_pos_mat[12], camera_pos_mat[13], camera_pos_mat[14]]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

        // ビュー変換行列を作成
        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, mat);

        return mat;
    }

}
```

### htmlのサンプルコードの詳細
htmlのサンプルコードの詳細を以下で解説します。

#### htmlの文字コード設定
4行目でhtmlの文字コードを設定します。このサンプルコードでは、utf-8を設定します。

```HTML
<meta charset="utf-8">
```

#### タイトルの設定
5行目でタイトルを設定します。このサンプルコードでは、VirtualPathCameraAnimationSampleを設定します。

```HTML
<title>VirtualPathCameraAnimationSample</title>
```

#### JavaScriptファイルのパス設定
6～7行目で参照するJavaScripのパスを設定します。このサンプルコードでは、maprayとパスに沿ってカメラアニメーションするJavaScriptファイル（**VirtualPathCameraAnimation.js**）を設定します。

```HTML
<script src="https://resource.mapray.com/mapray-js/v0.7.0/mapray.js"></script>
<script src="VirtualPathCameraAnimation.js"></script>
```

#### スタイルの設定
8～27行目で表示する要素のスタイルを設定します。スタイルの詳細は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```HTML
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
```

#### loadイベントの処理
画面を表示するときに、パスに沿ったカメラアニメーションクラスを生成します。そのため、30行目でページの読み込み時に、地図表示部分のブロックのidからパスに沿ったカメラアニメーションクラスのインスタンスを生成します。
パスに沿ったカメラアニメーションクラスはJavaScriptのサンプルコードの詳細で説明します。

```HTML
<body onload="new VirtualPathCameraAnimation('mapray-container');">
```

#### 地図表示部分と出典表示部分の指定
31、32行目で表示する要素を記述します。
要素の詳細は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```HTML
<div id="mapray-container"></div>
<div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
```

### JavaScriptのサンプルコードの詳細
JavaScriptのサンプルコードの詳細を以下で解説します。

#### クラスとグローバル変数の説明
3～114行目でパスに沿ったカメラアニメーションクラスを定義します。アニメーションを表現するために、パスに沿ったカメラアニメーションクラスは、mapray.RenderCallbackクラスを継承します。
また、1行目で数学関連の関数または定数を定義するユーティリティークラスのグローバル変数を定義します。

```JavaScript
var GeoMath = mapray.GeoMath;

class VirtualPathCameraAnimation extends mapray.RenderCallback {

    //中略

}
```

#### コンストラクタ
5～28行目がパスに沿ったカメラアニメーションクラスのコンストラクタです。引数として渡されるブロックのidに対して、mapray.Viewerを作成します。Mapray.Viewerのベース地図の画像プロバイダは、画像プロバイダの生成メソッドで取得した画像プロバイダを設定します。mapray.Viewerの生成処理の詳細は、ヘルプページ『**カメラのアニメーション**』を参照してください。
最後に、パスアニメーションに関する初期値を下記のように設定します。
- パスの経由点の緯度・経度・高度　⇒　皇居、東京タワー、東京スカイツリー、東京ドーム
- パスの経由点からカメラまでの距離　⇒　3,000m
- カメラの仰俯角　⇒　-30度
- カメラ位置の線形補間時の1秒当たりの増加割合　⇒ 0.15
- カメラ位置の線形補間時の現在の割合 ⇒ 0
- カメラ位置の線形補間対象となる区間番号　⇒　0

```JavaScript
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

    this.path_Pos_Array = [{ longitude: 139.7528, latitude: 35.685175, height: 50.0 },      // 仮想パスの終点(皇居)
                           { longitude: 139.745433, latitude: 35.658581, height: 50.0 },    // 仮想パスの終点(東京タワー)
                           { longitude: 139.8107, latitude: 35.710063, height: 50.0 },      // 仮想パスの終点(スカイツリー)
                           { longitude: 139.751891, latitude: 35.70564, height: 50.0 },     // 仮想パスの終点(東京ドーム)
                           { longitude: 139.7528, latitude: 35.685175, height: 50.0 }]      // 仮想パスの始点(皇居)
    this.distance = 3000.0;         // 基準点からの距離
    this.pitch_angle = -30.0;       // 仰俯角
    this.ratio_Increment = 0.15;    // 毎フレームの線形補間割合増加分
    this.ratio = 0.0;               // 線形補間の割合
    this.path_Pos_Index = 0;
}
```

#### レンダリングループの開始時のコールバックメソッド
30～34行目がレンダリングループの開始時のコールバックメソッドです。RenderCallbackクラスのonStartメソッドをオーバーライドしたメソッドで、レンダリングが始まる前に呼ばれます。
このサンプルコードでは、線形補間の割合に0を設定します。

```JavaScript
onStart()  // override
{
    // 初期の線形補間の割合を設定
    this.ratio = 0.0;
}
```

#### フレームレンダリング前のコールバックメソッド（カメラ位置の更新処理）
37～59行目がフレームレンダリング前のコールバックメソッドです。このサンプルコードでは、カメラ位置の更新処理を行います。
まず、現在の線形補間状態からカメラ位置を表す変換行列を求めるメソッド、カメラの視線方向を表すビュー変換行列を求めるメソッドを用いて、現時点のカメラ姿勢を反映します。そして、カメラの設定範囲（近接遠方平面）を設定し、現在の線形補間の割合および線形補間の対象区間を更新します。
カメラ位置を表す変換行列を求めるメソッド、カメラの視線方向を表すビュー変換行列を求めるメソッドの詳細については後述します。

```JavaScript
// フレーム毎に呼ばれるメソッド
onUpdateFrame(delta_time)  // override
{
    var camera = this.viewer.camera;

    // カメラに変換行列を設定
    GeoMath.mul_AA(this.createInterpolationBaseToGocsMatrix(), this.createViewToBaseMatrix(), camera.view_to_gocs);

    // カメラに近接遠方平面を設定
    camera.near = this.distance / 2;
    camera.far = camera.near * 1000;

    // 次の線形補間の割合
    this.ratio += this.ratio_Increment * delta_time;

    if (this.ratio > 1.0) {
        this.ratio = 0.0;
        this.path_Pos_Index += 1;
    }

    if (this.path_Pos_Index == this.path_Pos_Array.length - 1) {
        this.path_Pos_Index = 0;
    }
}
```

#### 画像プロバイダの生成
62～64行目が画像プロバイダの生成メソッドです。生成した画像プロバイダを返します。
画像プロバイダの生成の詳細は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```JavaScript
// 画像プロバイダを生成
createImageProvider() {
    return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
}
```

#### カメラ位置を表す変換行列の取得
67～82行目がカメラ位置を表す変換行列の取得メソッドです。まず、68～72行目で、線形補間対象となる区間番号に対応する経由点間に対して、現在の線形補間の割合で線形補間し、カメラの緯度・経度・高度を求めます。そして、74～79行目で、その緯度・経度・高度の座標を地心直交座標系に変換することで、カメラ位置を表す変換行列を求めます。

```JavaScript
// 2点の間を線形保管し、基準座標系から GOCS への変換行列を生成
createInterpolationBaseToGocsMatrix() {
    var interpolation_Pos = {
        longitude: this.path_Pos_Array[this.path_Pos_Index].longitude * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].longitude * this.ratio,
        latitude: this.path_Pos_Array[this.path_Pos_Index].latitude * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].latitude * this.ratio,
        height: this.path_Pos_Array[this.path_Pos_Index].height * (1 - this.ratio) + this.path_Pos_Array[this.path_Pos_Index + 1].height * this.ratio
    };

    var base_to_gocs = GeoMath.createMatrix();
    GeoMath.iscs_to_gocs_matrix({
        longitude: interpolation_Pos.longitude,
        latitude: interpolation_Pos.latitude,
        height: interpolation_Pos.height
    }, base_to_gocs);

    return base_to_gocs;
}
```

#### カメラの視線方向を表すビュー変換行列の取得
85～111行目がカメラの視線方向を表すビュー変換行列の取得メソッドです。まず、90～94行目で、相対視点位置を表す変換行列を単位行列に初期化し、注視点からの距離を設定した値になるように、相対視点位置をY軸方向に移動します。その後、97行目でカメラの仰俯角に対応する回転行列（X軸回りの回転行列）を生成し、100行目で相対視点位置を表す変換行列に回転行列を掛け合わせることで、相対視点位置を表す変換行列を作成します。最後に、103～108行目で、求めた相対視点位置、注視点、カメラの上方向ベクトルを利用して、最終的なビュー変換行列を求めます。

```JavaScript
// カメラの相対位置を計算し、姿勢を決める
createViewToBaseMatrix() {
    var d = this.distance;

    var mat = GeoMath.createMatrix();

    var camera_pos_mat = GeoMath.createMatrix();
    GeoMath.setIdentity(camera_pos_mat);

    // カメラの位置をY軸方向に距離分移動させる
    camera_pos_mat[13] = -d;

    // x軸でpitch_angle分回転させる回転行列を求める
    var pitch_Mat = GeoMath.rotation_matrix([1, 0, 0], this.pitch_angle, GeoMath.createMatrix());

    // カメラの位置にX軸の回転行列をかける
    GeoMath.mul_AA(pitch_Mat, camera_pos_mat, camera_pos_mat);

    // 視線方向を定義
    var cam_pos = mapray.GeoMath.createVector3([camera_pos_mat[12], camera_pos_mat[13], camera_pos_mat[14]]);
    var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
    var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

    // ビュー変換行列を作成
    mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, mat);

    return mat;
}
```

### 出力イメージ
このサンプルコードの初期状態の出力イメージは下図のようになります。
![出力イメージ](image/SampleImagePathCameraAnimation.png)

その後、カメラが東京ドームまで移動した時の出力イメージは下図のようになります。
![出力イメージ](image/SampleImagePathCameraAnimation_1.png)
