#pragma once

#include "CovImage.hpp"
#include "config.hpp"  // for SUB_PIXEL_DIVS
#include <array>
#include <cstddef>  // for ptrdiff_t


namespace sdfield {


/** @brief 被覆率のバイリニア補間
 */
class Bilinear {

  public:
    /** @brief 補間値の型
     */
    using value_t = float;


  public:
    /** @brief 初期化
     */
    Bilinear( const CovImage& image,
              CovImage::coord_t   x,
              CovImage::coord_t   y )
    {
        // 周辺を含めた被覆率を書き込む
        for ( short oy = -1; oy <= +1; ++oy ) {
            for ( short ox = -1; ox <= +1; ++ox ) {
                const auto value = image.get_pixel( x + ox, y + oy );
                data_[ index( ox + 1, oy + 1 ) ] = static_cast<value_t>( value );
            }
        }
    }


    /** @brief 被覆率の補間値を取得
     *
     *  @param sx  サブピクセル X 座標 (0 〜 SUB_PIXEL_DIVS - 1)
     *  @param sy  サブピクセル Y 座標 (0 〜 SUB_PIXEL_DIVS - 1)
     *
     *  @return  被覆率の補間値
     */
    value_t
    sample( int sx,
            int sy ) const
    {
        // 内部座標系に変換
        const auto s = 1 / static_cast<float>( SUB_PIXEL_DIVS );
        const auto x = 0.5f + (0.5f + static_cast<float>( sx )) * s;
        const auto y = 0.5f + (0.5f + static_cast<float>( sy )) * s;

        // 補間パラメータ
        const auto tx = (x < 1) ? x : x - 1;
        const auto ty = (y < 1) ? y : y - 1;

        // サブピクセル周辺の被覆率
        const int  ix = (x < 1) ? 0 : 1;
        const int  iy = (y < 1) ? 0 : 1;

        const auto v00 = data_[ index( ix + 0, iy + 0 ) ];
        const auto v10 = data_[ index( ix + 1, iy + 0 ) ];
        const auto v01 = data_[ index( ix + 0, iy + 1 ) ];
        const auto v11 = data_[ index( ix + 1, iy + 1 ) ];

        // バイリニア補間値
        //
        //    u0 = v00 (1 - tx) + v10 tx
        //    u1 = v01 (1 - tx) + v11 tx
        // value =  u0 (1 - ty) +  u1 ty
        //
        return v00 + tx*(v10 - v00) + ty*(v01 - v00) + tx*ty*(v00 + v11 - v01 - v10);
    }


  private:
    static constexpr int           height_ = 3;
    static constexpr std::ptrdiff_t pitch_ = 4;  // width 以上で一番小さい 2^n


    /** @brief 指定位置のインデックスを取得
     */
    std::ptrdiff_t
    index( int x,
           int y ) const
    {
        return x + y * pitch_;
    }


  private:
    std::array<value_t, height_ * pitch_> data_;

};


} // namespace sdfield
