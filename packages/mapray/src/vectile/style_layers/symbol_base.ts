/**
 * テクスチャのサンプル値と符号付き距離の関係を表す係数 1
 *
 * パラメータの間に次の関係が成り立つ。
 *
 * `s == (d - DIST_LOWER) * DIST_FACTOR`
 *
 * ここで s はテクスチャのサンプル値 (基本的に範囲は [0, 1])、
 * d はサンプル位置からシンボル本体エッジまでの最小距離 (シン
 * ボルの外側を正、内側を負とする画素単位の符号付き距離) である。
 *
 * @remarks
 *
 * この定数の値を変更したときは `mapray/wasm/sdfield/config.hpp`
 * 内の対応する定数も同じ値に変更しなければならない。
 */
export const DIST_FACTOR = 1 / 20.0;


/**
 * テクスチャのサンプル値と符号付き距離の関係を表す係数 2
 *
 * 詳細は [[DIST_FACTOR]] を参照のこと。
 *
 * @remarks
 *
 * この定数の値を変更したときは `mapray/wasm/sdfield/config.hpp`
 * 内の対応する定数も同じ値に変更しなければならない。
 */
export const DIST_LOWER = -Math.sqrt( 2 );


/**
 * SDF 画像の水平方向の画素数の最大値
 *
 * @remarks
 *
 * この定数の値を変更したときは `mapray/wasm/sdfield/config.hpp`
 * 内の対応する定数も同じ値に変更しなければならない。
 */
export const MAX_SDF_WIDTH = 4096;


/**
 * SDF 画像の垂直方向の画素数の最大値
 *
 * @remarks
 *
 * この定数の値を変更したときは `mapray/wasm/sdfield/config.hpp`
 * 内の対応する定数も同じ値に変更しなければならない。
 */
export const MAX_SDF_HEIGHT = 512;
