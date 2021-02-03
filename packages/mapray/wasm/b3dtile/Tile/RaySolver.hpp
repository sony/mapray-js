#pragma once

#include "TriNode.hpp"
#include "Analyzer.hpp"
#include "Base.hpp"
#include "../Rect.hpp"
#include "../Vector.hpp"
#include "../HashSet.hpp"
#include <vector>
#include <array>
#include <algorithm>  // for sort()
#include <limits>
#include <cmath>      // for min(), max()


namespace b3dtile {

/** @brief Tile::find_ray_distance() の処理
 */
class Tile::RaySolver : Base {

    using ray_elem_t = double;
    using  ray_vec_t = Vector<ray_elem_t, DIM>;

    /** @brief インデックスが登録済みのときの戻り値
     *
     *  @see check_and_register_tblock_index()
     */
    static constexpr auto ALREADY_REGISTERED_TBLOCK_INDEX = static_cast<size_t>( -1 );


  public:
    /** @brief 初期化
     *
     *  adata は参照のみを保持すること注意すること。
     */
    RaySolver( const Analyzer&                adata,
               const coords_t<double, DIM>& ray_pos,
               const coords_t<double, DIM>& ray_dir,
               double                         limit,
               const rect_t&                  lrect )
        : adata_{ adata },
          ray_pos_{ ALCS_TO_U16<ray_elem_t> * ray_vec_t{ ray_pos } },
          ray_dir_{ ALCS_TO_U16<ray_elem_t> * ray_vec_t{ ray_dir } },
          limit_{ limit },
          lrect_{ lrect },
          lrect_lower_dist_{ std::numeric_limits<ray_elem_t>::lowest() },
          lrect_upper_dist_{ std::numeric_limits<ray_elem_t>::max()    }
    {
        setup_lrect_distance_bounds( ray_pos, ray_dir, lrect );
    }


    /** @brief 処理を実行
     */
    void
    run()
    {
        ray_elem_t distance;

        if ( adata_.root_node ) {
            // 三角形ツリーあり
            const TriNode root_node{ adata_.root_node };

            if ( adata_.bindex_size == sizeof( uint16_t ) )
                distance = find_ray_distance_for_branch<uint16_t>( root_node, TILE_RECT );
            else
                distance = find_ray_distance_for_branch<uint32_t>( root_node, TILE_RECT );
        }
        else {
            // 三角形ツリーなし
            distance = find_ray_distance_for_notree();
        }

        ray_result_( static_cast<wasm_f64_t>( distance ),
                     static_cast<wasm_i32_t>( 0 ) );
    }


  private:
    /** @brief lrect_*_dist_ を初期化
     *
     *  アルゴリズムは find_ray_distance_for_rect() を参照のこと。
     */
    void
    setup_lrect_distance_bounds( const ray_vec_t& ray_pos,
                                 const ray_vec_t& ray_dir,
                                 const rect_t&      lrect )
    {
        for ( size_t i = 0; i < 3; ++i ) {
            const ray_elem_t rect_lower_i = lrect.lower[i];
            const ray_elem_t rect_upper_i = lrect.upper[i];

            const auto& rni = ray_dir[i];  // r . n_i

            if ( rni != 0 ) {
                // tA = ((P_0 - q) . n_i) / (r . n_i)
                // tB = ((P_1 - q) . n_i) / (r . n_i)
                const auto tA = (rect_lower_i - ray_pos[i]) / rni;
                const auto tB = (rect_upper_i - ray_pos[i]) / rni;

                const auto t0 = (rni > 0) ? tA : tB;
                const auto t1 = (rni > 0) ? tB : tA;
                assert( t0 < t1 );

                lrect_lower_dist_ = std::max( t0, lrect_lower_dist_ );
                lrect_upper_dist_ = std::min( t1, lrect_upper_dist_ );

                assert( lrect_lower_dist_ < lrect_upper_dist_ );
            }
            else { // rni == 0
                assert( (ray_pos[i] - rect_lower_i >=  0) &&
                        (ray_pos[i] - rect_upper_i <   0) );
            }
        }
    }


    /** @brief タイル全体の三角形から探す
     */
    ray_elem_t
    find_ray_distance_for_notree() const
    {
        const size_t b_tid = 0;
        const size_t e_tid = adata_.num_triangles;
        const ray_elem_t min_limit = limit_;

        if ( adata_.vindex_size == sizeof( uint16_t ) )
            return find_ray_distance_for_triangles<uint16_t>( b_tid, e_tid, min_limit );
        else
            return find_ray_distance_for_triangles<uint32_t>( b_tid, e_tid, min_limit );
    }


    /** @brief 枝ノードの処理
     *
     *  @tparam BiType  三角形ブロックインデックスの型
     */
    template<typename BiType>
    ray_elem_t
    find_ray_distance_for_branch( const TriNode& tri_node,
                                  const rect_t& node_rect )
    {
        assert( tri_node.is_branch_type() );

        for ( const auto& cindex : children_in_crossing_order<BiType>( tri_node, node_rect ) ) {

            const auto child_node = tri_node.get_child<BiType>( cindex );

            // 交点までの距離 (limit のときは交差なし)
            ray_elem_t distance;

            if ( child_node.is_branch_type() ) {
                // 枝ノード
                const auto child_rect = get_child_rect( node_rect, cindex );
                distance = find_ray_distance_for_branch<BiType>( child_node, child_rect );
            }
            else {
                // 葉ノード
                assert( child_node.is_leaf_type() );
                distance = find_ray_distance_for_leaf<BiType>( child_node );
            }

            if ( distance != limit_ ) {
                // 交差する点が見つかったので、全体の処理を終了
                return distance;
            }
        }

        return limit_;
    }


    /** @brief 葉ノードの処理
     *
     *  @tparam BiType  三角形ブロックインデックスの型
     */
    template<typename BiType>
    ray_elem_t
    find_ray_distance_for_leaf( const TriNode& tri_node )
    {
        assert( tri_node.is_leaf_type() );

        const size_t         num_tblocks = tri_node.num_tblocks();
        const BiType* const leaf_tblocks = tri_node.get_tblock_indices<BiType>();

        std::vector<size_t> tblock_indices;
        tblock_indices.reserve( num_tblocks );

        // tblock_indices に三角形ブロックを収集
        for ( size_t i = 0; i < num_tblocks; ++i ) {
            const size_t bindex = check_and_register_tblock_index( leaf_tblocks[i] );

            if ( bindex != ALREADY_REGISTERED_TBLOCK_INDEX ) {
                tblock_indices.push_back( bindex );
            }
        }

        // tblock_indices から距離を探す
        if ( adata_.vindex_size == sizeof( uint16_t ) ) {
            if ( adata_.tindex_size == sizeof( uint16_t ) )
                return find_ray_distance_for_tblocks<uint16_t, uint16_t>( tblock_indices );
            else
                return find_ray_distance_for_tblocks<uint16_t, uint32_t>( tblock_indices );
        }
        else {
            if ( adata_.tindex_size == sizeof( uint16_t ) )
                return find_ray_distance_for_tblocks<uint32_t, uint16_t>( tblock_indices );
            else
                return find_ray_distance_for_tblocks<uint32_t, uint32_t>( tblock_indices );
        }
    }


    /** @brief 三角形ブロックの集合から探す
     *
     *  @tparam ViType  頂点インデックスの型
     *  @tparam TiType  三角形インデックスの型
     */
    template<typename ViType,
             typename TiType>
    ray_elem_t
    find_ray_distance_for_tblocks( const std::vector<size_t>& tblock_indices ) const
    {
        ray_elem_t min_limit = limit_;

        const auto tblock_table = static_cast<const TiType*>( adata_.tblock_table );

        for ( const size_t bindex : tblock_indices ) {

            const size_t b_tid = tblock_table[bindex];

            const size_t e_tid = (bindex == adata_.num_tblocks - 1) ?
                                 adata_.num_triangles :
                                 tblock_table[bindex + 1];

            min_limit = find_ray_distance_for_triangles<ViType>( b_tid, e_tid, min_limit );
        }

        return min_limit;
    }


    /** @brief 三角形の範囲から探す
     *
     *  @tparam ViType  頂点インデックスの型
     *
     *  @see 文献 LargeScale3DScene の「レイと三角形の交点」
     */
    template<typename ViType>
    ray_elem_t
    find_ray_distance_for_triangles( size_t begin_tid,
                                     size_t   end_tid,
                                     ray_elem_t limit ) const
    {
        auto ldist = limit;

        for ( size_t tid = begin_tid; tid < end_tid; ++tid ) {
            const auto  a   = get_triangle_points<ViType>( tid );  // a_0, a_1, a_2
            const auto& r   = ray_dir_;
            const auto  a1_ = a[1]     - a[0];
            const auto  a2_ = a[2]     - a[0];
            const auto  q_  = ray_pos_ - a[0];  // q - a_0

            // 三角形の面法線
            const auto n = cross( a1_, a2_ );

            // 面方向の確認
            if ( dot( r, n ) >= 0 ) {
                // レイ方向と三角形の面法線が向かい合っていないので対象外
                continue;
            }

            // 奥行き距離の確認
            const auto t = -dot( q_, n ) / dot( r, n );

            if ( t < lrect_lower_dist_ || t > lrect_upper_dist_ ) {
                // 交差したとしても、交点は制限直方体の外側にある
                continue;
            }

            if ( t <= 0 || t >= ldist ) {
                // 交差したとしても
                //   - 交点はレイの始点と終点の間にならない
                //   - さらに近い三角形がすでに見つかっている
                continue;
            }

            /* 重心座標 μ_i の計算 */
            using vec2_t = Vector<ray_elem_t, 2>;

            const auto a1_a1 = dot( a1_, a1_ );
            const auto a1_a2 = dot( a1_, a2_ );
            const auto a2_a2 = dot( a2_, a2_ );

            // μ_1, μ_2 の計算式の一番左側の項
            const auto ka = 1 / (a1_a1 * a2_a2 - a1_a2 * a1_a2);

            // μ_1, μ_2 の計算式の一番右側の項
            const auto kq = q_ - dot( n, q_ ) / dot( n, r ) * r;

            // μ_1, μ_2 の計算式の右側 2 項の結合
            const vec2_t kc{ dot( a1_, kq ), dot( a2_, kq ) };

            // μ_1, μ_2 の計算
            const auto mu1 = ka * dot( vec2_t{  a2_a2, -a1_a2 }, kc );
            const auto mu2 = ka * dot( vec2_t{ -a1_a2,  a1_a1 }, kc );

            if ( mu1 < 0 || mu2 < 0 || 1 - mu1 - mu2 < 0 ) {
                // 交点は三角形の外側にあるので対象外
                continue;
            }

            // これまでで一番近い交差になったので、最短距離を更新
            ldist = t;
        }

        return ldist;
    }


    /** @brief 三角形の頂点座標を取得
     */
    template<typename ViType>
    std::array<ray_vec_t, NUM_TRI_CORNERS>
    get_triangle_points( size_t tid ) const
    {
        const auto triangles = static_cast<const ViType*>( adata_.triangles );

        const Triangle triangle{ triangles, tid };

        std::array<ray_vec_t, NUM_TRI_CORNERS> points;

        for ( size_t cid = 0; cid < NUM_TRI_CORNERS; ++cid ) {
            const size_t vid = triangle.get_vertex_index( cid );

            for ( size_t i = 0; i < DIM; ++i ) {
                points[cid][i] = adata_.positions[DIM * vid + i];
            }
        }

        return points;
    }


    /** @brief 交差する子ノードを近い順に得る
     *
     *  線分 [ray, limit] と交差する tri_node の子ノードのインデックスを、交点が
     *  近い順に得る反復子可能オブジェクトを返す。
     */
    template<typename BiType>
    std::vector<size_t>
    children_in_crossing_order( const TriNode& tri_node,
                                const rect_t& node_rect ) const
    {
        assert( tri_node.is_branch_type() );

        struct Item {
            ray_elem_t distance;
            size_t       cindex;

            bool operator<( const Item& rhs ) const { return distance < rhs.distance; }
        };
        std::vector<Item> items;

        // 交差する子ノードを収集
        for ( size_t cindex = 0; cindex < (1u << DIM); ++cindex ) {
            // 子ノードを取得
            const auto child_node = tri_node.get_child<BiType>( cindex );
            if ( child_node.is_none() ) {
                // { u, v, w } に子ノードはないので無視
                continue;
            }

            // 子ノードの直方体
            const auto child_rect = get_child_rect( node_rect, cindex );
            if ( !child_rect.is_cross( lrect_ ) ) {
                // child_node は lrect と交差しないので対象外
                continue;
            }

            // 子ノード直方体とレイの交差を確認
            const auto distance = find_ray_distance_for_rect( child_rect );

            if ( distance != limit_ ) {
                // 交差するので追加
                items.push_back( { distance, cindex } );
            }
        }

        // 距離順に並び替え
        std::sort( items.begin(), items.end() );

        // 結果を生成して返す
        std::vector<size_t> child_indices;
        child_indices.reserve( items.size() );

        for ( const auto& item : items ) {
            child_indices.push_back( item.cindex );
        }

        return child_indices;
    }


    /** @brief 直方体とレイとの交点を探す
     *
     *  rect と [ray_*, limits_] との交点の中で、始点から最も近い交点までの距離
     *  を返す。ただし交差しないときは limit_ を返す。
     *
     *  @see 文献 LargeScale3DScene の「レイと直方体の交差」
     */
    ray_elem_t
    find_ray_distance_for_rect( const rect_t& rect ) const
    {
        // P_0 = rect.lower
        // P_1 = rect.upper
        //   q = ray_pos_
        //   r = ray_dir_

        ray_elem_t tmin = 0;
        ray_elem_t tmax = limit_;

        for ( size_t i = 0; i < 3; ++i ) {
            const ray_elem_t rect_lower_i = ALCS_TO_U16<> * rect.lower[i];
            const ray_elem_t rect_upper_i = ALCS_TO_U16<> * rect.upper[i];

            const auto& rni = ray_dir_[i];  // r . n_i

            if ( rni != 0 ) {
                // tA = ((P_0 - q) . n_i) / (r . n_i)
                // tB = ((P_1 - q) . n_i) / (r . n_i)
                const auto tA = (rect_lower_i - ray_pos_[i]) / rni;
                const auto tB = (rect_upper_i - ray_pos_[i]) / rni;

                const auto t0 = (rni > 0) ? tA : tB;
                const auto t1 = (rni > 0) ? tB : tA;
                assert( t0 < t1 );

                tmin = std::max( t0, tmin );
                tmax = std::min( t1, tmax );

                if ( tmin >= tmax ) {
                    // 共通区間が存在しないので交差しない
                    return limit_;
                }
            }
            else { // rni == 0
                if ( (ray_pos_[i] - rect_lower_i <  0) ||
                     (ray_pos_[i] - rect_upper_i >= 0) ) {
                    // すべての i において、以下が満たされないので交差しない
                    // (q - P_0) . n_i >= 0
                    // (q - P_1) . n_i < 0
                    return limit_;
                }
            }
        }

        assert( tmin < tmax );
        return tmin;
    }


    /** @brief 三角形ブロックのインデックスの確認
     *
     *  index が初めて使われたときは index を返す。それ以外のときは
     *  ALREADY_REGISTERED_TBLOCK_INDEX を返す。
     */
    size_t
    check_and_register_tblock_index( size_t index )
    {
        if ( tblock_manager_.insert( index ) ) {
            return index;
        }
        else {
            return ALREADY_REGISTERED_TBLOCK_INDEX;
        }
    }


  private:
    const Analyzer&   adata_;
    const ray_vec_t ray_pos_;  // レイの始点 (ALCS_TO_U16)
    const ray_vec_t ray_dir_;  // レイの方向 (ALCS_TO_U16)
    const ray_elem_t  limit_;  // 制限距離
    const rect_t      lrect_;  // 制限直方体 (ALCS)

    // lrect_ がレイ (無限直線) と交差する距離範囲
    ray_elem_t lrect_lower_dist_;
    ray_elem_t lrect_upper_dist_;

    HashSet tblock_manager_;

};

} // namespace b3dtile
