#pragma once

#include <type_traits>  // for is_integral_v, is_unsigned_v
#include <limits>   // for numeric_limits
#include <cstddef>  // for size_t


namespace sdfield {


/** @brief pos を N バイトアライメント
 *
 * 非負の整数 pos を N バイトでアラインする。
 */
template<std::size_t N, typename T>
constexpr T
get_aligned( const T& pos )
{
    static_assert( N >= 1 );
    return static_cast<T>( (pos + N - 1) / N * N );
}


/** @brief 最上位ビット
 *
 * n の最も左側の 1 はそのままで、それ以外のビットを 0 に変更した整数
 * を返す。
 *
 * ただし n が 0 のときは 0 を返す。
 *
 * @tparam T  符号なし整数型
 *
 * @note 簡易的な実装なので計算量は T のサイズ比例する
 * @note std::bit_floor() 関数は C++20 から
 */
template<typename T>
constexpr T
make_msb_only( T n )
{
    static_assert( std::is_integral_v<T> && std::is_unsigned_v<T> );

    constexpr T msb_max = static_cast<T>( 1 ) << (std::numeric_limits<T>::digits - 1);

    for ( T a = msb_max; a != 0; a >>= 1 ) {
        if ( n & a ) return a;
    }

    return 0;
}


/** @brief 2の累乗に切り上げ
 *
 * n 以上で最も小さい 2 の累乗を返す。
 *
 * ただし n が 0 のときは 0 を返す。
 *
 * @tparam T  符号なし整数型
 *
 * @note 簡易的な実装なので計算量は T のサイズ比例する
 * @note std::bit_ceil() 関数は C++20 から
 */
template<typename T>
constexpr T
make_bit_ceil( T n )
{
    static_assert( std::is_integral_v<T> && std::is_unsigned_v<T> );

    const auto mask = static_cast<T>( make_msb_only( n ) - 1 );

    return (n + mask) & ~mask;
}

} // namespace sdfield
