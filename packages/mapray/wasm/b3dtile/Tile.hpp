#pragma once

#include "Rect.hpp"
#include "wasm_types.hpp"
#include <array>
#include <limits>
#include <cstddef>  // for size_t


namespace b3dtile {

/** @brief タイルのバイナリーデータ
 */
class Tile {

    using  size_t = std::size_t;

  public:
    using  byte_t = unsigned char;

    template<typename EType, size_t Dim>
    using coords_t = const std::array<EType, Dim>;

    class Base;
    class DescDepth;
    class Analyzer;
    class BCollector;
    class Clipper;
    class TriNode;
    class RaySolver;


    /** @brief 空間の次元数
     */
    static constexpr int DIM = 3;


  public:
    /** @brief タイルデータをコピーする関数の型
     *
     *  構築子 Tile() を呼び出したタイミングでこの関数が呼び出される。
     *
     *  dst_begin から始まる領域にタイルのバイナリデータをすべてコピーする。
     *
     *  @param dst_begin  コピー先の先頭へのポインタ
     *
     *  @see setup_javascript_functions()
     */
    using binary_copy_func_t = void ( void* dst_begin );


    /** @brief clip() の結果を受け取る関数の型
     *
     *  data は資料 LargeScale3DScene の「タイルの形式」
     *
     *  { POSITIONS, TRIANGLES, N_ARRAY, TC_ARRAY }
     *
     *  の部分と同じ形式で格納されている。ただし、存在するデータは CONTENTS の値
     *  に従う。
     *
     *  この関数から出たあとは data のメモリーが解放される可能性がある。
     *
     *  @param num_vertices   頂点数
     *  @param num_triangles  三角形数
     *  @param data           データの先頭へのポインタ
     *
     *  @see setup_javascript_functions()
     */
    using clip_result_func_t = void ( wasm_i32_t  num_vertices,
                                      wasm_i32_t num_triangles,
                                      const void*         data );


    /** @brief find_ray_distance() の結果を受け取る関数の型
     *
     *  distance と find_ray_distance() の limit 引数が違う値のとき、レイとタイル
     *  内の三角形が交差したことを表す。それ以外のときは交差がなかったことを表す。
     *
     *  交差がなかったときは、distance 以外のパラメータは意味を持たない。
     *
     *  @param distance  交差した位置の距離
     *  @param id_0      交差した三角形の feature ID (下位 32 ビット)
     *  @param id_1      交差した三角形の feature ID (上位 32 ビット)
     *
     *  @see setup_javascript_functions()
     */
    using ray_result_func_t = void ( wasm_f64_t distance,
                                     wasm_f64_t     id_0,
                                     wasm_f64_t     id_1 );


  public:
    /** @brief JavaScript 関数の登録
     *
     *  このクラスを使うために必要な JavaScript の関数を登録する。
     */
    static void
    setup_javascript_functions( binary_copy_func_t* binary_copy,
                                clip_result_func_t* clip_result,
                                ray_result_func_t*   ray_result )
    {
        binary_copy_ = binary_copy;
        clip_result_ = clip_result;
        ray_result_  = ray_result;
    }


    /** @brief 初期化
     *
     *  コピー処理は binary_copy() を呼び出して行う。
     *
     *  @param size  バイナリデータのバイト数
     */
    explicit
    Tile( size_t size );


    /** @brief 後処理
     */
    ~Tile();


    /** @brief 子孫の最大深度を取得
     *
     *  パラメータは基本的に B3dBinary#getDescendantDepth() と同等である。
     *
     *  @note 深度が 24 を超える可能性があるので、座標は倍精度であることが重要
     *
     *  @return 既知の最大深度
     */
    int
    get_descendant_depth( double  x,
                          double  y,
                          double  z,
                          int limit ) const;


    /** @brief 指定領域で切り取る
     *
     *  パラメータの座標系は ALCS を想定している。
     *
     *  結果は clip_result() を呼び出して返す。
     *
     *  todo: 返すデータをマシンバイトオーダーに変換する。
     *        現在は (wasm と同じ) リトルエンディアンで返している。
     *
     *  @pre size > 0
     */
    void
    clip( float    x,
          float    y,
          float    z,
          float size ) const;


    /** @brief タイル内の三角形とレイとの交点を探す
     *
     *  パラメータの座標系は ALCS を想定している。
     *
     *  結果は ray_result() を呼び出して返す。
     */
    void
    find_ray_distance( const coords_t<double, DIM>& ray_pos,
                       const coords_t<double, DIM>& ray_dir,
                       double                       limit,
                       const Rect<float, DIM>&      lrect ) const;


    Tile( const Tile& ) = delete;
    void operator=( const Tile& ) = delete;


  private:
    byte_t* const data_;  // タイルデータのバイト列

    static inline binary_copy_func_t* binary_copy_;
    static inline clip_result_func_t* clip_result_;
    static inline ray_result_func_t*   ray_result_;

    // ES6 の Uint8Array との一致を確認
    static_assert( std::numeric_limits<byte_t>::digits == 8 );

};

} // namespace b3dtile
