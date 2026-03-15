# mapray-underground

地下レンダリングの確認用に、3D データセットと点群を読み込んで表示するだけの最小 debug アプリです。

## 方針

- ポップアップやステータス UI は置かない
- API キーやトークンはソースに書かない
- `.env` かシェルの環境変数から設定を読む
- 初期視点は関東平野

## 使う環境変数

`.env.example` を `.env` にコピーして値を入れてください。

```bash
cp .env.example .env
```

必要な値は次です。

```bash
MAPRAY_ACCESS_TOKEN=
DATASET_3D_ID=
DATASET_POINT_CLOUD_ID=
```

補足:

- `MAPRAY_ACCESS_TOKEN`
  地形 DEM と Mapray Cloud の 3D データセット / 点群の両方に使います。
  未設定なら `FlatDemProvider` にフォールバックし、Cloud dataset は読み込みません。
- `DATASET_3D_ID`
  読み込む 3D データセット ID です。
- `DATASET_POINT_CLOUD_ID`
  読み込む点群データセット ID です。

Cloud API の base path は `https://cloud.mapray.com` に固定しています。

## 起動

リポジトリルートで `mapray` と `ui` を build してから、debug アプリを起動します。

```bash
yarn mapray-devel
yarn ui-devel
yarn workspace @mapray/ui css
yarn --cwd debug/underground build
yarn --cwd debug/underground start
```

ブラウザで `http://localhost:7776/` を開きます。

## 挙動

- 起動直後の初期カメラ位置は関東平野です。
- データセットが読めた場合は、自動でその付近へカメラを合わせます。
- dataset metadata が無効で、原点が `0,0` になるような値は採用しません。
  その場合は関東平野の初期視点を維持します。
- 左上のボタンで背景地図の表示を surface / wireframe で切り替えできます。
