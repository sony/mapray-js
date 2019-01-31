# mapray JS 改訂履歴

## Version 0.5.1
npmjsへ公開

## Version 0.5.0
Open Sourceとして公開

## Version 0.4.3

### mapray-js

[新規]
* レイヤー機能の追加

[変更]
* Inouをmaprayに改名


## Version 0.4.2

### サンプル

[新規]
* クラウドにアクセスを行うアプリケーションnextRamblerを追加


## Version 0.4.1

[不具合]

* テクスチャのキャッシュが削減されない問題 (Version 0.4.0 で発生) を修正した。
* rambler.html の <div> タグが閉じられていない問題を修正した。


## Version 0.4.0

### inou エンジン

* Inou.Viewer のインスタンスを破棄する destroy() メソッドを追加した。


## Version 0.3.1

### inou エンジン

[不具合]

* Inou.TextEntity が公開されていない問題を解決
* Inou.GenericEntity#setTransform() が実装されていない問題を解決

### その他

[新規]

* Inou コンテンツ開発者ガイド doc/InouDeveloperGuide.md を追加
* サンプルプログラム Turning を追加


## Version 0.3.0

### inou エンジン

[新規]

* レイと地表との交点を取得する機能を追加
  - Inou.Ray
  - Inou.Viewer#getRayIntersection()
* カメラに変換行列を取得するメソッドを追加
  - Inou.Camera#getCanvasToView()
  - Inou.Camera#getCanvasToGocs()
  - Inou.Camera#getViewToCanvas()
* カメラにレイを取得するメソッドを追加
  - Inou.Camera#getCanvasRay()

[内部]

* Inou.DemBinary と Inou.FlakeMesh のキャッシュを Inou.Globe へ統合

### サンプル

* Rambler
  - ドラッグによるカメラの移動操作を追加
  - カメラの回転操作をドラッグから Ctrl + ドラッグに変更
  - Microsoft Edge ブラウザに対応


## Version 0.2.0

### inou エンジン

[新規]

* DEM データプロバイダの抽象クラス Inou.DemProvider を公開
  - Inou.Viewer の構築子にオプション dem_provider を追加
  - Inou.Viewer のインスタンスにプロパティ dem_provider を追加
  - 標準的な DEM データプロバイダの具象クラス Inou.StandardDemProvider を追加

[変更]

* Inou.ImageProvider のインタフェースを Inou.DemProvider に合わせて変更
  - 追加メソッド
    - ImageProvider#requestTile( z, x, y, callback )
    - ImageProvider#cancelRequest( id )
  - 削除メソッド
    - ImageProvider#getTileAddress( z, x, y )


## Version 0.1.0

+ inou エンジンをライブラリ化 (UMD 対応) して、npm パッケージとして使用できるようにした。
+ テキスト表示エンティティ TextEntity を追加した。
+ MarkerLineEntity のシーンスキーマを変更した。
