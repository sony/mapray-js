# mapray-js fork

この fork では npm registry には公開せず、GitHub Release に添付した package tarball を `npm install` して使います。

## Install

core のみ:

```bash
npm install https://github.com/TakamuneSuda/mapray-js/releases/download/v0.9.5/mapray-js.tgz
```

ui も使う場合:

```bash
npm install \
  https://github.com/TakamuneSuda/mapray-js/releases/download/v0.9.5/mapray-js.tgz \
  https://github.com/TakamuneSuda/mapray-js/releases/download/v0.9.5/mapray-ui.tgz
```

## Release

1. `packages/mapray/package.json` と `packages/ui/package.json` の `version` を揃える
2. その version に対応する tag を `v0.9.5` のように作る
3. GitHub Release を作成する

Release 作成時に [release_package_assets.yml](/Users/takamunesuda/Develop/Personal/mapray-js/.github/workflows/release_package_assets.yml) が動いて、`mapray-js.tgz` と `mapray-ui.tgz` を添付します。

## Local Build

```bash
yarn install
yarn mapray
yarn ui
yarn css
```
