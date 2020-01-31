<!---
title: "　QuickStart"
date: 2019-07-12T16:49:26+09:00
draft: false
description: "このドキュメントでは、まず最小構成のアプリ開発について説明します。"
keywords: ["ドキュメント", "mapray cloud","アカウント", "クラウド"]
type: overview
menu: main
weight: 1001
--->

# QuickStart

このドキュメントでは最小構成の地図アプリケーションを作成する例をご説明します。
mapray cloud のアカウト登録はすでに完了している前提で記載しています。アカウント登録に関しては[アカウント](/documents/overview/Account/)を参照してください。

## 1. maprayJS本体の取得
maprayJSは、JavaScriptファイルを`<script>`で直接読み込む方式(以下CDN方式)と、npmパッケージでモジュールとして読み込む方式（以下モジュール方式）のどちらかで読み込みます。

### CDN方式
HTMLファイルでJavaScriptを読み込みます。`<head>`タグ内で以下のようにインクルードして下さい。
```html
  <script src="https://api.mapray.com/mapray-js/v0.6.0/mapray.js"></script>
```
上記はバージョン0.6.0の場合です。`v0.6.0`には任意のバージョンを指定して下さい。
リリースされている該当のバージョンがあれば、アクセスすることができます。

### モジュール形式
npmかyarnを用いてインストールすることができます。npmjs.comで [公開](https://www.npmjs.com/package/mapray-js) されています。npmを使う場合は、下記のコマンドを実行します。

```bash
npm install --save mapray-js
```

yarnを使う場合は、下記のコマンドを実行します。

```bash
yarn add mapray-js
```

バージョンの指定方法に関してはnpm(yarn)の操作ドキュメントをご参照下さい。



## 2. Access Tokenの取得
mapray cloud のリソースへアクセスするのに必要なAccess Tokenの取得手順について説明します。[mapray cloud](https://cloud.mapray.com)にログインし、右上の`メニュー`から`Account`を選択します。すると、以下のような画面が表示されます。

![Account画面](images/cloud-account.png)

このAccess Token画面で`Create a token`ボタンを押すと'新しいKeyを作成'ダイアログが表示されます。

![新しいKeyを作成ダイアログ](images/cloud-newkey.png)

お好みのKey名を入力して`作成`ボタンを押すと新しいKeyが作成されます。ここではdefaultという名前のAccess Tokenを作成しました。

![Access Tokenを作成](images/cloud-keycreated.png)

以上でAccess Tokenが作成されました。ここで作成したAccess Tokenを後述の手順で利用します。



## 3. Hello Globe !! (最小構成の地図アプリケーション)
いよいよ、最小構成の地図アプリケーションを作成します。完成するとお使いのWebブラウザ内に地球が表示されます。このサンプルプログラムは、日本で２番目に標高の高い北岳付近から、１番目に標高の高い富士山を眺めたものになります。

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hello Globe</title>
    <script src="https://api.mapray.com/mapray-js/v0.6.0/mapray.js"></script>
</head>
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
<body>
    <div id="mapray-container"></div>
</body>
</html>

<script>
    // Access Tokenを設定
    var accessToken = "<your access token here>";

    // 国土地理院提供の地図タイルを設定
    var imageProvider = new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 0, 18 );

    // Viewerを作成する
    var viewer = new mapray.Viewer(
        "mapray-container", {
            image_provider: imageProvider,
            dem_provider: new mapray.CloudDemProvider(accessToken)
        }
    );

    // カメラ位置の設定

    // 球面座標系で視点を設定。
    var home_pos = { longitude: 138.247739, latitude: 35.677604, height: 3000 };

    // 球面座標から
    var home_view_to_gocs = mapray.GeoMath.iscs_to_gocs_matrix( home_pos, mapray.GeoMath.createMatrix());

    // 視線方向を定義
    var cam_pos = mapray.GeoMath.createVector3( [-3000, 2600, 700] );
    var cam_end_pos    = mapray.GeoMath.createVector3( [0, 0, 0] );
    var cam_up         = mapray.GeoMath.createVector3( [0, 0, 1] );


    var view_to_home = mapray.GeoMath.createMatrix();
    mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

    // カメラの位置と視線方向からカメラの姿勢を変更
    var view_to_gocs = viewer.camera.view_to_gocs;
    mapray.GeoMath.mul_AA( home_view_to_gocs, view_to_home, view_to_gocs );

    // カメラのnear  farの設定
    viewer.camera.near = 30;
    viewer.camera.far = 500000;
</script>
```

上記プログラム内の`<your access token here>`を、作成したAccess Tokenで書き換えて下さい。例えば、Access Tokenが`AbCdEfGhIjKlMnOpQrStU`であれば、下記のように修正します。

```javascript
var accessToken = 'AbCdEfGhIjKlMnOpQrStU';
```

Access Tokenを書き換えたファイルを任意の名前で保存し、ブラウザで確認します。


![Hello Globe](images/cloud-hello-globe.png)



## 4. Example
[mapray-jsリポジトリ (Github)](https://github.com/sony/mapray-js)で公開されているサンプルプログラムを動作させる方法をご説明します。下記二つのサンプルプログラムを動作させることができます。（今後さらに追加していく予定です）
- [Fall](https://github.com/sony/mapray-js/tree/master/apps/fall): 富士山に向かって滑らかなカメラアニメーションを行うアプリケーションです。
- [nextRambler](https://github.com/sony/mapray-js/tree/master/apps/next): キーボードとマウスで自由にカメラを操作することができるアプリケーションです([DEMO](https://mapray.com/nextRambler.html))。

それぞれ、下記の手順でビルド・実行します。

### 1. ソースコードの取得
[mapray-jsリポジトリ (Github)](https://github.com/sony/mapray-js)をダウンロードします。（mapray.js本体とサンプルアプリケーション両方のソースコードが含まれています）。

### 2. ライブラリ環境のインストール
上記でダウンロードしたディレクトリのルートディレクトリに入り、下記のコマンドを実行しビルドに必要なライブラリをインストールします。
``` bash
$ npm install
```

### 3. mapray.js本体のビルド
``` bash
$ npm run mapray-devel
```
buildディレクトリにmapray.jsとmapファイルが生成されます。

### 4. アクセストークンの設定
#### Fallの場合
[Fall.js](https://github.com/sony/mapray-js/blob/master/apps/fall/Fall.js)の**accessToken**をmapray cloudで取得したTokenで置き換えます。
#### nextRamblerの場合
[NextRambler.js](https://github.com/sony/mapray-js/blob/master/apps/next/NextRambler.js)の**accessToken**をmapray cloudで取得したTokenで置き換えます。
（また、Bing Mapsの衛星写真地図に切り替えるには、Bing MapsのAPI Keyをご用意いただき、NextRambler.jsの[<your Bing Maps Key here>](https://github.com/sony/mapray-js/blob/master/apps/next/NextRambler.js#L642)を置き換えます。アプリケーション起動後キーボードのBでBing Mapsに切り替えることができるようになります。）


### 5. アプリケーションのビルド
``` bash
$ npm run apps-devel
```
buildディレクトリにアプリケーションファイルとそのmapファイルが生成されます。


### 6. htmlのコピー
build以下にアプリケーションのhtmlファイルをコピーします。
``` bash
$ cp ./html/*.html ./build/
```


### 7. ローカルサーバーの起動
お好みのツールでbuild以下のhtml, jsファイルをホストします。例として、python2系でローカルサーバーを動作させる例を示します。
 ``` bash
 $ cd build
 $ python -m SimpleHTTPServer 8080
 ``` 


### 8. 実行
ブラウザで下記のURLにアクセスします。
- fall: http://localhost:8080
- nextRambler: http://localhost:8080/nextRambler.html


## What's next?
- [mapray cloudへ接続する例(2D)](/documents/overview/connectmapraycloud-2D/)
- [mapray cloudへ接続する例(3D)](/documents/overview/connectmapraycloud-3D/)
- [maprayJSの機能開発例](/documents/tutorials/)


※ プログラムやデータに関するライセンスについては[こちら](/documents/overview/Licence)をご確認ください。
