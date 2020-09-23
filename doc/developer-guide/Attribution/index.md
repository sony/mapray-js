<!---
title: "　Attribution"
date: 2019-12-13T18:02:17+09:00
draft: false
description: "著作権表示"
keywords: ["maprayJS", "商標", "著作権", "レンダリング", "ワードマーク", "JAXA", "国土地理院"]
type: overview
menu: main
bookShowToC: false
weight: 1090
--->

# Attribution
Maprayのデータまたは、maprayJSを利用する場合には、Maprayの図形・文字商標（以下、ワードマーク）であるロゴとテキストによる著作権表示を両方行う必要があります。

![Attribution and wordmark](images/attribution.png)

## 著作権表示の方法
Maprayを利用するためには、ワードマークとテキストを両方表示する必要がありますので、以下、個別に説明します。

### ワードマーク
MaprayのワードマークはMaprayの図形と文字商標になります。これは通常画面の左下に表示します。maprayJSの機能により、ワードマークを画面の別の端に移動することもできます。Maprayを利用しているソフトウェア・コンテンツであることが他の方によくわかるようにワードマークを表示して下さい。ワードマークは画面サイズの横幅が文字商標を表示するのに十分ではない場合に限り、図形商標のみの表示にすることができます。通常、maprayJSが自動的にワードマークを切り替えて表示します。ワードマークを削除したい場合は、ソニー株式会社のセールス宛てにWebサイトの[contact us](https://webform.secure.force.com/form/mapray1)からお問い合わせ下さい。
ワードマークは以下のCSSをロードすると自動的に画面に表示されます。また、npmでも提供されますので環境に合わせてご選択下さい。
```html
    <link rel="stylesheet" href="https://resource.mapray.com/styles/v1/mapray.css">
```

### テキストによる表示
テキストによる著作権表示は少なくとも、以下の３つのリンクが必要になります

- a: [©Mapray](https://mapray.com)
- b: [©JAXA](http://www.jaxa.jp/)
- c: [測量法に基づく国土地理院長承認（複製）H30JHf626](https://www.gsi.go.jp/kiban/index.html)

bとcはMapray cloudが配信する地形データを生成するためにこれら団体が提供している元データを利用しているためであり、Mapray Cloudが配信する地形データを利用している場合は明記する必要があります。cに関しては、[測量法第２９条の規定に基づく承認取扱要領](https://www.gsi.go.jp/common/000219764.pdf)の第４条に記載されている通り、表記が困難である場合は説明のページや説明書等への記載でも認められます。
上記の著作権表示はmaprayJSがデフォルトで自動的に表示を行うようになっておりますが、Mapray Cloudを利用しない場合は表記を変更することができます。詳細は[AttributionContoller](https://github.com/sony/mapray-js/blob/master/packages/mapray/AttributionController.js)を参照して下さい。

## 地形データの改変・複製について
Mapray Cloudが配信するデータは当社が測量法第２９条により許可を得て作成・配信しているものであり複製・改変を行うことはできません。当該地形データは当社の著作物であり権利は当社にあると同時に、測量法第２９条により国土地理院からの利用規約上、ユーザーの皆様が当社の地形データを複製することは認められておりません。

## 著作表示の追加
オープンデータ、有償データに関わらず、地理空間情報関連のデータをMapray上に表示する場合は、各データプロバイダーの利用規約に沿ってデータを利用する必要があります。多くの場合、テキストによる著作権表示を求められる場合がありますので、[AttributionContoller](https://github.com/sony/mapray-js/blob/master/packages/mapray/AttributionController.js)を活用して画面上に正しく著作権表示を行って下さい。
