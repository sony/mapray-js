# 3D Tiles Coverage

`mapray-js` fork の `ThreeDTileset` 実装に対する、現在の 3D Tiles 対応状況です。

実装の基準ファイル:

- [`packages/mapray/src/ThreeDTileset.ts`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/ThreeDTileset.ts)
- [`packages/mapray/src/gltf/Context.js`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/gltf/Context.js)
- [`packages/mapray/src/gltf/Buffer.js`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/gltf/Buffer.js)
- [`packages/mapray/src/gltf/Image.js`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/gltf/Image.js)

この markdown は「今の実装が何を読めるか」を確認するための一覧です。実装が変わったらこのファイルも合わせて更新してください。

## Summary

| 項目 | 状態 | 備考 |
| --- | --- | --- |
| tileset JSON | Supported | `root` 階層の通常走査に対応 |
| external tileset JSON | Supported | 外部 `tileset.json` を子タイルとして展開 |
| `glTF` tile content | Supported | `.gltf` をロード |
| `GLB` tile content | Supported | `.glb` と binary magic 判定に対応 |
| `b3dm` | Supported | ヘッダを剥がして内包 GLB をロード |
| `i3dm` | Partial | CPU 側で primitive clone によりインスタンス展開 |
| `pnts` | Supported | Draco を含む位置・色・法線・`batch id` の point payload に対応 |
| `cmpt` | Partial | 内包 `glb` / `b3dm` / `i3dm` / `pnts` / `cmpt` を再帰展開 |
| `geom` | Unsupported | 未対応 |
| `vctr` | Unsupported | 未対応 |
| implicit tiling / `subtree` | Unsupported | 未対応 |
| multiple `contents` | Supported | `content` / `contents[]` を集約してロード |
| metadata / styling | Unsupported | 未対応 |
| picking | Unsupported | 未対応 |

## Tile Formats

| Format | 状態 | 現在のカバレッジ |
| --- | --- | --- |
| `gltf` | Supported | JSON glTF を `GltfTool` 経由でロード |
| `glb` | Supported | GLB v2 の JSON/BIN chunk を直接利用 |
| `b3dm` | Supported | Feature/Batch Table は無視し、GLB 本体を描画 |
| `i3dm` | Partial | `gltfFormat` 0/1, `POSITION`, `POSITION_QUANTIZED`, `RTC_CENTER`, `NORMAL_UP`, `NORMAL_RIGHT`, `NORMAL_UP_OCT32P`, `NORMAL_RIGHT_OCT32P`, `EAST_NORTH_UP`, `SCALE`, `SCALE_NON_UNIFORM` |
| `pnts` | Supported | `POINTS_LENGTH`, `POSITION`, `POSITION_QUANTIZED`, `QUANTIZED_VOLUME_OFFSET`, `QUANTIZED_VOLUME_SCALE`, `RTC_CENTER`, `RGB`, `RGBA`, `RGB565`, `CONSTANT_RGBA`, `NORMAL`, `NORMAL_OCT16P`, `BATCH_ID`, `BATCH_LENGTH`, `3DTILES_draco_point_compression` |
| `cmpt` | Partial | 内包コンテンツを再帰的に解析してロード |

## Bounding Volume

| 種別 | 状態 | 備考 |
| --- | --- | --- |
| `box` | Supported | 8 corner で可視判定 |
| `sphere` | Supported | 半径球で可視判定 |
| `region` | Supported | corner を GOCS 化して可視判定 |
| `content.boundingVolume` | Supported | 描画判定の絞り込みに使用 |

## Rendering Path

| 項目 | 状態 | 備考 |
| --- | --- | --- |
| フレーム中のタイル選別 | Supported | SSE ベース |
| リクエスト優先度制御 | Supported | frame end で queue flush |
| `REPLACE` / `ADD` refine | Supported | `REPLACE` では親を維持しつつ子へ遷移 |
| キャッシュ削減 | Supported | touched frame と SSE で trim |
| tile `contents[]` 集約 | Supported | 複数 content を 1 tile に集約 |
| tile content 並列ロード | Supported | `contents[]` / `cmpt` 内包 content は並列ロード |
| glTF primitive template cache | Supported | 同一外部 glTF / GLB resource は template を再利用 |
| `i3dm` instancing | Partial | GPU instancing ではなく CPU clone |
| `pnts` 描画 | Supported | 専用 lightweight point material、法線があれば簡易ライティング |
| `pnts` GPU buffer packing | Supported | position/color/normal を compact buffer で upload |

## Detailed Notes

### `b3dm`

- 描画対象は内包 GLB のみです。
- Feature Table / Batch Table の metadata はまだ利用していません。

### `i3dm`

- 向きは custom normal または `EAST_NORTH_UP` を解釈します。
- glTF は embedded / external の両方に対応しています。
- 現状はインスタンスごとに primitive を複製するため、インスタンス数が多いケースでは GPU instancing 実装より重くなります。

### `pnts`

- `POSITION` / 色 / 法線 / `BATCH_ID` は非圧縮・Draco 圧縮の両方を読めます。
- `NORMAL` と `NORMAL_OCT16P` は対応済みです。
- `BATCH_ID` は `UNSIGNED_BYTE` / `UNSIGNED_SHORT` / `UNSIGNED_INT` を読み、`primitive.properties` に保持します。
- 頂点 upload は float 展開の 1 本バッファではなく、position/color/normal を分離した compact buffer を使います。
- `batch table` metadata 自体は全体の `metadata / styling` 未対応に従ってまだ利用していません。
- 点サイズは現状固定です。

### `cmpt`

- ネストした composite は展開できます。
- binary tile content のみ対象です。

### `contents`

- `content` と `contents[]` のどちらも処理します。
- 複数 content の描画物は tile 単位で集約されます。
- `content.boundingVolume` が複数ある場合は union 的にまとめて扱います。

## Not Covered Yet

- `geom`
- `vctr`
- implicit tiling
- `subtree`
- Feature Table / Batch Table metadata の利用
- styling
- picking
- GPU instancing for `i3dm`

## Quick Check

実装を触ったときは少なくとも次を見れば、coverage の更新対象を判断できます。

- binary content の分岐: [`packages/mapray/src/ThreeDTileset.ts`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/ThreeDTileset.ts#L816)
- `pnts` parser / Draco 復号: [`packages/mapray/src/ThreeDTileset.ts`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/ThreeDTileset.ts#L1174)
- `i3dm` transform 展開: [`packages/mapray/src/ThreeDTileset.ts`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/ThreeDTileset.ts#L1716)
- `pnts` point primitive: [`packages/mapray/src/ThreeDTileset.ts`](/Users/takamunesuda/Develop/Personal/mapray-js/packages/mapray/src/ThreeDTileset.ts#L1926)
