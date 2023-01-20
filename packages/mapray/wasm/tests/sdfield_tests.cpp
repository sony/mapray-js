#include "../sdfield/Converter.hpp"
#include "../sdfield/CovImage.hpp"
#include "../sdfield/SdfImage.hpp"
#include "../sdfield/utility.hpp"  // for get_aligned, make_msb_only
#include "../sdfield/config.hpp"   // for DIST_LOWER, DIST_FACTOR
#include <boost/test/unit_test.hpp>
#include <memory>  // for unique_ptr, make_unique
#include <cmath>   // for floor(), ceil(), round(), exp2(), log2()
#include <cstddef> // for size_t, ptrdiff_t

using sdfield::Converter;
using sdfield::CovImage;
using sdfield::SdfImage;
using sdfield::get_aligned;
using sdfield::img_size_elem_t;


struct Env {};


/** @brief 距離を画素値に変換 (クランプなし)
 */
SdfImage::pixel_t
convert_dist_to_pixel( float dist )
{
    using sdfield::DIST_LOWER;
    using sdfield::DIST_FACTOR;

    const auto sample_value = (dist - DIST_LOWER) * DIST_FACTOR;

    const auto pixel_value = std::round( sample_value * SdfImage::max_value );

    return static_cast<SdfImage::pixel_t>( pixel_value );
}


/** @brief 被覆率画像の参照
 */
class CovImageRef {

    using img_size_t = Converter::img_size_t;
    using pixel_t    = CovImage::pixel_t;
    using coord_t    = CovImage::coord_t;


  public:
    CovImageRef( Converter&        conv,
                 const img_size_t& cov_size )
        : image_{ conv.get_write_position() },
          pitch_{ static_cast<std::ptrdiff_t>( cov_size[0] ) }
    {}


    /** @brief 指定位置に画素を設定
     */
    void
    set_pixel( coord_t x,
               coord_t y,
               pixel_t pixel )
    {
        image_[ index( x, y ) ] = pixel;
    }


  private:
    /** @brief 指定位置のインデックスを取得
     */
    std::ptrdiff_t
    index( coord_t x,
           coord_t y ) const
    {
        return x + y * pitch_;
    }


  private:
    pixel_t* const       image_;
    const std::ptrdiff_t pitch_;

};


/** @brief SDF 画像の参照
 */
class SdfImageRef {

    using img_size_t = Converter::img_size_t;
    using pixel_t    = SdfImage::pixel_t;
    using coord_t    = SdfImage::coord_t;
    using sdf_ext_t  = Converter::sdf_ext_t;

  public:
    SdfImageRef( Converter&            conv,
                 const img_size_t& cov_size,
                 sdf_ext_t          sdf_ext )
        : image_{ conv.build_sdf() },
          size_{ SdfImage::calc_size( cov_size, sdf_ext ) },
          pitch_{ get_aligned<4>( size_[0] ) }
    {}


    /** @brief 指定位置の画素を取得
     */
    pixel_t
    get_pixel( coord_t x,
               coord_t y ) const
    {
        return image_[ index( x, y ) ];
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
    const pixel_t* const image_;
    const img_size_t      size_;
    const std::ptrdiff_t pitch_;

};


BOOST_FIXTURE_TEST_SUITE( sdfield_suite, Env )


BOOST_AUTO_TEST_CASE( rect_size )
{
    using sdfield::rect_size;
    using sdfield::cast;

    rect_size<int, 10> size_0;

    constexpr rect_size<int, 2> size_a { 5, 6 };

    constexpr unsigned char b0 = 3;
    constexpr long long     b1 = 5;
    constexpr rect_size<long long, 2> size_b { b0, b1 };

    constexpr short         c0 = 3;
    constexpr double        c1 = 5;
    constexpr rect_size<unsigned char, 2> size_c { cast, c0, c1 };

}


BOOST_AUTO_TEST_CASE( make_msb_only )
{
    using sdfield::make_msb_only;
    using std::log2;
    using std::floor;
    using std::round;
    using uint_t = unsigned int;

    BOOST_CHECK( make_msb_only( 0u ) == 0u );

    for ( uint_t i = 0; i < 1000; ++i ) {
        const auto n = static_cast<uint_t>( round( exp2( floor( log2( i ) ) ) ) );
        const auto m = make_msb_only( i );
        BOOST_CHECK( n == m );
    }
}


BOOST_AUTO_TEST_CASE( make_bit_ceil )
{
    using sdfield::make_bit_ceil;
    using std::log2;
    using std::ceil;
    using std::round;
    using uint_t = unsigned int;

    BOOST_CHECK( make_bit_ceil( 0u ) == 0u );

    for ( uint_t i = 0; i < 1000; ++i ) {
        const auto n = static_cast<uint_t>( round( exp2( ceil( log2( i ) ) ) ) );
        const auto m = make_bit_ceil( i );
        BOOST_CHECK( n == m );
    }
}


/**
 * 構築して、何もせずに破壊する。
 */
BOOST_AUTO_TEST_CASE( conv_ctor_dtor )
{
    constexpr Converter::img_size_t img_size { sdfield::cast, 1, 1 };
    constexpr Converter::sdf_ext_t   sdf_ext { 1 };

    BOOST_CHECK_NO_THROW( Converter( img_size, sdf_ext ) );
}


// テスト conv_white_image から呼び出される
void
run_conv_white_image( const Converter::img_size_t& isize,
                      Converter::sdf_ext_t       sdf_ext )
{
    Converter conv { isize, sdf_ext };

    // 白画素 (max_value) を書き込む
    {
        using coord_t = CovImage::coord_t;

        CovImageRef cov_image_ref { conv, isize };

        for ( coord_t y = 0; y < static_cast<coord_t>( isize[1] ); ++y ) {
            for ( coord_t x = 0; x < static_cast<coord_t>( isize[0] ); ++x ) {
                cov_image_ref.set_pixel( x, y, CovImage::max_value );
            }
        }
    }

    // 出力画素 (最小距離) を確認
    {
        // SDF 変換
        const SdfImageRef sdf_image_ref { conv, isize, sdf_ext };

        // この距離以下になるはず
        const auto px_dist = convert_dist_to_pixel( 0 );

        bool result = true;

        using coord_t = CovImage::coord_t;

        for ( coord_t cy = 0; cy < static_cast<coord_t>( isize[1] ); ++cy ) {
            for ( coord_t cx = 0; cx < static_cast<coord_t>( isize[0] ); ++cx ) {

                const auto sx = static_cast<SdfImage::coord_t>( cx + sdf_ext );
                const auto sy = static_cast<SdfImage::coord_t>( cy + sdf_ext );

                const auto pixel = sdf_image_ref.get_pixel( sx, sy );

                if ( pixel > px_dist ) {
                    result = false;
                }
            }
        }

        BOOST_CHECK( result );
    }
}


/** @brief 白画像
 */
BOOST_AUTO_TEST_CASE( conv_white_image )
{
    using sdfield::cast;

    constexpr Converter::img_size_t size_table[] {
        { cast,  1,  1 },
        { cast, 10,  1 },
        { cast,  1, 10 },
        { cast, 10, 10 },
        { cast, 16, 16 },
    };

    for ( Converter::sdf_ext_t sdf_ext = 0; sdf_ext <= 5; ++sdf_ext ) {
        for ( const auto& size : size_table ) {
            run_conv_white_image( size, sdf_ext );
        }
    }
}


void
run_conv_black_image( const Converter::img_size_t& isize,
                      Converter::sdf_ext_t       sdf_ext )
{
    Converter conv { isize, sdf_ext };

    // 黒画素 (0) を書き込む
    {
        using coord_t = CovImage::coord_t;

        CovImageRef cov_image_ref { conv, isize };

        for ( coord_t y = 0; y < static_cast<coord_t>( isize[1] ); ++y ) {
            for ( coord_t x = 0; x < static_cast<coord_t>( isize[0] ); ++x ) {
                cov_image_ref.set_pixel( x, y, 0 );
            }
        }
    }

    // 出力画素 (最小距離) を確認
    {
        // SDF 変換
        const SdfImageRef sdf_image_ref { conv, isize, sdf_ext };

        // この距離以上になるはず
        const auto px_dist = SdfImage::max_value;

        bool result = true;

        using coord_t = CovImage::coord_t;

        for ( coord_t cy = 0; cy < static_cast<coord_t>( isize[1] ); ++cy ) {
            for ( coord_t cx = 0; cx < static_cast<coord_t>( isize[0] ); ++cx ) {

                const auto sx = static_cast<SdfImage::coord_t>( cx + sdf_ext );
                const auto sy = static_cast<SdfImage::coord_t>( cy + sdf_ext );

                const auto pixel = sdf_image_ref.get_pixel( sx, sy );

                if ( pixel < px_dist ) {
                    result = false;
                }
            }
        }

        BOOST_CHECK( result );
    }
}


/** @brief 黒画像
 */
BOOST_AUTO_TEST_CASE( conv_black_image )
{
    using sdfield::cast;

    constexpr Converter::img_size_t size_table[] {
        { cast,  1,  1 },
        { cast, 10,  1 },
        { cast,  1, 10 },
        { cast, 10, 10 },
        { cast, 16, 16 },
    };

    for ( Converter::sdf_ext_t sdf_ext = 0; sdf_ext <= 5; ++sdf_ext ) {
        for ( const auto& size : size_table ) {
            run_conv_black_image( size, sdf_ext );
        }
    }
}


void
run_conv_slash_image( img_size_elem_t        isize,
                      Converter::sdf_ext_t sdf_ext )
{
    const Converter::img_size_t cov_size { isize, isize };

    Converter conv { cov_size, sdf_ext };

    // 画像を書き込む
    {
        using coord_t = CovImage::coord_t;

        CovImageRef cov_image_ref { conv, cov_size };

        for ( coord_t y = 0; y < static_cast<coord_t>( isize ); ++y ) {
            for ( coord_t x = 0; x < static_cast<coord_t>( isize ); ++x ) {
                CovImage::pixel_t pixel = 0;

                if ( x == y ) {
                    pixel = CovImage::max_value / 2;
                }
                else if ( x > y ) {
                    pixel = CovImage::max_value;
                }

                cov_image_ref.set_pixel( x, y, pixel );
            }
        }
    }

    // 出力画素 (最小距離) を確認
    {
        // SDF 変換
        BOOST_CHECK_NO_THROW( conv.build_sdf() );
    }
}


BOOST_AUTO_TEST_CASE( conv_slash_image )
{
    for ( Converter::sdf_ext_t sdf_ext = 0; sdf_ext <= 5; ++sdf_ext ) {
        for ( img_size_elem_t size = 1; size < 20; ++size ) {
            run_conv_slash_image( size, sdf_ext );
        }
    }
}


BOOST_AUTO_TEST_SUITE_END()
