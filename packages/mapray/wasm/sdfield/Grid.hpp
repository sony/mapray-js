#pragma once

#include "Binarizer.hpp"    // for PixelPart
#include "CovImage.hpp"
#include "basic_types.hpp"  // for img_coord_elem_t, img_size_t
#include "config.hpp"       // for SUB_PIXEL_DIVS
#include <vector>
#include <array>
#include <memory>   // for unique_ptr
#include <cstdint>  // for uint16_t, int_least16_t
#include <cstddef>  // for size_t, ptrdiff_t


namespace sdfield {

class SdfImage;


/** @brief グリッド
 *
 *  実装に使われている用語
 *
 *  - fulcov: すべてが図形で覆われていると見なす (被覆率がほぼ
 *            1.0) 画素
 *
 *  - gencov: 一部が図形で覆われていると見なし (被覆率が 0.0
 *            より大きい) fulcov でない画素
 */
class Grid {

    using coord_t = img_coord_elem_t;
    using grid_size_t = img_size_t;

    /** @brief グリッド座標のオフセットの型
     */
    using offset_t = std::int_least16_t;


    /** @brief 最外周のダミー幅を表す型
     */
    using dummy_ext_t = std::int_least16_t;


    /**
     * グリッドの要素
     */
    struct Node {

        /** @brief 表のベクトル
         */
        Vec v0;


        /** @brief 裏のベクトル
         */
        Vec v1;

    };


    /** @brief 零ベクトル
     */
    static constexpr Vec zero_vec { 0, 0 };


    /** @brief 無限遠点
     *
     *  ダミー以外の Node の中心点から、この無限遠点までの距離は、その
     *  中心点からダミーを除く Grid 範囲のどの点までの距離より大きい。
     */
    static constexpr Vec inf_point {
        -static_cast<vec_elem_t>( MAX_SDF_WIDTH  ),
        -static_cast<vec_elem_t>( MAX_SDF_HEIGHT )
    };


    /** @brief 圧縮保存用の座標の型
     */
    using packed_coords_t = std::array<std::uint16_t, 2>;


    /** fulcov 画素の被覆率の閾値
     *
     *  この値以上の被覆率の画素は fulcov 画素とする。
     */
    static constexpr double fulcov_value_thresh { 1.0 - 0.5 / (SUB_PIXEL_DIVS * SUB_PIXEL_DIVS) };


    /** fulcov_value_thresh の画素値版
     */
    static constexpr auto fulcov_pixel_value_thresh =
        static_cast<CovImage::pixel_t>( CovImage::max_value * fulcov_value_thresh + 0.5 );


    /** @brief 最外周のダミー幅
     *
     *  この幅はグリッドのサイズに含まれないが、範囲外の座標によりアク
     *  セスすることができる。
     */
    static constexpr dummy_ext_t dummy_ext = 1;


  public:
    /** @brief 初期化
     *
     *  @param          cov_image  入力画像
     *  @param [in,out] sdf_image  出力画像
     *  @param          sdf_ext    拡張画素数
     */
    explicit Grid( const CovImage& cov_image,
                   SdfImage&       sdf_image,
                   sdf_ext_t         sdf_ext );


    /** @brief SDF 画像を取得
     *
     *  sdf_image に SDF 画像を取得する。
     *
     *  @param [in,out] sdf_image  取得先
     */
    void get_sdf_to( SdfImage& sdf_image ) const;


  private:
    void setup_outer_nodes();
    void setup_inner_nodes( const CovImage& cov_image );
    std::vector<packed_coords_t>
    update_around_fulcov( const CovImage& cov_image );
    void update_around_gencov( const CovImage& cov_image, coord_t gx, coord_t gy );
    void scan_with_8SSEDT_method( SdfImage& sdf_image );


    /** @brief 指定位置にノードを設定
     */
    void
    put_node( coord_t x,
              coord_t y,
              const Node& node )
    {
        ref_node( x, y ) = node;
    }


    /** @brief 指定位置のノードを参照 (const)
     */
    const Node&
    ref_node( coord_t x,
              coord_t y ) const
    {
        const auto pitch = static_cast<std::ptrdiff_t>( actual_size_[0] );

        const auto actual_x = x + 1;
        const auto actual_y = y + 1;
        const auto index = actual_x + actual_y * pitch;

        return data_[index];
    }


    /** @brief 指定位置のノードを参照
     */
    Node&
    ref_node( coord_t x,
              coord_t y )
    {
        const auto& grid = *this;
        return const_cast<Node&>( grid.ref_node( x, y ) );
    }


    /** @brief fulcov 画素に対する隣接ノードのベクトルを更新
     *
     *  @tparam vec_ptr - Node のメンバー &Node::v0 または &Node::v1
     *
     *  この関数は update_around_fulcov() から呼び出される。
     */
    template<Vec Node::* vec_ptr>
    void update_adjacent_nodes( coord_t x,
                                coord_t y )
    {
        // 上段
        for ( offset_t ox = -1; ox <= 1; ++ox ) {
            const offset_t oy = -1;
            const Vec cand_vec { -0.5f * static_cast<vec_elem_t>( ox ), +0.5f };
            auto& node_vec = ref_node( x + ox, y + oy ).*vec_ptr;
            if ( cand_vec.dist_sq() < node_vec.dist_sq() ) {
                node_vec = cand_vec;
            }
        }

        // 中段 (中心は除く)
        for ( offset_t i = -1; i <= 1; i += 2 ) {
            const offset_t oy = 0;
            const Vec cand_vec { -0.5f * static_cast<vec_elem_t>( i ), 0 };
            auto& node_vec = ref_node( x + i, y + oy ).*vec_ptr;
            if ( cand_vec.dist_sq() < node_vec.dist_sq() ) {
                node_vec = cand_vec;
            }
        }

        // 下段
        for ( offset_t i = -1; i <= 1; ++i ) {
            const offset_t oy = +1;
            const Vec cand_vec { -0.5f * static_cast<vec_elem_t>( i ), -0.5f };
            auto& node_vec = ref_node( x + i, y + oy ).*vec_ptr;
            if ( cand_vec.dist_sq() < node_vec.dist_sq() ) {
                node_vec = cand_vec;
            }
        }
    }


    /** @brief 部分画素に対する隣接 (自己を含む) ノードのベクトルを更新
     */
    template<Vec Node::* vec_ptr>
    void update_around_gencov_part( coord_t x,
                                    coord_t y,
                                    const Binarizer::PixelPart& part )
    {
        // ox, oy は隣接画素の (画素 (x, y) からの) 相対座標

        for ( offset_t oy = -1; oy <= 1; ++oy ) {
            for ( offset_t ox = -1; ox <= 1; ++ox ) {
                using std::clamp;

                // 対象とする画素の中心を PixelPart の座標系に変換
                const Vec center {
                    static_cast<vec_elem_t>( ox ),
                    static_cast<vec_elem_t>( oy )
                };

                // 更新候補のベクトル
                const Vec cand_vec {
                    clamp( center.dx, part.lower.dx, part.upper.dx ) - center.dx,
                    clamp( center.dy, part.lower.dy, part.upper.dy ) - center.dy
                };

                // 隣接画素ノードのベクトル
                auto& node_vec = ref_node( x + ox, y + oy ).*vec_ptr;

                if ( cand_vec.dist_sq() < node_vec.dist_sq() ) {
                    node_vec = cand_vec;
                }
            }
        }
    }


    /** @brief ノードを比較して必要なら更新
     *
     *  @param [in,out] u_node  更新対象のノード
     *  @param          x       u_node の X 座標
     *  @param          y       u_node の Y 座標
     *  @param          ox      比較対象のノードの u_node からの X 座標オフセット
     *  @param          oy      比較対象のノードの u_node からの Y 座標オフセット
     */
    void
    compare_and_update_node( Node& u_node,
                             coord_t  x,
                             coord_t  y,
                             offset_t ox,
                             offset_t oy )
    {
        // 比較対象のノード
        const auto& o_node = ref_node( x + ox, y + oy );

        // 表のベクトルを更新
        const Vec v0_cand {
            o_node.v0.dx + ox,
            o_node.v0.dy + oy
        };

        if ( v0_cand.dist_sq() < u_node.v0.dist_sq() ) {
            u_node.v0 = v0_cand;
        }

        // 裏のベクトルを更新
        const Vec v1_cand {
            o_node.v1.dx + ox,
            o_node.v1.dy + oy
        };

        if ( v1_cand.dist_sq() < u_node.v1.dist_sq() ) {
            u_node.v1 = v1_cand;
        }
    }


  private:
    const grid_size_t size_;
    const grid_size_t actual_size_;
    const sdf_ext_t   sdf_ext_;
    const std::unique_ptr<Node[]> data_;

};


} // namespace sdfield
