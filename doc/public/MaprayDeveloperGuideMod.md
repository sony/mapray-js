# mapray JS の概要

この章では、mapray JS とはどのようなものか、どのような環境で動作するのか、mapray JS を使うためにはどのような知識が必要かなどを説明します。

## mapray JS とは

mapray JS は Web ブラウザに 3 次元地図をリアルタイムに表示するための JavaScript ライブラリです。

このライブラリを使うと HTML 文書の特定の要素内に、任意の視点からの 3D 地図をレンダリングすることができます。

次の図は Web ブラウザ上で mapray JS が 3D 地図をレンダリングしている様子を示しています。ここでは
HTML 文書の特定の `<div>` 要素（赤枠で囲っている部分）を指定し、その上に mapray JS がレンダリングしています。

![mapray JS による 3D 地図のレンダリング](images/inou-rendering.png)

コンテンツ開発者は mapray JS のカメラの位置や角度をフレームごとに変更することによって、リアルタイムにカメラが移動・回転しているように見せることができます。

mapray JS は現在のカメラの視点に合わせて、速度低下やメモリー消費を抑えながら、起伏や地図をなるべく高い解像度で表示しようとします。

コンテンツ開発者は、このような mapray JS 内部の複雑な処理をほとんど意識することなく、mapray JS を利用することができます。

## 動作環境

現在、mapray JS の動作が確認されている Web ブラウザは以下の通りです。

* Google Chrome (Windows, macOS版)
* Mozilla Firefox (Windows, macOS版)
* Safari (macOS版)
* Microsoft Edge (Windows版)

その他の環境での動作はまだ確認されていませんが、次の要件で動作するように実装されています。

### 動作要件

JavaScript で以下のインタフェースが利用できること。

* [ECMAScript 5.1](https://www.ecma-international.org/ecma-262/5.1/)
* [TypedArray](https://www.ecma-international.org/ecma-262/6.0/#sec-typedarray-objects) (ECMA)
* [Document](https://dom.spec.whatwg.org/#interface-document) (WHATWG)
* [Window](https://html.spec.whatwg.org/multipage/window-object.html#the-window-object) (WHATWG)
* [XMLHttpRequest](https://xhr.spec.whatwg.org/) (WHATWG)
* [WebGL 1.0](https://www.khronos.org/registry/webgl/specs/latest/1.0/)

上記の Document オブジェクトは `document` 変数、Window オブジェクトは `window` 変数でアクセスできること。

また、[`document.createElement`](https://dom.spec.whatwg.org/#dom-document-createelement) メソッドにより次の
HTML 要素インタフェースを持ったオブジェクトを生成できること。

* [img 要素](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element) (WHATWG)
* [canvas 要素](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element) (WHATWG)

## 必要な知識

mapray JS API を利用するコンテンツ開発者は、次の技術を理解している必要があります。

* HTML5 と JavaScript による Web アプリケーションの開発
* ベクトルと行列の計算

mapray エンジンの内部では 3 次元の位置や方向を 4 次元ベクトル (同次座標) で表し、その座標変換を $4 \times 4$ 行列で行います。
そのため一部の API にはベクトルや行列を扱うものが存在し、変換行列を計算するための知識がコンテンツ開発者にも必要になります。


# 基本概念

## mapray JS ライブラリ

### インポート方法

mapray JS ライブラリは `mapray.js` ファイルをインポートすることによってプログラムから利用することができます。

インポート方法は次の 3 種類の中から選択できます。(より正確には [UMD](https://github.com/umdjs/umd) に対応したインポートが可能なライブラリです。)

1. HTML に `<script>` タグを記述
2. CommonJS Modules の `require()` 関数
3. ECMAScript 2015 (ES6) の `import` 構文

---

例えば1の方法を使うとき、まず HTML ファイルの `<script>` タグで次のように記述したとします。

~~~html
<html>
  <head>
    <meta charset="utf-8">
    <script src="mapray.js"></script>
    <script src="myapp.js"></script>
~~~

このとき `myapp.js` 内のコードでは、次のようにインポートを明示せずに直接 mapray JS API が使えるようになります。

~~~javascript
var viewer = new mapray.Viewer(...);
~~~

---

これに対し2の方法は、mapray JS API を利用する各々の JavaScript ファイルで `require()` 関数を呼び出します。
例えば次のような使い方になります。

~~~javascript
var mapray = require( 'mapray' );
var viewer = new mapray.Viewer(...);
~~~

---

次に3の方法は、mapray JS API を利用する各々の JavaScript ファイルで `import` 構文を使います。例えば次のような使い方になります。

~~~javascript
import mapray from 'mapray';
var viewer = new mapray.Viewer(...);
~~~

なお、2と3の方法はブラウザが対応していない場合も多く、直接利用できないかもしれません。
しかし [webpack](https://webpack.js.org/) を利用すると、これらのインポート機能を使ったソースコードを
ブラウザで動作するソースコードに変換することができます。


### 名前空間とクラス

JavaScript は言語機能として名前空間やクラス（ECMAScript 2015 (ES6) から [class 構文](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Classes) が追加されましたが、これは従来から使われてきたプロトタイプベース継承の糖衣構文です。） をサポートしていませんが、mapray JS API はこれらの概念で設計され、
このドキュメントやリファレンスマニュアルでも、名前空間とクラスの概念を使って説明します。 

mapray JS API はすべて `mapray` 名前空間に含まれています。例えば `mapray` 名前空間に含まれる `Viewer` クラスは、`mapray.Viewer` のようにな記述で説明します。

前節の方法でライブラリをインポートした場合、次のような JavaScript での記述で `mapray.Viewer` クラスのインスタンスを生成することができます。

~~~javascript
var viewer = new mapray.Viewer(...);
~~~

このとき `viewer` 変数に代入されたオブジェクトは、概念上 `mapray.Viewer` クラスのインスタンスなので、`mapray.Viewer`
クラスのインスタンスメソッド `mapray.Viewer#getElevation()` を次のように呼び出すことができます。

~~~javascript
viewer.getElevation(...);
~~~

クラスはインスタンスメソッド以外にクラスメソッドを持つこともあります。例えば `mapray.GeoMath` クラスにはクラスメソッド
`mapray.GeoMath.createMatrix()` があり、JavaScript 上でもこれと同じ記法で呼び出すことができます。

~~~javascript
mapray.GeoMath.createMatrix();
~~~

本ドキュメントではインスタンスのメンバー (インスタンスメソッドまたはインスタンスプロパティ) とクラスのメンバー
(クラスメソッドまたはクラスプロパティ) は次のような記述で区別します。

| 記法           | 意味                                           |
|----------------|------------------------------------------------|
| `Class#member` | クラス `Class` のインスタンスメンバー `member` |
| `Class.member` | クラス `Class` のクラスメンバー `member`       |


JavaScript 上での名前空間はオブジェクトとそのプロパティにより実現しています。

最上位の名前空間である `mapray` を表現するオブジェクトは、ライブラリのインポート時に `mapray` 変数に代入されます。
そのオブジェクトには `mapray` 名前空間のメンバーと同名のプロパティを持ち、そのメンバーを表現するオブジェクトにアクセスできます。

例えばライブラリインポート後に JavaScript で `mapray.GeoMath` 式を評価すると、結果は `mapray` 名前空間のメンバーである
`GeoMath` クラスを表現するオブジェクトになります。

そのため次のように、`mapray.GeoMath` 式の評価結果を `GeoMath` 変数に代入すると、ソースコード上は `GeoMath` だけで `mapray.GeoMath`
クラスを使うことができます。

~~~javascript
var GeoMath = mapray.GeoMath;

GeoMath.createMatrix();
GeoMath.createVector3();
~~~

mapray JS API では最上位の名前空間がすべて `mapray` なので、以降本ドキュメントでは `mapray.Viewer` を `Viewer` のように省略して記述します。
実際のソースコード上では省略することができません。


#### サブクラスの定義 {#class-define}

mapray JS API の既存のクラスを利用する場合は、特にクラスを定義する方法を知る必要はありません。
しかし `RenderCallback` のような抽象クラスやインタフェースにより動作をカスタマイズするとき、コンテンツ開発者はサブクラスを定義する必要があります。

ECMAScript 2015 (ES6) の場合、`class` 構文が用意されているので、それを利用すると簡単にサブクラスを定義することができます。
以下は基底クラス `Animal` のサブクラス `Cat` を ES6 形式で定義する例です。

~~~javascript
// ECMAScript 2015 (ES6) 以降の形式
class Cat extends Animal {
    constructor( name )
    {
        super( name );
        // インスタンス初期化
        ...
    }
    myMethod()
    {
        // メソッド処理
        ...
    }
}
~~~

これに対し ECMAScript 5 (ES5) では、`this` やコンストラクタの `prototype` プロパティを明示的に操作する必要があります。
以下は基底クラス `Animal` のサブクラス `Cat` を ES5 形式で定義する例です。

~~~javascript
// ECMAScript 5 (ES5) までの形式
function Cat( name )
{
    Animal.call( this, name );
    // インスタンス初期化
    ...
}

Cat.prototype = Object.create( Animal.prototype );

Cat.prototype.myMethod = function() {
   // メソッド処理
   ...
};
~~~

本ドキュメントでは簡潔に表すため ECMAScript 2015 (ES6) 形式のクラス定義で説明します。


## プログラミングモデル

最初にコンテンツ開発者は、mapray エンジンが `canvas` 要素を配置するための親要素 (`div` 要素など) を HTML 文書上に準備する必要があります。
mapray エンジンは常にその親要素全体に`canvas` 要素を広げて表示します。

次に、その親要素に対して 1 つの `Viewer` インスタンスを生成します。
ここで `container` 引数には親要素を示す [Element](https://developer.mozilla.org/ja/docs/Web/API/Element)
インスタンスまたは ID 文字列を指定します。

~~~javascript
var viewer = new mapray.Viewer( container );
~~~

そして `Viewer` インスタンスの `camera` プロパティから `Camera` インスタンスを取得し、それにカメラの位置や方向などを設定します。

例えば次のコード断片は、緯度 0 度、経度 0 度、高度 20000 キロメートルの位置から地球の中心方向を見るためのカメラ設定です。

~~~javascript
var GeoMath = mapray.GeoMath;
var camera = viewer.camera;
camera.view_to_gocs = GeoMath.createMatrix( [0, 1, 0, 0,
                                             0, 0, 1, 0,
                                             1, 0, 0, 0,
                                             GeoMath.EARTH_RADIUS + 20000000, 0, 0, 1] );
camera.near = 300000;
camera.far  = 30000000;
~~~

`Camera` インスタンスの `view_to_gocs` プロパティでカメラの位置と方向を設定します。この値はカメラの視点座標系から地心座標系へ
座標変換するための変換行列です。座標系に関しては「[単位と座標系](#単位と座標系)」を参照してください。

`Camera` インスタンスの `near` プロパティと `far` プロパティは、カメラに表示する奥行きの範囲 (近接平面距離と遠方平面距離)
をメートルで指定します。これらの値に関しては「[近接平面と遠方平面](#近接平面と遠方平面)」を参照してください。


### レンダリングコールバック

一般的なコンテンツではマウス操作などにより、カメラの視点は時間の経過とともに変化します。

`Camera` インスタンスのプロパティを連続的に設定することにより、このようなアニメーションは可能ですが、レンダリングコールバックを
使うとこれを適切な頻度とタイミングで行うことができます。

例えば次のように `RenderCallback` のサブクラスを定義し、フレーム毎に呼び出される `RenderCallback#onUpdateFrame()`
メソッドをオーバライドします。

~~~javascript
class MyRenderCallback extends mapray.RenderCallback {
    constructor()
    {
        super();
        // 初期化コード
        ...
    }

    onUpdateFrame( delta_time )  // override
    {
        // this.viewer.camera のプロパティを更新
        ...
    }
}
~~~

そして `Viewer` のコンストラクタを呼び出すときに、オプションに `MyRenderCallback` のインスタンスを与えます。

~~~javascript
new mapray.Viewer( container, { render_callback: new MyRenderCallback() } );
~~~

`Viewer` インスタンスが生成された後、定期的に `MyRenderCallback#onUpdateFrame()` メソッドが呼び出されます。


### データプロバイダ

mapray エンジンはレンダリング時に地表の形状や地図画像のデータを、インターネットなど外部から取得します。

デフォルトの地表の形状 (DEM データ) はコンテンツのサーバーからの相対パス `/dem/` から取得します。
この場合はコンテンツ提供者は `/dem/` に DEM データを配置する必要があります。

デフォルトの地図画像のデータは、国土地理院の [標準地図](https://maps.gsi.go.jp/development/ichiran.html#std)
から取得します。

これらのデータは `Viewer` コンストラクタにデータプロバイダを指定することによって変更することができます。

DEM データを指定するときは `dem_provider` オプションに `DemProvider` の実装クラスのインスタンスを指定します。

mapray JS ライブラリは `DemProvider` の実装クラスとして `StandardDemProvider` を用意しています。
たとえば `http://server/dem/` から DEM データを取得したいときは、`Viewer` コンストラクタのオプションを次のように指定します。

~~~javascript
var provider = new mapray.StandardDemProvider( "http://server/dem/", ".bin" );
new mapray.Viewer( container, { dem_provider: provider } );
~~~

地図画像データを指定するときは `Viewer` コンストラクタの `image_provider` オプションに `ImageProvider`
の実装クラスのインスタンスを指定します。

mapray JS ライブラリでは `ImageProvider` の実装クラスとして `StandardImageProvider` を用意しています。
たとえば `http://server/map/` から地図画像データ (拡張子が `.png`、サイズが 256×256、レベルが 0 から 10)
を取得したいときは、`Viewer` コンストラクタのオプションを次のように指定します。

~~~javascript
var provider = new mapray.StandardImageProvider( "http://server/map/", ".png", 256, 0, 10 );
new mapray.Viewer( container, { image_provider: provider } );
~~~

mapray JS ライブラリが用意している `StandardDemProvider` や `StandardImageProvider` はサイト認証などの機能がないので、
これらだけでは不十分なことがあります。その場合、`DemProvider` や `ImageProvider` のサブクラスをコンテンツ開発者が
実装する必要があります。詳細は[「データプロバイダの作成」](#データプロバイダの作成)を参照してください。


### 近接平面と遠方平面

`Camera` インスタンスの `near` プロパティ (近接平面距離) と `far` プロパティ (遠方平面距離) に設定する値には注意が必要です。

これらの値は mapray エンジンが内部で使用している WebGL で必要になるパラメータです。

これらの値をコンテンツ開発者が指定しなければならない理由は、そのコンテンツにとって適切な値を mapray エンジンが決定することが困難だからです。

一般的には次のことが言えますが、これらは互いに相反します。

* mapray エンジンにとって far/near の値が小さいほどよい
* コンテンツ開発者にとって `near` を極限まで小さく `far` を極限まで大きくしたい

様々な環境で高い品質のレンダリングをするためには far/near が 10000 以下になることをおすすめします。

簡単な指針としては `near` は手前のものが隠れない程度に大きくします。そして `far` は `near` の 10000 倍程度にします。
ただしもっと遠くを見る必要がある場合は、品質が落ちる可能性がありますが `far` を大きくなるように調整します。


## 単位と座標系

mapray JS API では、原則的に距離の単位がメートル、角度の単位が度 (arc degree) になります。

mapray JS に関連する主な座標系には次の 3 種類があります。

* 地心座標系 (GOCS)
* 球面座標系
* 視点座標系

次節以降でこれらの座標系の詳細を説明します。


### 地心座標系 (GOCS)

地心座標系は、地球の中心に原点を置き、X 軸をグリニッジ子午線と赤道との交点方向に、Y 軸を東経 90 度の方向に、
Z 軸を北極の方向にとって、空間上の位置を *<x, y, z>* の数値の組で表現する 3 次元直交座標系です。


### 球面座標系

球面座標系は、地球を近似した半径 *R = 6378137* の球体を考え(半径 *R* は地球楕円体モデル GRS80 の長半径と同じ値に設定しました。GRS80 は楕円体ですが、この座標系は真球を想定しています。)、空間上の点を緯度 *φ* 経度 *λ*,
高さ *h* の数値の組で表現します。

大まかな意味としては、*φ* は赤道からの北方向を正とする角度、*λ* はグリニッジ子午線からの東方向を正とする角度、
*h* は球体面からの空方向を正とする距離を表します。

より正確な定義として、地心直交座標系における点の座標を *<x, y, z>* としたとき、以下の関係式が成り立ちます。

![式1](images/chishin.png)


地心座標系 *<x, y, z>* から球面座標系 *<λ, φ, h>* への変換は次のようになります。
ただし*pow(x, x) + pow(y, y) > 0*という条件で、*c_1*, *c_2* は任意の整数になります。
(以下、pow(a, b)はaのb乗を表します)

![式2](images/chishin_2_kyuumen.png)


なお、半径 *R**は mapray JS API で `GeoMath.EARTH_RADIUS` として定義されています。


### 視点座標系

視点座標系は、カメラの位置 (投影中心) を原点とし、X 軸をカメラの右方向、Y 軸をカメラの上方向、Z 軸をカメラの後ろ方向とする
3 次元直交座標系です。

カメラの位置と方向は、(地心座標系での) 視点座標系の原点位置と XYZ 軸の方向により決まります。
それは `Camera` インスタンスの `view_to_gocs` プロパティに (視点座標系から地心座標系へ位置座標を変換するための)
変換行列を設定することによって決まります。


### 変換行列について

mapray JS API が想定する *4x4* 変換行列 *M* は、3 次元位置 *< p_x, p_y, p_z >* を次の式で変換します。

![式3](images/mul.png)


このとき、変換後の 3 次元座標は *< q_x/q_w, q_y/q_w, q_z/q_w >* とします。

`Camera` インスタンスの `view_to_gocs` プロパティに設定する変換行列 *A* は、次のように第 4 行が *(0, 0, 0, 1)* でなければなりません。

![式4](images/matrix.png)



# 簡単なサンプルプログラム

mapray JS ライブラリを使ったコンテンツの簡単なサンプルとして、富士山の周りを回転しながら富士山を見るプログラム `turning.js` を示します。

## HTML ファイル

このコンテンツの HTML ファイル `turning.html` は次のようになります。

~~~html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="mapray.js"></script>
    <script src="turning.js"></script>
    <style>
      html, body {
        height: 100%;
        margin: 0;
      }
      div#mapray-container {
        display: flex;
        height: 100%;
      }
    </style>
  </head>
  <body onload="new Turning('mapray-container');">
    <div id="mapray-container"></div>
  </body>
</html>
~~~

`<script>` タグにより mapray JS ライブラリ `mapray.js` とコンテンツの JavaScript ファイル `turning.js` を指定しています。

このコンテンツでは `<div id="mapray-container">` の要素を mapray JS API に指定して、そこにシーンをレンダリングします。

`turning.js` では `Turning` クラスを定義しています。
この HTML では `<body>` 要素を読み込み終わったときに `Turning` インスタンスを生成してレンダリングを開始します。


## JavaScript ファイル

次のソースコードは JavaScript ファイル `turning.js` の内容です。

~~~javascript
var GeoMath = mapray.GeoMath;

class Turning extends mapray.RenderCallback {

    constructor( container )
    {
        super();
        new mapray.Viewer( container, { render_callback: this,
                                      image_provider: this.createImageProvider() } );

        this.longitude = 138.730647;
        this.latitude  = 35.362773;
        this.height    = 3776.24;
        this.distance  = 10000.0;
        this.pitch_angle = -30.0;
        this.angular_velocity = 5.0;
        this.turn_angle = 0;
    }

    onStart()  // override
    {
        // 初期のターン角度
        this.turn_angle = 0;
    }

    onUpdateFrame( delta_time )  // override
    {
        var camera = this.viewer.camera;

        // カメラに変換行列を設定
        GeoMath.mul_AA( this.createBaseToGocsMatrix(), this.createViewToBaseMatrix(),
                        camera.view_to_gocs );

        // カメラに近接遠方平面を設定
        camera.near = this.distance / 2;
        camera.far  = camera.near * 1000;

        // 次のターン角度
        this.turn_angle += this.angular_velocity * delta_time;
    }

    // 画像プロバイダを生成
    createImageProvider()
    {
        return new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18 );
    }

    // 基準座標系から GOCS への変換行列を生成
    createBaseToGocsMatrix()
    {
        var base_to_gocs = GeoMath.createMatrix();
        GeoMath.iscs_to_gocs_matrix( { longitude: this.longitude,
                                       latitude: this.latitude,
                                       height: this.height }, base_to_gocs );
        return base_to_gocs;
    }

    // 視点座標系から基準座標系への変換行列を生成
    createViewToBaseMatrix()
    {
        var t = this.turn_angle  * GeoMath.DEGREE;  // ターン角 (ラジアン)
        var p = this.pitch_angle * GeoMath.DEGREE;  // 仰俯角 (ラジアン)
        var d = this.distance;

        var sinT = Math.sin( t );
        var cosT = Math.cos( t );
        var sinP = Math.sin( p );
        var cosP = Math.cos( p );

        var mat = GeoMath.createMatrix();
        mat[ 0] = cosT;
        mat[ 1] = sinT;
        mat[ 2] = 0;
        mat[ 3] = 0;
        mat[ 4] = sinP * sinT;
        mat[ 5] = -sinP * cosT;
        mat[ 6] = cosP;
        mat[ 7] = 0;
        mat[ 8] = sinT * cosP;
        mat[ 9] = -cosT * cosP;
        mat[10] = -sinP;
        mat[11] = 0;
        mat[12] = d * sinT * cosP;
        mat[13] = -d * cosT * cosP;
        mat[14] = -d * sinP;
        mat[15] = 1;

        return mat;
    }

}
~~~

`Turning` クラスは、アプリケーション全体を管理する役割と同時に、`RenderCallback` の実装も兼ねています。

そのため `Turning` のコンストラクタでは、`Viewer` インスタンスの生成時に `render_callback` オプションに `this` を与えています。

コンストラクタの残りの部分では、富士山の頂上付近を 10 Km 離れた場所から 30 度見下ろし、富士山の周りを秒速 5 度で
回転するようにパラメータを設定しています。

`Turning` クラスでは、`RenderCallback` のインスタンスメソッド `onStart()` と `onUpdateFrame()` をオーバライドしています。
`onStart()` でターン角度を初期化し、`onUpdateFrame()` でカメラの設定とターン角度の更新を行っています。

カメラの位置と角度は `Camera` インスタンスのプロパティ `view_to_gocs` を設定することによって変更します。
このプロパティには視点座標系から地心座標系 (GOCS) への変換行列を設定します。

サンプルでは考えやすいように富士山の頂上付近に仮想の基準座標系を置き、その中でカメラが移動回転するように行列を計算しています。

視点座標系から基準座標系への変換行列を `createViewToBaseMatrix()` で求め、基準座標系から地心座標系への変換行列を
`createBaseToGocsMatrix()` で求め、それらの変換を行列の乗算により合成して `view_to_gocs` プロパティに設定しています。

座標系と変換行列の詳細は「[単位と座標系](#単位と座標系)」を参考にしてください。

カメラの近接平面 (`Camera#near`) と遠方平面 (`Camera#far`) は、被写体までの距離が十分大きく、カメラから被写体の間にほとんど
オブジェクトがないことを前提に、被写体までの距離 (`this.distance`) をベースに計算しています。

どのような場合でもこの計算方法が適切とは限りません。詳細は「[近接平面と遠方平面](#近接平面と遠方平面)」を参考にしてください。

なお、サンプルでは mapray エンジンが地形データを取得するための DEM データプロバイダを指定していません。この場合は HTML ファイルを配置した
サーバーからの相対 URL `/dem/` から DEM データを得るため、事前にその場所に DEM データを配置する必要があります。
データプロバイダに関しては「[データプロバイダ](#データプロバイダ)」を参照してください。

サンプルプログラムの `Turning` クラスは ECMAScript 2015 (ES6) の `class` 構文で定義していますが、これが動作しないブラウザもあるかもしれません。
旧来の ECMAScript 5 (ES5) によるクラス定義の方法は「[サブクラスの定義](#サブクラスの定義)」を参考にしてください。


# 高度なトピック


## データプロバイダの作成
mapray エンジンはレンダリング時に [データプロバイダ](#データプロバイダ) から地表の形状 (DEM) や地図画像データを取得します。

ライブラリでは `StandardDemProvider` と `StandardImageProvider` を用意していますが、これらのクラスの機能だけでは対応できないとき、
コンテンツ開発者が独自のデータプロバイダを実装することができます。

1 つのデータプロバイダは固定サイズのタイルを単位にデータを提供します。例えば典型的な地図画像プロバイダは 256×256 サイズの画像タイルを提供します。

提供される個々のタイルは *Z/X/Y* 座標で区別されます。mapray エンジンはデータプロバイダにタイルを要求するときに *Z/X/Y* 座標を指定します。


### タイルの座標

*Z/X/Y* 座標の $Z$ はズームレベルを表し、*Z > 0* となる整数です。*X* はそのズームレベル上のタイルの水平方向の位置、
*Y* は垂直方向の位置を表し、*0 <= X, Y <= pow(2,Z) - 1* となる整数です。

北緯及び南緯約 85.0511 度以上を除外した、正方形のメルカトル世界地図上に *Z/X/Y* 座標が定義されます。

*Z* 座標が *z* のタイルは、この正方形地図を縦横均等に *pow(2,z)* 分割された領域に対応します。

*X* 座標は一番左側のタイルが *0* で、一番右側のタイルが *pow(2,z) - 1* になり、
*Y* 座標は一番上側のタイルの *0* で、一番下側のタイルが *pow(2,z) - 1* になります。

数式で表すと、経度 *λ*, 緯度 *φ* と *Z/X/Y* 座標の関係は次のようになります。ここで *gd* はグーデルマン関数を、
*c_1, c_2* は任意の整数を表します。

![式5](images/tile.png)


### DEM データプロバイダの実装

独自の DEM データプロバイダを定義するためには `DemProvider` のサブクラスを実装します。

このときサブクラスでは次のメソッドをオーバライドします。

* `requestTile(z, x, y, callback)`
* `cancelRequest(id)`
* `getResolutionPower()`


`requestTile()` は mapray エンジンがタイルをリクエストするときに呼び出すメソッドです。
このメソッドの `z`, `x`, `y` パラメータはタイルの座標です。`callback` パラメータは、データを取得したとき、
データの取得に失敗したときに、プロバイダが呼び出す必要がある関数です。
`callback` は即時に呼び出さずに非同期に呼び出さなければなりません。

`cancelRequest()` は mapray エンジンがタイルのリクエストを取り消すときに呼び出します。
このメソッドの `id` パラメータは `requestTile()` が返したオブジェクトで、プロバイダはそれに対応する
リクエストを取り消す必要があります。ただし取り消す手段がない場合は、何もする必要はありません。

`getResolutionPower()` が返す整数を *ρ* とすると、DEM データの解像度が *pow(2, ρ)* であることを示します。
デフォルトの実装では 8 を返すので、DEM データの解像度が 256 のときはこのメソッドをオーバライドする必要は
ありません。

以下は単純な DEM データプロバイダ `MyDemProvider` の実装例です。

~~~javascript
class MyDemProvider extends mapray.DemProvider {
    constructor()
    {
        super();
        // 初期化
        ...
    }

    requestTile( z, x, y, callback )  // override
    {
        var req = new XMLHttpRequest();
        req.open( 'GET', this._makeURL( z, x, y ), true );
        req.responseType = 'arraybuffer';
        req.onloadend = function ( event ) {
            var status = req.status;
            if ( req.response && (status >= 200 && status < 300 || status == 304) ) {
                callback( req.response );  // データ取得に成功 (ArrayBuffer インスタンスを返す)
            }
            else {
                callback( null );  // データ取得に失敗、または取り消し
            }
        };
        req.send();
        return req;  // 要求 ID
    }

    cancelRequest( id )  // override
    {
        id.abort();  // XMLHttpRequest#abort() でリクエスト取り消し
    }

    _makeURL( z, x, y )  // タイル z/x/y の DEM データの URL を返す
    {
        return 'http://localhost/dem/' + z + '/' + x + '/' + y + '.bin';
    }
}
~~~


### 地図画像プロバイダの実装

独自の地図画像プロバイダを定義するためには `ImageProvider` のサブクラスを実装します。

このときサブクラスでは次のメソッドをオーバライドします。

* `requestTile(z, x, y, callback)`
* `cancelRequest(id)`
* `getImageSize()`
* `getZoomLevelRange()`

`requestTile()` と `cancelRequest()` は `DemProvider` の同名メソッドと同じ働きをします。
ただし `callback` パラメータの関数に与える引数は [ArrayBuffer](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)
インスタンスではなく [Image](https://developer.mozilla.org/docs/Web/API/HTMLImageElement) インスタンスになります。

`getImageSize()` はプロバイダが提供する地図タイル画像の水平方向または垂直方向の画素数を返します。地図タイル画像は正方形でなければなりません。

`getZoomLevelRange()` はプロバイダが提供する地図タイル画像のズームレベルの範囲を返します。

以下は単純な地図画像プロバイダ `MyImageProvider` の実装例です。

~~~javascript
class MyImageProvider extends mapray.ImageProvider {
    constructor()
    {
        super();
        // 初期化
        ...
    }

    requestTile( z, x, y, callback )  // override
    {
        var image = new Image();
        image.onload  = function() { callback( image ); };
        image.onerror = function() { callback( null ); };
        image.src = this._makeURL( z, x, y );
        return image;  // 要求 ID
    }

    cancelRequest( id )  // override
    {
        // 取り消し方法はないので何もしない
    }

    getImageSize()  // override
    {
        return 256;  // 画像サイズは 256×256
    }

    getZoomLevelRange()  // override
    {
        return new mapray.ImageProvider.Range( 0, 10 );  // ズームレベルは 0 から 10
    }

    _makeURL( z, x, y )  // タイル z/x/y の地図画像データの URL を返す
    {
        return 'http://localhost/map/' + z + '/' + x + '/' + y + '.png';
    }
}
~~~


## 地形の問い合わせ

コンテンツでマウスなどのインタラクティブ操作を実現する場合、地形に合わせてカメラを動かしたいことがあります。

例えばカメラが地表の下に移動しないようにするため、カメラ真下の地表の標高を知ることにより、その場所よりも高い場所
にカメラ位置を調整することができます。

また、マウスのドラッグにより地表を掴んで動かすイメージの操作を実現するとき、ドラッグ開始時のマウスカーソル位置に
表示されている地表の位置を知ると、それによりカメラの位置を計算することができます。

mapray JS API では、DEM データから地形の情報を得るメソッドとして次のメソッドを用意しています。

* `Viewer#getElevation(lat, lon)`
* `Viewer#getRayIntersection(ray)`

`Viewer#getElevation()` は引数に緯度と経度を与えてその場所の標高を得ます。
`Viewer#getRayIntersection()` は引数にレイ (始点と方向) を与えて、そのレイと地表が交差する最も近い点の座標
(GOCS) を得ます。

mapray のシーンが表示されているキャンバス上のある点に対応するレイを次のメッソドにより取得することができます。

* `Camera#getCanvasRay(cpos, oray)`


### 精度に関する注意点

`Viewer#getElevation()` と `Viewer#getRayIntersection()` により得られる値は、その時の状況により精度が変化します。
これは現在メモリ内に存在する最も精度が高い DEM データを使い、即時に値を計算しているからです。

`Viewer#getElevation()` は、さらに詳細な DEM データが `DemProvider` により取得することができれば、そのデータをリクエストします。
そのため、時間を置いてこのメソッドを呼び出すと、さらに正確な値を取得できることがあります。

これに対し `Viewer#getRayIntersection()` は新たに DEM データをリクエストしません。
このメソッドは基本的に現在画面に表示されてる場所が対象になり、一般的に、近くに表示されている部分は精度が高く、
遠くに表示されている部分は精度が低くなります。


## エンティティの表示

mapray エンジンは地表と同時にポリゴンモデルや文字などのオブジェクトも表示することができます。

![mapray エンティティによる文字の表示](images/fuji-motosuko.png)


mapray JS API ではこのオブジェクトのことをエンティティと呼び、`Scene` インスタンスに `Entity` インスタンスを追加
することによってエンティティを表示することができます。
`Scene` インスタンスは `Viewer#scene` プロパティによりアクセスすることができます。

mapray JS ライブラリは現在、以下に示す `Entity` のサブクラスを用意しています。

|     クラス         |   表示内容      |
|--------------------|-----------------|
| `GenericEntity`    | ポリゴンモデル  |
| `TextEntity`       | 複数のテキスト  |
| `MarkerLineEntity` | 連続ライン      |


次のコードは `TextEntity` を使い、シーンに 2 つのテキストを表示する例です。

~~~javascript
var entity = new mapray.TextEntity( viewer.scene );

entity.addText( "富士山",
                [-3911845.4, 3433281.3, 3693469.5],
                { color: [1, 1, 0], font_size: 30 } );

entity.addText( "本栖湖",
                [-3896100.8, 3437552.8, 3700948.3],
                { color: [0, 1, 1], font_size: 25 } );

viewer.scene.addEntity( entity );
~~~

各エンティティには様々なプロパティがあります。詳細はリファレンスマニュアルを参照してください。
