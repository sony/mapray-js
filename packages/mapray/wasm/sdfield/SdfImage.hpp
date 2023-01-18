#pragma once

#include "utility.hpp"  // for get_aligned
#include "basic_types.hpp"  // for img_coord_elem_t, img_size_t, sdf_ext_t
#include <memory>   // for unique_ptr
#include <cstddef>  // for ptrdiff_t


namespace sdfield {


/** @brief SDF 画像データ
 *
 *  SDF (符号付き距離場) 画像を表現する。
 *
 *  実際のデータは WebGL テクスチャの入力画像として使用できる形式で記
 *  憶されている。
 */
class SdfImage {

  public:
    /** @brief 画素値の型
     */
    using pixel_t = unsigned char;


    /** @brief 座標の要素の型
     */
    using coord_t = img_coord_elem_t;


    /** @brief 画素の最大値
     */
    static constexpr pixel_t max_value = 255;


  public:
    /** @brief 初期化
     *
     *  @param cov_size  入力画像の寸法
     *  @param sdf_ext   出力 SDF 画像のための拡張画素数
     *
     *  画素値は初期化されない。
     */
    SdfImage( const img_size_t& cov_size,
              sdf_ext_t          sdf_ext )
        : size_{ calc_size( cov_size, sdf_ext ) },
          pitch_{ get_aligned<4>( size_[0] ) },
          data_{ new pixel_t[ pitch_ * size_[1] ] }
    {
        // std::vector と std::make_unique を使わない理由は CovImage
        // を参照
    }


    /** @brief 画像サイズ
     */
    img_size_t size() const { return size_; }


    /** @brief 画素列の先頭アドレスを取得
     *
     *  WebGL テクスチャの単色バイト列の入力データとなるポインタを返す。
     */
    const pixel_t* data() const { return data_.get(); }


    /** @brief 指定位置に画素を設定
     */
    void
    set_pixel( coord_t x,
               coord_t y,
               pixel_t pixel )
    {
        data_[ index( x, y ) ] = pixel;
    }


    /** @brief SDF 画像のサイズを計算
     *
     *  @param cov_size  入力画像の寸法
     *  @param sdf_ext   出力 SDF 画像のための拡張画素数
     */
    static constexpr img_size_t
    calc_size( const img_size_t& cov_size,
               sdf_ext_t          sdf_ext )
    {
        return { cast, cov_size[0] + 2*sdf_ext, cov_size[1] + 2*sdf_ext };
    }


  private:
    /** @brief 指定位置のインデックスを取得
     */
    std::ptrdiff_t
    index( coord_t x,
           coord_t y ) const
    {
        const auto y_webgl = static_cast<coord_t>( size_[1] - y - 1 );

        return x + y_webgl * pitch_;
    }


  private:
    const img_size_t size_;
    const std::ptrdiff_t pitch_;
    const std::unique_ptr<pixel_t[]> data_;

};


} // namespace sdfield
