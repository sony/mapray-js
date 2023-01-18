#pragma once

#include "config.hpp"   // for SUB_PIXEL_DIVS
#include <type_traits>  // for conditional_t
#include <cstdint>      // for uint_fast8_t, uint_fast32_t, uint_fast64_t


namespace sdfield {


/** @brief 単一画素の二値サブピクセルの集合
 */
class SubPixelSet {

    /** 二値サブピクセルの集合を表す型
     */
    using spx_bits_t = std::conditional_t<SUB_PIXEL_DIVS * SUB_PIXEL_DIVS <= 32,
                                          std::uint_fast32_t,
                                          std::uint_fast64_t>;

  public:
    /** @brief サブピクセルの座標型
     */
    using coord_t = std::uint_fast8_t;


  public:
    /** @brief 空インスタンスを生成
     *
     *  すべてのサブピクセルの値が 0 のインスタンスを生成する。
     */
    constexpr
    SubPixelSet() : spx_bits_{ 0 } {}


    /** @brief 指定座標のサブピクセル値を取得
     *
     *  @param sx  サブピクセルの X 座標
     *  @param sy  サブピクセルの Y 座標
     */
    constexpr bool
    bit_value( coord_t sx,
               coord_t sy ) const
    {
        return (spx_bits_ & get_mask( sx, sy )) != 0;
    }


    /** @brief 単一サブピクセルとの結合を取得
     *
     *  指定座標のサブピクセルに 1 に設定した集合を取得する。
     *
     *  @param sx  サブピクセルの X 座標
     *  @param sy  サブピクセルの Y 座標
     */
    constexpr SubPixelSet
    union_with( coord_t sx,
                coord_t sy ) const
    {
        return SubPixelSet{ spx_bits_ | get_mask( sx, sy ) };
    }


    /** @brief すべてのサブピクセルを反転した集合を取得
     */
    constexpr SubPixelSet
    operator~() const
    {
        return SubPixelSet{ ~spx_bits_ };
    }


  private:
    constexpr explicit
    SubPixelSet( spx_bits_t spx_bits )
        : spx_bits_{ spx_bits } {}


    constexpr spx_bits_t
    get_mask( coord_t sx,
              coord_t sy ) const
    {
        const auto shift = sx + sy * SUB_PIXEL_DIVS;
        return spx_bits_t{ 1u << shift };
    }


  private:
    spx_bits_t spx_bits_;

};


} // namespace sdfield
