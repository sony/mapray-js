#pragma once

#include "CovImage.hpp"
#include "SdfImage.hpp"
#include "basic_types.hpp"  // for img_size_t, sdf_ext_t


namespace sdfield {


/** @brief 変換処理の管理
 *
 *  Converter インスタンスを構築した後、クライアントは
 *  get_write_position() によりアドレスを得て、そこに画像データを書き
 *  込む必要がある。
 *
 *  次にその画像を build_sdf() により SDF 画像に変換する。戻り値に変換
 *  結果のデータが書き込まれる。
 *
 *  変換結果はデストラクタが呼び出されるまで参照することができる。
 *
 *  デストラクタはいつでも呼び出すことができる。
 */
class Converter {

  public:
    using img_size_t = sdfield::img_size_t;
    using  sdf_ext_t = sdfield::sdf_ext_t;


  public:
    /** @brief 初期化
     *
     *  実質 converter_create() の実装である。
     *
     *  なお converter_destroy() の実質の実装は ~Converter() である。
     */
    Converter( const img_size_t& cov_size,
               sdf_ext_t          sdf_ext );


    // converter_get_write_position() の実装
    CovImage::pixel_t*
    get_write_position() { return cov_image_.data(); }


    // converter_build_sdf() の実装
    const SdfImage::pixel_t*
    build_sdf();


  private:
    CovImage cov_image_;
    SdfImage sdf_image_;
    sdf_ext_t  sdf_ext_;

};


} // namespace sdfield
