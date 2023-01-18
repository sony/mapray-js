#pragma once

#include <array>
#include <type_traits>  // for make_unsigned_t
#include <cstdint>  // for int_least16_t
#include <cstddef>  // for size_t


namespace sdfield {


/** @brief 一般的な画像の座標の要素型
 */
using img_coord_elem_t = std::int_least16_t;


/** @brief img_size_t の要素型
 */
using img_size_elem_t = std::make_unsigned_t<img_coord_elem_t>;


using vec_elem_t = float;


using vec_dist_t = float;


/** @brief キャスト指定用の特殊定数
 */
inline constexpr struct cast_type {} cast;


/** @brief 矩形サイズ
 */
template<typename T, std::size_t D>
class rect_size : private std::array<T, D> {

    static_assert( D >= 1 );

    using base_t = std::array<T, D>;

  public:
    /** @brief 不定値で初期化
     */
    rect_size() {}

    /** @brief 各軸の寸法を指定して初期化
     */
    template<typename... U>
    constexpr rect_size( const U&... args )
        : base_t{ args... }
    {
        static_assert( sizeof...( args ) == D );
    }

    /** @brief 各軸の寸法を指定して初期化 (キャストあり)
     */
    template<typename... U>
    constexpr rect_size( cast_type,
                         const U&... args )
        : base_t{ static_cast<T>( args )... }
    {
        static_assert( sizeof...( args ) == D );
    }

    using base_t::operator[];
    using base_t::size;
    using typename base_t::value_type;

};


/** @brief 一般的な画像の縦横画素数の型
 */
using img_size_t = rect_size<img_size_elem_t, 2>;


/** @brief 出力 SDF 画像のための拡張画素数
 */
using sdf_ext_t = std::int_least16_t;


/**
 * 最小距離の位置へ差分
 */
struct Vec {

    /** @brief X 座標
     */
    vec_elem_t dx;


    /** @brief Y 座標
     */
    vec_elem_t dy;


    /** @brief 距離の平方を取得
     */
    constexpr vec_dist_t dist_sq() const
    {
        return dx*dx + dy*dy;
    }


    /** @brief 零ベクトルかどうかを確認
     */
    constexpr bool is_zero() const
    {
        return dx == 0 && dy == 0;
    }

};


} // namespace sdfield
