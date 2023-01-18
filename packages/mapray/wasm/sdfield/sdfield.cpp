/**
 * 符号付き距離場 (Signed Distance Field) を計算するモジュール
 *
 * 被覆率の画像から符号付き距離場の画像を生成する。
 *
 * symbol 型の StyleLayer の内部で使用する。
 */

#include "Converter.hpp"
#include "basic_types.hpp"
#include "wasm_types.hpp"
#include <emscripten/emscripten.h>  // for EMSCRIPTEN_KEEPALIVE
#include <cassert>

using sdfield::Converter;
using sdfield::CovImage;
using sdfield::SdfImage;
using sdfield::cast;


/** @brief Converter インスタンスを生成
 *
 *  出力 SDF 画像の画素数は以下のようになる。
 *
 *  - 水平方向 width  + 2 * sdf_ext
 *  - 垂直方向 height + 2 * sdf_ext
 *
 *  @param width   入力画像の水平方向の画素数
 *  @param height  入力画像の垂直方向の画素数
 *  @param sdf_ext 出力 SDF 画像のための拡張画素数
 *
 *  @pre width >= 1 && height >= 1 && sdf_ext >= 0
 *  @pre width  + 2 * sdf_ext <= MAX_SDF_WIDTH
 *  @pre height + 2 * sdf_ext <= MAX_SDF_HEIGHT
 */
extern "C" EMSCRIPTEN_KEEPALIVE
Converter*
converter_create( wasm_i32_t width,
                  wasm_i32_t height,
                  wasm_i32_t sdf_ext )
{
    assert( width >= 1 && height >= 1 && sdf_ext >= 0 );
    assert( width  + 2 * sdf_ext <= MAX_SDF_WIDTH );
    assert( height + 2 * sdf_ext <= MAX_SDF_HEIGHT );

    return new Converter( { cast, width, height },
                          static_cast<Converter::sdf_ext_t>( sdf_ext ) );
}


/** @brief Converter インスタンスを破棄
 */
extern "C" EMSCRIPTEN_KEEPALIVE
void
converter_destroy( const Converter* conv )
{
    assert( conv );
    delete conv;
}


/** @brief 被覆率画像の書き込み位置を取得
 */
extern "C" EMSCRIPTEN_KEEPALIVE
CovImage::pixel_t*
converter_get_write_position( Converter* conv )
{
    assert( conv );
    return conv->get_write_position();
}


/** @brief SDF 画像に変換して読み込み位置を取得
 *
 *  水平方向は 4 バイトアラインされていることに注意すること。
 */
extern "C" EMSCRIPTEN_KEEPALIVE
const SdfImage::pixel_t*
converter_build_sdf( Converter* conv )
{
    assert( conv );
    return conv->build_sdf();
}
