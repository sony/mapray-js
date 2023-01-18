#pragma once

#include "CovImage.hpp"
#include "config.hpp"  // for SUB_PIXEL_DIVS
#include <algorithm>   // for clamp()
#include <array>
#include <cstddef>     // for size_t


namespace sdfield {


/** @brief 被覆率に対応するサブピクセル数を取得
 */
class CoverageRatioCount {

  public:
    /** @brief 被覆率に対応するサブピクセル数を取得
     */
    inline static constexpr std::size_t
    get( CovImage::pixel_t coverage );


  private:
    /** @brief 初期化
     *
     *  自クラスのみがインスタンスを生成できるように定義している。
     *
     *  実際には constexpr によるコンパイル時定数としてのみ使用され、
     *  実行時にインスタンスは生成されない。
     */
    constexpr CoverageRatioCount() : table_ {}
    {
        for ( int coverage = 0; coverage <= CovImage::max_value; ++coverage ) {
            table_[coverage] = calc( static_cast<CovImage::pixel_t>( coverage ) );
        }
    }


    /** @brief 被覆率に対するサブピクセル数を計算
     */
    static constexpr unsigned char calc( CovImage::pixel_t coverage )
    {
        using std::clamp;

        constexpr auto   one = CovImage::max_value;
        constexpr auto divs2 = SUB_PIXEL_DIVS * SUB_PIXEL_DIVS;

        const auto count = (2 * divs2 * coverage + one) / (2 * one);

        // 0 または divs2 にならないようにする
        return static_cast<unsigned char>( clamp<std::size_t>( count, 1, divs2 - 1 ) );
    }


  private:
    // 計算済みの値
    std::array<unsigned char, CovImage::max_value + 1> table_;

};


// クラス内では定義できなかった
constexpr std::size_t
CoverageRatioCount::get( CovImage::pixel_t coverage )
{
    constexpr CoverageRatioCount count;
    return count.table_[coverage];
}


} // namespace sdfield
