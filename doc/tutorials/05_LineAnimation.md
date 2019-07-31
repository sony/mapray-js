## ラインのアニメーション
動的に線を追加し、表示するアニメーションを作成する方法を説明します。

### サンプルコード
動的に線を追加し、表示するアニメーションを作成する**LineAnimation.html**及び**LineAnimation.js**のサンプルコードです。
このサンプルコードでは、皇居、東京タワー、東京スカイツリー、東京ドーム、皇居の順に各地を通る曲線を作図します。皇居までたどりつけば、作図した線をすべて削除し、同じ経路の曲線の作図します。

#### LineAnimation.html

```HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>LineAnimationSample</title>
    <script src="https://api.mapray.com/mapray-js/v0.6.0/mapray.js"></script>
    <script src="LineAnimation.js"></script>
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
<body onload="new LineAnimation('mapray-container');">
    <div id="mapray-container"></div>
    <div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
</body>
</html>
```

#### LineAnimation.js

```JavaScript
var GeoMath = mapray.GeoMath;

class LineAnimation extends mapray.RenderCallback {

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

        this.SetCamera();

        this.line_Pos_Array = [{ longitude: 139.7528, latitude: 35.685175, height: 500.0 },     //仮想パスの終点(皇居)
                               { longitude: 139.745433, latitude: 35.658581, height: 500.0 },     //仮想パスの終点(東京タワー)
                               { longitude: 139.8107, latitude: 35.710063, height: 500.0 },     //仮想パスの終点(スカイツリー)
                               { longitude: 139.751891, latitude: 35.70564, height: 500.0 },     //仮想パスの終点(東京ドーム)
                               { longitude: 139.7528, latitude: 35.685175, height: 500.0 }]//仮想パスの始点(皇居)

        this.ratio_Increment = 0.15;    //毎フレームの線形補間割合増加分
        this.ratio = 0.0;            //線形補間の割合
        this.line_Pos_Index = 0;

        this.CreateMarkerLineEntityAndAddLineStartPoint();
    }

    // 画像プロバイダを生成
    createImageProvider() {
        // 国土地理院提供の汎用的な地図タイルを設定
        return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }

    SetCamera() {
        // カメラ位置の設定

        // 球面座標系（経度、緯度、高度）で視点を設定。座標は皇居
        var home_pos = { longitude: 139.7528, latitude: 35.685175, height: 20000 };

        // 球面座標から地心直交座標へ変換
        var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([0, 0, 7000]);
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
        this.viewer.camera.far = 1000000;
    }

    CreateMarkerLineEntityAndAddLineStartPoint() {
        //直線のエンティティを作成
        var entity = new mapray.MarkerLineEntity(this.viewer.scene);

        var line_Point_Gocs = this.createPointToGocsMatrix(this.line_Pos_Array[0]);

        var points = [line_Point_Gocs[12], line_Point_Gocs[13], line_Point_Gocs[14]];

        entity.addPoints(points);

        entity.setLineWidth(11)

        //エンティティをシーンに追加
        this.viewer.scene.addEntity(entity);
    }

    createPointToGocsMatrix(point) {
        var point_To_Gocs = GeoMath.createMatrix();
        GeoMath.iscs_to_gocs_matrix({
            longitude: point.longitude,
            latitude: point.latitude,
            height: point.height
        }, point_To_Gocs);
        return point_To_Gocs;
    }

    onStart()  // override
    {
        // 初期化（経過時間、ポイント経度、緯度）
        this.ratio = 0.0;
    }

    //フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time)  // override
    {
        // 次の線形補間の割合
        this.ratio += this.ratio_Increment * delta_time;

        if (this.ratio > 1.0) {
            this.ratio = 0.0;
            this.line_Pos_Index += 1
        }

        if (this.line_Pos_Index == this.line_Pos_Array.length - 1) {
            this.line_Pos_Index = 0

            this.viewer.scene.clearEntities();

            this.CreateMarkerLineEntityAndAddLineStartPoint();
        }

        //始点終点間の緯度経度高度のベクトル作成
        var vec = [this.line_Pos_Array[this.line_Pos_Index + 1].longitude - this.line_Pos_Array[this.line_Pos_Index].longitude,
                   this.line_Pos_Array[this.line_Pos_Index + 1].latitude - this.line_Pos_Array[this.line_Pos_Index].latitude,
                   this.line_Pos_Array[this.line_Pos_Index + 1].height - this.line_Pos_Array[this.line_Pos_Index].height];
        GeoMath.normalize3(vec, vec);
        //外積で補正方向算出
        var closs_Vec = GeoMath.cross3(vec, [0, 0, 1], GeoMath.createVector3());

        //次のラインの緯度経度高度を算出
        var line_Point = {longitude: (this.line_Pos_Array[this.line_Pos_Index].longitude * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].longitude * this.ratio) + (closs_Vec[0] * 0.02) * Math.sin(this.ratio * 180 * GeoMath.DEGREE),
                          latitude: (this.line_Pos_Array[this.line_Pos_Index].latitude * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].latitude * this.ratio) + (closs_Vec[1] * 0.02) * Math.sin(this.ratio * 180 * GeoMath.DEGREE),
                          height: this.line_Pos_Array[this.line_Pos_Index].height * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].height * this.ratio}

        //球面座標系から地心座標系に変換
        var line_Point_Gocs = this.createPointToGocsMatrix(line_Point);

        this.AddLinePoint([line_Point_Gocs[12], line_Point_Gocs[13], line_Point_Gocs[14]]);

    }

    AddLinePoint(point_xyz)
    {
        //ラインの点を追加する
        var line_Entity = this.viewer.scene.getEntity(0);
        line_Entity.addPoints(point_xyz);
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
5行目でタイトルを設定します。このサンプルコードでは、LineAnimationSampleを設定します。

```HTML
<title>LineAnimationSample</title>
```

#### JavaScriptファイルのパス設定
6、7行目で参照するJavaScriptのパスを設定します。このサンプルコードでは、maprayとラインのアニメーションを作成するJavaScriptファイル（**LineAnimation.js**）を設定します。

```HTML
<script src="https://api.mapray.com/mapray-js/v0.6.0/mapray.js"></script>
<script src="LineAnimation.js"></script>
```

#### スタイルの設定
8～28行目で表示する要素のスタイルを設定します。
スタイルの詳細は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

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
画面を表示するときに、ラインアニメーション作成クラスを生成します。そのため、30行目でページの読み込み時に、地図表示部分のブロックのidからラインアニメーション作成クラスのインスタンスを生成します。
ラインアニメーション作成クラスはJavaScriptのサンプルコードの詳細で説明します。

```HTML
<body onload="new LineAnimation('mapray-container');">
```

#### 地図表示部分と出典表示部分の指定
31行目で地図表示部分になるブロックを記述し、32行目で出典を明記するためのブロックを記述します。
詳細はヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```HTML
<div id="mapray-container"></div>
<div id="mapInfo"><a href="https://maps.gsi.go.jp/development/ichiran.html" style="font-size: 9px">国土地理院</a></div>
```

### JavaScriptのサンプルコードの詳細
JavaScriptのサンプルコードの詳細を以下で解説します。

#### クラスとグローバル変数の説明
3～144行目でラインのアニメーションを作成するクラスを定義します。アニメーションを表現するために、ラインアニメーション作成クラスは、mapray.RenderCallbackクラスを継承します。
また、1行目で数学関連の関数または定数を定義するユーティリティークラスのグローバル変数を定義します。

```JavaScript
var GeoMath = mapray.GeoMath;

class LineAnimation extends mapray.RenderCallback {

    //中略

}
```

#### コンストラクタ
5～31行目がラインのアニメーションを作成するクラスのコンストラクタです。引数として渡されるブロックのidに対して、mapray.Viewerを作成し、カメラの位置・向きの設定します。viewerを作成する際の画像プロバイダは画像プロバイダの生成メソッドから取得します。mapray.Viewerの作成の詳細は、ヘルプページ『**カメラのアニメーション**』を参照してください。
その後、アニメーションに必要な変数を定義します。線の通過点配列として、皇居、東京タワー、東京スカイツリー、東京ドームの緯度・経度・高度を、線形補間時の1秒当たりの増加割合として0.15を、線形補間時の現在の割合として0を、線形補間対象となる区間番号として0を、それぞれ設定します。最後に、線のエンティティを作成します。

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

    this.SetCamera();

    this.line_Pos_Array = [{ longitude: 139.7528, latitude: 35.685175, height: 500.0 },     //仮想パスの終点(皇居)
                           { longitude: 139.745433, latitude: 35.658581, height: 500.0 },     //仮想パスの終点(東京タワー)
                           { longitude: 139.8107, latitude: 35.710063, height: 500.0 },     //仮想パスの終点(スカイツリー)
                           { longitude: 139.751891, latitude: 35.70564, height: 500.0 },     //仮想パスの終点(東京ドーム)
                           { longitude: 139.7528, latitude: 35.685175, height: 500.0 }]//仮想パスの始点(皇居)

    this.ratio_Increment = 0.15;    //毎フレームの線形補間割合増加分
    this.ratio = 0.0;            //線形補間の割合
    this.line_Pos_Index = 0;

    this.CreateMarkerLineEntityAndAddLineStartPoint();
}
```

#### 画像プロバイダの生成
33～38行目が画像プロバイダの生成メソッドです。生成した画像プロバイダを返します。
画像プロバイダの生成の詳細は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```JavaScript
// 画像プロバイダを生成
createImageProvider() {
    // 国土地理院提供の汎用的な地図タイルを設定
    return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
}
```

#### カメラの位置・向きの設定
39～64行目がカメラの位置・向きの設定メソッドです。
カメラの位置・向きの設定は、ヘルプページ『**緯度経度によるカメラ位置の指定**』を参照してください。

```JavaScript
SetCamera() {
    // カメラ位置の設定

    // 球面座標系（経度、緯度、高度）で視点を設定。座標は皇居
    var home_pos = { longitude: 139.7528, latitude: 35.685175, height: 20000 };

    // 球面座標から地心直交座標へ変換
    var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix(home_pos, mapray.GeoMath.createMatrix());

    // 視線方向を定義
    var cam_pos = mapray.GeoMath.createVector3([0, 0, 7000]);
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
    this.viewer.camera.far = 1000000;
}
```

#### 線のエンティティ作成
66～80行目が線のエンティティ作成メソッドです。線のエンティティを作成し、皇居の地心直交座標を追加します。
線の頂点を設定する方法は、ヘルプページ『**線の表示（addPointsを使った表示）**』を参照してください。

```JavaScript
CreateMarkerLineEntityAndAddLineStartPoint() {
    //直線のエンティティを作成
    var entity = new mapray.MarkerLineEntity(this.viewer.scene);

    var line_Point_Gocs = this.createPointToGocsMatrix(this.line_Pos_Array[0]);

    var points = [line_Point_Gocs[12], line_Point_Gocs[13], line_Point_Gocs[14]];

    entity.addPoints(points);

    entity.setLineWidth(11)

    //エンティティをシーンに追加
    this.viewer.scene.addEntity(entity);
}
```

#### 球面座標系から地心直交座標系への変換
82～91行目が球面座標系から地心直交座標系への変換メソッドです。iscs_to_gocs_matrix関数で、引数の緯度・経度・高度を地心直交座標に変換して返します。

```JavaScript
createPointToGocsMatrix(point) {
    var point_To_Gocs = GeoMath.createMatrix();
    GeoMath.iscs_to_gocs_matrix({
        longitude: point.longitude,
        latitude: point.latitude,
        height: point.height
    }, point_To_Gocs);
    return point_To_Gocs;
}
```

#### レンダリングループの開始時のコールバックメソッド
92～96行目がレンダリングループの開始時のコールバックメソッドです。
レンダリングループの開始時のコールバックメソッドの詳細は、ヘルプページ『**パスに沿ったカメラアニメーション**』を参照してください。

```JavaScript
onStart()  // override
{
    // 初期化（経過時間、ポイント経度、緯度）
    this.ratio = 0.0;
}
```

#### フレームレンダリング前のコールバックメソッド（線エンティティの更新処理）
98～135行目がフレームレンダリング前のコールバックメソッドです。このサンプルコードでは、線のエンティティの更新処理を行います。
まず、引数の経過時間をもとに、線形補間時の現在の割合を計算します。その際、現在の割合が1より大きくなった場合は、線形補間対象となる区間番号を1つ増やし、現在の割合を0に設定します。また、全ての区間を補間し終えた場合は、clearEntities関数で線のエンティティを削除し、各メンバ変数及び線の表示状態を初期状態に戻します。また、線形補間の対象区間を曲線で表現するため、118～131行目で対象区間を球面座標系上のサインカーブで表現し、地心直交座標系に変換します。
そして、133行目で線の頂点追加メソッドに地心直交座標系の平行移動成分を指定し、曲線の構成点を追加します。
線の頂点追加メソッドは以下で説明します。

```JavaScript
//フレーム毎に呼ばれるメソッド
onUpdateFrame(delta_time)  // override
{
    // 次の線形補間の割合
    this.ratio += this.ratio_Increment * delta_time;

    if (this.ratio > 1.0) {
        this.ratio = 0.0;
        this.line_Pos_Index += 1
    }

    if (this.line_Pos_Index == this.line_Pos_Array.length - 1) {
        this.line_Pos_Index = 0

        this.viewer.scene.clearEntities();

        this.CreateMarkerLineEntityAndAddLineStartPoint();
    }

    //始点終点間の緯度経度高度のベクトル作成
    var vec = [this.line_Pos_Array[this.line_Pos_Index + 1].longitude - this.line_Pos_Array[this.line_Pos_Index].longitude,
               this.line_Pos_Array[this.line_Pos_Index + 1].latitude - this.line_Pos_Array[this.line_Pos_Index].latitude,
               this.line_Pos_Array[this.line_Pos_Index + 1].height - this.line_Pos_Array[this.line_Pos_Index].height];
    GeoMath.normalize3(vec, vec);
    //外積で補正方向算出
    var closs_Vec = GeoMath.cross3(vec, [0, 0, 1], GeoMath.createVector3());

    //次のラインの緯度経度高度を算出
    var line_Point = {longitude: (this.line_Pos_Array[this.line_Pos_Index].longitude * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].longitude * this.ratio) + (closs_Vec[0] * 0.02) * Math.sin(this.ratio * 180 * GeoMath.DEGREE),
                      latitude: (this.line_Pos_Array[this.line_Pos_Index].latitude * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].latitude * this.ratio) + (closs_Vec[1] * 0.02) * Math.sin(this.ratio * 180 * GeoMath.DEGREE),
                      height: this.line_Pos_Array[this.line_Pos_Index].height * (1 - this.ratio) + this.line_Pos_Array[this.line_Pos_Index + 1].height * this.ratio}

    //球面座標系から地心座標系に変換
    var line_Point_Gocs = this.createPointToGocsMatrix(line_Point);

    this.AddLinePoint([line_Point_Gocs[12], line_Point_Gocs[13], line_Point_Gocs[14]]);

}
```

#### 線の頂点追加
137～142行目が線の座標追加メソッドです。getEntity関数で取得した線のエンティティに引数の頂点を追加します。
線の頂点を設定する方法は、ヘルプページ『**線の表示（addPointsを使った表示）**』を参照してください。

```JavaScript
AddLinePoint(point_xyz)
{
    //ラインの点を追加する
    var line_Entity = this.viewer.scene.getEntity(0);
    line_Entity.addPoints(point_xyz);
}
```

### 出力イメージ
このサンプルコードの出力イメージは下図のようになります。
下図は、皇居から東京タワーまでの区間を補間している時のイメージです。
![出力イメージ](image/SampleImageLineAnimation_1.png)

また、東京ドームから皇居までの区間を補間している時の出力イメージは下図のようになります。
![出力イメージ](image/SampleImageLineAnimation.png)
