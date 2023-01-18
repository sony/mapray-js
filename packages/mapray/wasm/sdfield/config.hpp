#pragma once


namespace sdfield {


/** テクスチャのサンプル値と符号付き距離の関係を表す係数 1
 *
 *  パラメータの間に次の関係が成り立つ。
 *
 *  s == (d - DIST_LOWER) * DIST_FACTOR
 *
 *  ここで s はテクスチャのサンプル値 (基本的に範囲は [0, 1])、
 *  d はサンプル位置からシンボル本体エッジまでの最小距離 (シン
 *  ボルの外側を正、内側を負とする画素単位の符号付き距離) である。
 *
 *  @attention mapray/src/vectile/style_layers/symbol_base.ts 内の
 *             対応する定数と同じ値でなければならない。
 *
 *  @seealso DIST_LOWER
 */
inline constexpr auto DIST_FACTOR = static_cast<float>( 1 / 20.0 );


/** テクスチャのサンプル値と符号付き距離の関係を表す係数 2
 *
 *  詳細は DIST_FACTOR を参照のこと。
 *
 *  @attention mapray/src/vectile/style_layers/symbol_base.ts 内の
 *             対応する定数と同じ値でなければならない。
 *
 *  @seealso DIST_FACTOR
 */
inline constexpr auto DIST_LOWER = static_cast<float>( -1.4142135623730950488 ); // -Math.sqrt( 2 )


/** SDF 画像の水平方向の画素数の最大値
 *
 *  converter_create() において、許可される width + 2 * sdf_ext の最大値
 *
 *  @attention mapray/src/vectile/style_layers/symbol_base.ts 内の
 *             対応する定数と同じ値でなければならない。
 *
 *  @seealso MAX_SDF_HEIGHT
 */
inline constexpr unsigned int MAX_SDF_WIDTH = 4096;


/** SDF 画像の垂直方向の画素数の最大値
 *
 *  converter_create() において、許可される height + 2 * sdf_ext の最大値
 *
 *  @attention mapray/src/vectile/style_layers/symbol_base.ts 内の
 *             対応する定数と同じ値でなければならない。
 *
 *  @seealso MAX_SDF_WIDTH
 */
inline constexpr unsigned int MAX_SDF_HEIGHT = 512;


/** サブピクセルの縦横の分割数
 */
inline constexpr unsigned int SUB_PIXEL_DIVS = 5;

static_assert( SUB_PIXEL_DIVS >= 1 && SUB_PIXEL_DIVS <= 8 );


} // namespace sdfield
