#pragma once

#include "basic_types.hpp"  // for img_coord_elem_t, img_size_t
#include <memory>   // for unique_ptr
#include <cstddef>  // for ptrdiff_t


namespace sdfield {


/** @brief 被覆率画像データ
 *
 *  入力の被覆画像を表現する。
 */
class CovImage {

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
     *  サイズが size の画像を生成する。
     *
     *  画素値は初期化されない。
     */
    explicit CovImage( const img_size_t& size )
        : size_{ size },
          data_{ new pixel_t[ size[0] * size[1] ] }
    {
        // 画素の初期化は必要なく、さらに速度が重要なため
        // std::vector ではなく動的配列を使用する。
        //
        // また、std::make_unique<pixel_t[]>() の呼び出しは値初期化さ
        // れるので使わない。
    }


    /** @brief 画像サイズ
     */
    img_size_t size() const { return size_; }


    /** @brief 画素列の先頭アドレスを取得
     */
    pixel_t* data() { return data_.get(); }


    /** @brief 指定位置に画素を設定
     */
    void
    set_pixel( coord_t x,
               coord_t y,
               pixel_t pixel )
    {
        data_[ index( x, y ) ] = pixel;
    }


    /** @brief 指定位置の画素を取得
     */
    pixel_t
    get_pixel( coord_t x,
               coord_t y ) const
    {
        return data_[ index( x, y ) ];
    }


  private:
    /** @brief 指定位置のインデックスを取得
     */
    std::ptrdiff_t
    index( coord_t x,
           coord_t y ) const
    {
        const auto pitch = static_cast<std::ptrdiff_t>( size_[0] );
        return x + y * pitch;
    }


  private:
    const img_size_t size_;
    const std::unique_ptr<pixel_t[]> data_;

};


} // namespace sdfield
