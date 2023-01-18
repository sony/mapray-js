#include "Grid.hpp"
#include "Binarizer.hpp"
#include "SdfImage.hpp"
#include <algorithm>   // for clamp()
#include <cmath>       // for sqrt(), round()
#include <cassert>


namespace sdfield {


Grid::Grid( const CovImage& cov_image,
            SdfImage&       sdf_image,
            sdf_ext_t         sdf_ext )
    : size_{ SdfImage::calc_size( cov_image.size(), sdf_ext ) },
      actual_size_{ cast,
                    size_[0] + 2 * dummy_ext,
                    size_[1] + 2 * dummy_ext },
      sdf_ext_{ sdf_ext },
      data_{ new Node[ actual_size_[0] * actual_size_[1] ] }
{
    // std::vector ではなく動的配列を使用する理由は CovImage.hpp
    // のコメントを参照

    // ノードを初期値で埋める
    setup_outer_nodes();
    setup_inner_nodes( cov_image );

    // 近隣ノードを更新
    for ( const auto& [x, y] : update_around_fulcov( cov_image ) ) {
        update_around_gencov( cov_image, x, y );
    }

    // ラスタスキャンにより更新
    scan_with_8SSEDT_method( sdf_image );
}


/** すべての外側のノードを初期化
 *
 *  cov_image の外側と最外周のダミーノードを初期化する。
 *
 *  表面のノードは距離 ∞、裏面のノードは距離 0 とする。
 *
 *  裏面は cov_image の外が図形で埋まっていると考えて零ベクトルとする。
 */
void
Grid::setup_outer_nodes()
{
    // ノード書き込む関数
    const auto put_ext_node = [this]( coord_t x,
                                      coord_t y ) {
        const Node node {
            // ノード (cx, cy) の中心から inf_point までのベクトル
            {
                inf_point.dx - 0.5f - static_cast<vec_elem_t>( x ),
                inf_point.dy - 0.5f - static_cast<vec_elem_t>( y ),
            },
            // 裏面は零ベクトル
            zero_vec
        };
        this->put_node( x, y, node );
    };

    // 水平方向
    {
        // 上側の矩形
        const auto x_lower = static_cast<coord_t>( -dummy_ext );
        const auto y_lower = static_cast<coord_t>( -dummy_ext );
        const auto x_upper = static_cast<coord_t>( size_[0] + dummy_ext );
        const auto y_upper = static_cast<coord_t>( sdf_ext_ );

        // 下側の矩形への変換
        const auto y_offset = static_cast<offset_t>( size_[1] + dummy_ext - sdf_ext_ );

        // 上下の矩形のノードをすべて設定
        for ( auto y = y_lower; y < y_upper; ++y ) {
            for ( auto x = x_lower; x < x_upper; ++x ) {
                put_ext_node( x, y            );  // 上側
                put_ext_node( x, y + y_offset );  // 下側
            }
        }
    }

    // 垂直方向
    {
        // 左側の矩形
        const auto x_lower = static_cast<coord_t>( -dummy_ext );
        const auto y_lower = static_cast<coord_t>( sdf_ext_ );
        const auto x_upper = static_cast<coord_t>( sdf_ext_ );
        const auto y_upper = static_cast<coord_t>( size_[1] - sdf_ext_ );

        // 右側の矩形への変換
        const auto x_offset = static_cast<offset_t>( size_[0] + dummy_ext - sdf_ext_ );

        // 左右の矩形のノードをすべて設定
        for ( auto y = y_lower; y < y_upper; ++y ) {
            for ( auto x = x_lower; x < x_upper; ++x ) {
                put_ext_node( x,            y );  // 左側
                put_ext_node( x + x_offset, y );  // 右側
            }
        }
    }
}


/** すべての内側のノードを初期化
 *
 *  fulcov のノードは距離 0、それ以外は基本的に距離 ∞ に初期化する。
 *
 *  ただし裏面の最外周のノード (fulcov 画素以外) は外周に向かう 1/2 の
 *  長さのベクトルが設定される。
 */
void
Grid::setup_inner_nodes( const CovImage& cov_image )
{
    // cov_image の内容に基づきノードを設定
    {
        constexpr auto    one = CovImage::max_value;
        constexpr auto thresh = fulcov_pixel_value_thresh;

        const auto cov_size = cov_image.size();

        // CovImage 座標の範囲
        const auto cx_lower = static_cast<CovImage::coord_t>( 0 );
        const auto cy_lower = static_cast<CovImage::coord_t>( 0 );
        const auto cx_upper = static_cast<CovImage::coord_t>( cov_size[0] );
        const auto cy_upper = static_cast<CovImage::coord_t>( cov_size[1] );

        for ( auto cy = cy_lower; cy < cy_upper; ++cy ) {
            for ( auto cx = cx_lower; cx < cx_upper; ++cx ) {
                const auto cov_0 = cov_image.get_pixel( cx, cy );  // 表の被覆率
                const auto cov_1 = one - cov_0;                    // 裏の被覆率

                // 表と裏の両方が距離 0 になることはない
                assert( cov_0 < thresh || cov_1 < thresh );

                // ノード (cx, cy) の中心から inf_point までのベクトル
                const Vec inf_vec {
                    inf_point.dx - 0.5f - static_cast<vec_elem_t>( cx ),
                    inf_point.dy - 0.5f - static_cast<vec_elem_t>( cy ),
                };

                // fulcov 画素は距離 0、それ以外は距離 ∞ で初期化
                const Node new_node {
                    (cov_0 >= thresh) ? zero_vec : inf_vec,  // 表の最小距離 (候補)
                    (cov_1 >= thresh) ? zero_vec : inf_vec   // 裏の最小距離 (候補)
                };

                // CovImage 座標から Grid 座標への変換オフセット
                const auto offset_x = static_cast<offset_t>( sdf_ext_ );
                const auto offset_y = static_cast<offset_t>( sdf_ext_ );

                // CovImage 座標を Grid 座標へ変換
                const auto gx = static_cast<coord_t>( cx + offset_x );
                const auto gy = static_cast<coord_t>( cy + offset_y );

                // ノードを設定
                put_node( gx, gy, new_node );
            }
        }
    }

    // 裏面は画像の外が図形で埋まっていると考えて、最外周はその図形ま
    // での最短ベクトルに更新する。
    {
        const auto x_lower = static_cast<coord_t>( sdf_ext_ );
        const auto y_lower = static_cast<coord_t>( sdf_ext_ );
        const auto x_upper = static_cast<coord_t>( size_[0] - sdf_ext_ );
        const auto y_upper = static_cast<coord_t>( size_[1] - sdf_ext_ );

        // 水平方向
        for ( auto x = x_lower; x < x_upper; ++x ) {
            // 上辺
            constexpr Vec va_cand = { 0, -0.5 };
            Vec& va = ref_node( x, y_lower ).v1;

            assert( va.is_zero() || va.dist_sq() >= va_cand.dist_sq() );

            if ( !va.is_zero() ) {
                va = va_cand;
            }

            // 下辺
            constexpr Vec vb_cand = { 0, +0.5 };
            Vec& vb = ref_node( x, y_upper - 1 ).v1;

            assert( vb.is_zero() || vb.dist_sq() >= vb_cand.dist_sq() );

            if ( !vb.is_zero() ) {
                vb = vb_cand;
            }
        }

        // 垂直方向
        for ( auto y = static_cast<coord_t>( y_lower + 1 ); y < y_upper - 1; ++y ) {
            // 左辺
            constexpr Vec va_cand = { -0.5, 0 };
            Vec& va = ref_node( x_lower, y ).v1;

            assert( va.is_zero() || va.dist_sq() >= va_cand.dist_sq() );

            if ( va_cand.dist_sq() < va.dist_sq() ) {
                va = va_cand;
            }

            // 右辺
            constexpr Vec vb_cand = { +0.5, 0 };
            Vec& vb = ref_node( x_upper - 1, y ).v1;

            assert( vb.is_zero() || vb.dist_sq() >= vb_cand.dist_sq() );

            if ( vb_cand.dist_sq() < vb.dist_sq() ) {
                vb = vb_cand;
            }
        }
    }
}


/** すべての fulcov 画素の周りを更新
 */
std::vector<Grid::packed_coords_t>
Grid::update_around_fulcov( const CovImage& cov_image )
{
    constexpr auto    one = CovImage::max_value;
    constexpr auto thresh = fulcov_pixel_value_thresh;

    const auto cov_size = cov_image.size();

    // CovImage 座標の範囲
    const auto cx_lower = static_cast<CovImage::coord_t>( 0 );
    const auto cy_lower = static_cast<CovImage::coord_t>( 0 );
    const auto cx_upper = static_cast<CovImage::coord_t>( cov_size[0] );
    const auto cy_upper = static_cast<CovImage::coord_t>( cov_size[1] );

    std::vector<packed_coords_t> coords;

    for ( auto cy = cy_lower; cy < cy_upper; ++cy ) {
        for ( auto cx = cx_lower; cx < cx_upper; ++cx ) {
            const auto cov_0 = cov_image.get_pixel( cx, cy );  // 表の被覆率
            const auto cov_1 = one - cov_0;                    // 裏の被覆率

            // CovImage 座標から Grid 座標への変換オフセット
            const auto offset_x = static_cast<offset_t>( sdf_ext_ );
            const auto offset_y = static_cast<offset_t>( sdf_ext_ );

            // CovImage 座標を Grid 座標へ変換
            const auto gx = static_cast<coord_t>( cx + offset_x );
            const auto gy = static_cast<coord_t>( cy + offset_y );

            if ( cov_0 >= thresh ) {
                // 表が fulcov 画素
                update_adjacent_nodes<&Node::v0>( gx, gy );
            }
            else if ( cov_1 >= thresh ) {
                // 裏が fulcov 画素
                update_adjacent_nodes<&Node::v1>( gx, gy );
            }
            else {
                // 表も裏も fulcov 画素ではない。
                // このケースは全体の画素数と比較して少ない。
                // 効率のため、座標だけを記録して後で処理を行う。
                using elem_t = packed_coords_t::value_type;

                coords.push_back( { static_cast<elem_t>( gx ),
                                    static_cast<elem_t>( gy ) } );
            }
        }
    }

    return coords;
}


/** 単一の gencov 画素の周りのノードを更新
 */
void
Grid::update_around_gencov( const CovImage& cov_image,
                            coord_t         gx,
                            coord_t         gy )
{
    // Grid 座標から CovImage 座標への変換オフセット
    const auto offset_x = static_cast<offset_t>( -sdf_ext_ );
    const auto offset_y = static_cast<offset_t>( -sdf_ext_ );

    // Grid 座標を CovImage 座標へ変換
    const auto cx = static_cast<CovImage::coord_t>( gx + offset_x );
    const auto cy = static_cast<CovImage::coord_t>( gy + offset_y );

    // 被覆率を二値化
    const Binarizer binarizer { cov_image, cx, cy };

    // 表面の周囲を更新
    for ( const auto& part : binarizer.pixel_parts( false ) ) {
        update_around_gencov_part<&Node::v0>( gx, gy, part );
    }

    // 裏面の周囲を更新
    for ( const auto& part : binarizer.pixel_parts( true ) ) {
        update_around_gencov_part<&Node::v1>( gx, gy, part );
    }
}


/** @brief すべてのノードのベクトルを更新
 *
 *  Danielsson (1980), Ragnemalm (1993) の手法をベースとした
 *  ラスタスキャンを行う。
 *
 *  8SEDT, 8SSEDT (8-neighborhood Sequential (Signed) Euclidean
 *  Distance Transform) とも呼ばれる。
 *
 *  この手法は厳密解ではない。アルゴリズムの分析は以下を参照のこと。
 *
 *  2D Euclidean distance transform algorithms: a comparative survey
 *  <https://core.ac.uk/download/pdf/37522354.pdf>
 *
 *  @param [in,out] sdf_image  格納先の SDF 画像
 */
void
Grid::scan_with_8SSEDT_method( SdfImage& sdf_image )
{
    assert( sdf_image.size()[0] == size_[0] &&
            sdf_image.size()[1] == size_[1] );

    const auto xsize = static_cast<coord_t>( size_[0] );
    const auto ysize = static_cast<coord_t>( size_[1] );

    // 上から下へのパス
    for ( coord_t y = 0; y < ysize; ++y ) {

        // 左から右にスキャン
        for ( coord_t x = 0; x < xsize; ++x ) {
            auto& node = ref_node( x, y );
            compare_and_update_node( node, x, y, -1, 0 );
            for ( offset_t ox = -1; ox <= +1; ++ox ) {
                compare_and_update_node( node, x, y, ox, -1 );
            }
        }

        // 右から左にスキャン
        for ( coord_t x = xsize - 1; x >= 0; --x ) {
            auto& node = ref_node( x, y );
            compare_and_update_node( node, x, y, +1, 0 );
        }
    }

    // 下から上へのパス
    for ( coord_t y = ysize - 1; y >= 0; --y ) {

        // 右から左にスキャン
        for ( coord_t x = xsize - 1; x >= 0; --x ) {
            auto& node = ref_node( x, y );
            compare_and_update_node( node, x, y, +1, 0 );
            for ( offset_t ox = -1; ox <= +1; ++ox ) {
                compare_and_update_node( node, x, y, ox, +1 );
            }
        }

        // 左から右にスキャン
        for ( coord_t x = 0; x < xsize; ++x ) {
            auto& node = ref_node( x, y );
            compare_and_update_node( node, x, y, -1, 0 );

            // ノード (x, y) は確定したので、結果を sdf_image に書き込む

            assert( node.v0.is_zero() || node.v1.is_zero() );  // 少なくとも一方は距離 0

            using std::sqrt;
            using std::round;
            using std::clamp;

            // 表の距離と裏の距離
            const auto d0 = sqrt( static_cast<float>( node.v0.dist_sq() ) );
            const auto d1 = sqrt( static_cast<float>( node.v1.dist_sq() ) );

            // 符号付き距離
            const auto d = d0 - d1;

            // テクスチャのサンプル値 (スケール、クランプ済み)
            const auto s = clamp<float>( (d - DIST_LOWER) * DIST_FACTOR * SdfImage::max_value,
                                         0, SdfImage::max_value );

            // sdf_image に画素値を設定
            sdf_image.set_pixel( x, y, static_cast<SdfImage::pixel_t>( round( s ) ) );
        }
    }
}


} // namespace sdfield
