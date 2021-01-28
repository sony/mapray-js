#pragma once

#include "BCollector.hpp"
#include "Analyzer.hpp"
#include "Base.hpp"
#include "../Vector.hpp"
#include <unordered_map>
#include <vector>
#include <array>
#include <algorithm>  // for min(), max(), copy(), transform()
#include <utility>    // for move(), pair, make_pair()
#include <iterator>   // for input_iterator_tag
#include <cmath>      // for round()
#include <cassert>
#include <cstddef>    // for ptrdiff_t


namespace b3dtile {

/** @brief クリップ処理
 */
class Tile::Clipper : Base {

    /** @brief 頂点索引辞書 (配列)
     */
    class IndexTableMap {

        static constexpr auto NOENTRY = static_cast<size_t>( -1 );

      public:
        /** @brief 入力イテレータ
         *
         *  仕様は LegacyInputIterator 要件を満たす。
         *
         *  @see https://ja.cppreference.com/w/cpp/named_req/InputIterator
         */
        class iterator {

          public:
            // std::iterator_traits 用の型定義
            using value_type        = std::pair<size_t, size_t>;
            using difference_type   = std::ptrdiff_t;
            using reference         = value_type;  // 入力イテレータなので参照である必要はない
            using pointer           = const value_type*;
            using iterator_category = std::input_iterator_tag;

          public:
            bool
            operator==( const iterator& rhs ) const
            {
                return this->old_index_ == rhs.old_index_;
            }

            bool
            operator!=( const iterator& rhs ) const
            {
                return !(*this == rhs);
            }

            reference
            operator*() const
            {
                const auto&      dict = *container_;
                const auto& new_index = dict[old_index_];
                return std::make_pair( old_index_, new_index );
            }

            // pointer
            // operator->() const
            // {
            // }

            iterator&
            operator++()
            {
                const auto& dict = *container_;
                for ( ++old_index_; old_index_ < dict.size(); ++old_index_ ) {
                    if ( dict[old_index_] != NOENTRY ) {
                        break;
                    }
                }
                return *this;
            }

            iterator
            operator++( int )
            {
                const iterator temp = *this;
                ++(*this);
                return temp;
            }

          private:
            iterator( const std::vector<size_t>* container,
                      size_t                     old_index ) :
                container_{ container },
                old_index_{ old_index } {}

          private:
            const std::vector<size_t>* container_;
            size_t                     old_index_;

        friend IndexTableMap;
        };

      public:
        explicit
        IndexTableMap( size_t max_vertices ) :
            dict_( max_vertices, NOENTRY ),
            num_vertices_{ 0 }
        {}

        /** @brief 頂点数を取得
         */
        size_t
        num_vertices() const
        {
            return num_vertices_;
        }

        /** @brief 旧頂点索引を新頂点索引に変換
         */
        size_t
        new_index( size_t old_index )
        {
            auto index = dict_[old_index];

            if ( index == NOENTRY ) {
                index = num_vertices_;
                dict_[old_index] = index;
                ++num_vertices_;
            }

            return index;
        }

        iterator
        begin() const
        {
            size_t old_index;

            for ( old_index = 0; old_index < dict_.size(); ++old_index ) {
                if ( dict_[old_index] != NOENTRY ) {
                    break;
                }
            }

            return iterator{ &dict_, old_index };
        }

        iterator
        end() const
        {
            return iterator{ &dict_, dict_.size() };
        }

      private:
        std::vector<size_t> dict_;
        size_t      num_vertices_;

    };


    /** @brief 頂点索引辞書 (ハッシュ)
     */
    class IndexHashMap {

      public:
        explicit
        IndexHashMap( size_t /*max_vertices*/ ) {}

        /** @brief 頂点数を取得
         */
        size_t
        num_vertices() const
        {
            return dict_.size();
        }

        /** @brief 旧頂点索引を新頂点索引に変換
         */
        size_t
        new_index( size_t old_index )
        {
            const auto it = dict_.emplace( old_index, dict_.size() ).first;
            return it->second;
        }

        auto begin() const { return dict_.begin(); }

        auto end() const { return dict_.end(); }

      private:
        std::unordered_map<size_t, size_t> dict_;

    };


    // 辞書: インデックス -> インデックス
    using index_map_t = IndexHashMap;


    /** @brief 凸多角形 (重心座標)
     */
    class Polygon {

      public:
        using position_t = std::array<real_t, DIM - 1>;
        using      vec_t = typename MatchedVector<position_t>::type;


      public:
        /** @brief 初期化
         */
        explicit
        Polygon( size_t tid )
            : vertices_{ { 0, 0 },
                         { 1, 0 },
                         { 0, 1 } },
              tid_{ tid }
        {}


        /** @brief 頂点座標の配列を参照
         */
        const std::vector<position_t>&
        vertices() const
        {
            return vertices_;
        }


        /** @brief 元の三角形インデックス
         */
        size_t tid() const { return tid_; }


        /** @brief 三角形に変換したときの三角形数
         */
        size_t
        num_triangles() const
        {
            return vertices_.size() - 2;
        }


        /** @brief 多角形を半空間で切り取る
         *
         *  dot( n, v ) + d >= 0 を満たす v が定義する空間内に多角形を切り取る。
         *
         *  @return  空になった、または失敗したとき false, それ以外のとき true
         */
        bool
        trim_by_plane( const vec_t& n,
                       real_t       d )
        {
            const size_t num_vertices = vertices_.size();
            assert( num_vertices >= 3 );

            auto dist_min = dot( n, vec_t{ vertices_[0] } ) + d;
            auto dist_max = dist_min;

            for ( size_t i = 1; i < num_vertices; ++i ) {
                const auto dist = dot( n, vec_t{ vertices_[i] } ) + d;
                dist_min = std::min( dist, dist_min );
                dist_max = std::max( dist, dist_max );
            }

            if ( dist_min >= 0 ) {
                // 多角形のすべてが半空間に含まれるので、切り取る必要はない
                return true;
            }
            else if ( dist_max <= 0 ) {
                // 多角形と半空間との重なりの面積が 0 なので空になった
                return false;
            }

            // 少なくとも 1 つの頂点が半空間の内側
            // 少なくとも 1 つの頂点が半空間の外側
            assert( (dist_min < 0) && (dist_max > 0) );

            // アルゴリズム
            //
            //  最初に次の手順で稜線 S, E を見つける。
            //
            //   1. 始点が半空間の外部で終点が半空間の非外部 (内部または境界)
            //      の稜線 S を見つける。
            //
            //   2. 始点が半空間の内部で終点が半空間の非内部 (外部または境界)
            //      の稜線 E を見つける。
            //
            //  ※ 理論上は、稜線 S, E はそれぞれ 1 つ存在するが、計算誤差で
            //     そうならない可能性がある。
            //
            //  次に空の頂点配列 V を生成し、次の手順で頂点を加える。
            //
            //   1. 稜線 S の終点が境界上でなければ、稜線 S と境界の交点を V
            //      に加える。
            //
            //   2. 稜線 S の次の稜線の始点から稜線 E の始点までの頂点を V に
            //      加える。
            //
            //   3. 稜線 E と境界の交点を V に加える。
            //

            // 始点が半空間の外部で終点が半空間の非外部の稜線 S を見つける
            size_t S_edge = num_vertices;  // 稜線 S のインデックス

            for ( size_t eid = 0; eid < num_vertices; ++eid ) {
                const size_t vi0 = edge_start_vertex_index( eid );
                const size_t vi1 = edge_end_vertex_index( eid );

                const vec_t v0 = vertices_[vi0];  // 始点
                const vec_t v1 = vertices_[vi1];  // 終点

                if ( (dot( n, v0 ) + d < 0) && (dot( n, v1 ) + d >= 0) ) {
                    // 稜線 S を見つけた
                    S_edge = eid;
                    break;
                }
            }

            if ( S_edge == num_vertices ) {
                // おそらく不変条件を満たさない多角形
                return false;
            }

            // 始点が半空間の内部で終点が半空間の非内部の稜線 E を見つける
            size_t E_edge = num_vertices;  // 稜線 E のインデックス

            for ( size_t eid = 0; eid < num_vertices; ++eid ) {
                const size_t vi0 = edge_start_vertex_index( eid );
                const size_t vi1 = edge_end_vertex_index( eid );

                const vec_t v0 = vertices_[vi0];  // 始点
                const vec_t v1 = vertices_[vi1];  // 終点

                if ( (dot( n, v0 ) + d > 0) && (dot( n, v1 ) + d <= 0) ) {
                    // 稜線 E を見つけた
                    E_edge = eid;
                    break;
                }
            }

            if ( E_edge == num_vertices ) {
                // おそらく不変条件を満たさない多角形
                return false;
            }

            // 新しい頂点配列
            std::vector<position_t> new_vertices;
            new_vertices.reserve( num_vertices + 1 );

            // S_edge の終点が境界上でなければ、S_edge と境界の交点を追加
            if ( dot( n, vec_t{ vertices_[edge_end_vertex_index( S_edge )] } ) + d != 0 ) {
                new_vertices.push_back( get_cross_point( n, d, S_edge ) );
            }

            // S_edge の次の稜線の始点から E_edge の始点までの頂点を追加
            for ( size_t vi = edge_start_vertex_index( next_edge_index( S_edge ) ) ;; vi = next_vertex_index( vi ) ) {
                new_vertices.push_back( vertices_[vi] );
                if ( vi == edge_start_vertex_index( E_edge ) ) break;
            }

            // E_edge と境界の交点を追加
            new_vertices.push_back( get_cross_point( n, d, E_edge ) );

            // 頂点を更新
            assert( (new_vertices.size() >= 3) && (new_vertices.size() <= num_vertices + 1) );
            vertices_.swap( new_vertices );

            return true;
        }


      private:
        /** @brief 境界と稜線の交点を計算
         *
         *  @pre 稜線の長さは 0 より大きく、境界と稜線は平行ではない
         */
        position_t
        get_cross_point( const vec_t& n,
                         real_t       d ,
                         size_t     eid ) const
        {
            const size_t vi0 = edge_start_vertex_index( eid );
            const size_t vi1 = edge_end_vertex_index( eid );

            // Q は始点、V は方向
            const vec_t Q_ = vertices_[vi0];
            const auto  V_ = vec_t{ vertices_[vi1] } - Q_;

            assert( norm( V_ ) > 0 );  // 事前条件

            // t = -(n . Q + d) / (n . V)
            const auto t_ = -(dot( n, Q_ ) + d) / dot( n, V_ );

            return Q_ + t_*V_;
        }


        size_t
        edge_start_vertex_index( size_t eid ) const
        {
            return eid;
        }


        size_t
        edge_end_vertex_index( size_t eid ) const
        {
            return (eid == vertices_.size() - 1) ? 0 : eid + 1;
        }


        size_t
        next_vertex_index( size_t vid ) const
        {
            return (vid == vertices_.size() - 1) ? 0 : vid + 1;
        }


        size_t
        next_edge_index( size_t eid ) const
        {
            return (eid == vertices_.size() - 1) ? 0 : eid + 1;
        }


      private:
        // 不変条件
        // - すべての頂点が同一平面上にある凸多角形 (内角 180 度未満)
        // - 頂点は 3 個以上で、順序は前面から見て反時計回り
        // - すべての稜線は 0 より長く、面積は 0 より大きい
        std::vector<position_t> vertices_;

        // 三角形インデックス
        size_t tid_;

    };


    /** @brief クリップ結果の生成
     */
    class Result {

        using triangle_t  = std::array<size_t, NUM_TRI_CORNERS>;
        using mu_coords_t = std::array<real_t, NUM_TRI_CORNERS>;


      public:
        explicit
        Result( const Clipper& clipper )
            : clipper_{ clipper },
              adata_{ clipper.adata_ }
        {
            // 新しい頂点数と三角形数
            num_vertices_  = clipper_.index_map_A_.num_vertices();
            num_triangles_ = clipper_.tri_indices_A_.size() / NUM_TRI_CORNERS;

            for ( const auto& polygon : clipper_.polygons_B_ ) {
                num_vertices_  += polygon.vertices().size();
                num_triangles_ += polygon.num_triangles();
            }

            // 新しい頂点インデックス型のバイト数
            vindex_size_ = get_index_size( num_vertices_ );

            size_t buffer_size = 0;

            // 位置配列 (POSITIONS)
            offset_positions_ = buffer_size;
            buffer_size += get_aligned<4>( DIM * sizeof( p_elem_t ) * num_vertices_ );

            // 三角形配列 (TRIANGLES)
            offset_triangles_ = buffer_size;
            buffer_size += get_aligned<4>( NUM_TRI_CORNERS * vindex_size_ * num_triangles_ );

            // 法線配列 (N_ARRAY)
            offset_n_array_ = buffer_size;
            if ( adata_.n_array ) {
                buffer_size += get_aligned<4>( DIM * sizeof( n_elem_t ) * num_vertices_ );
            }

            // カラー配列 (C_ARRAY)
            offset_c_array_ = buffer_size;
            if ( adata_.c_array ) {
                buffer_size += get_aligned<4>( NUM_COLOR_COMPOS * sizeof( c_elem_t ) * num_vertices_ );
            }

            // バッファを確保
            buffer_.resize( buffer_size );
        }


        /** @brief 処理を実行
         */
        void
        run()
        {
            // buffer に頂点属性を設定
            set_vertices_A();

            if ( adata_.vindex_size == sizeof( uint16_t ) ) {
                set_vertices_B<uint16_t>();
            }
            else {
                set_vertices_B<uint32_t>();
            }

            // buffer に頂点インデックスを設定
            if ( vindex_size_ == sizeof( uint16_t ) ) {
                set_indices_A<uint16_t>();
                set_indices_B<uint16_t>();
            }
            else {
                set_indices_A<uint32_t>();
                set_indices_B<uint32_t>();
            }

            // 結果を返す
            clip_result_( static_cast<wasm_i32_t>( num_vertices_ ),
                          static_cast<wasm_i32_t>( num_triangles_ ),
                          buffer_.data() );
        }


      private:
        /** @brief A の頂点属性を buffer に設定
         */
        void
        set_vertices_A()
        {
            for ( const auto& item : clipper_.index_map_A_ ) {
                const auto& old_index = item.first;
                const auto& new_index = item.second;

                // POSITIONS
                copy_vertex_to_buffer<DIM>( adata_.positions,
                                            old_index,
                                            offset_positions_,
                                            new_index );

                // N_ARRAY
                if ( adata_.n_array ) {
                    copy_vertex_to_buffer<DIM>( adata_.n_array,
                                                old_index,
                                                offset_n_array_,
                                                new_index );
                }

                // C_ARRAY
                if ( adata_.c_array ) {
                    copy_vertex_to_buffer<NUM_COLOR_COMPOS>( adata_.c_array,
                                                             old_index,
                                                             offset_c_array_,
                                                             new_index );
                }
            }
        }


        /** @brief B の頂点属性を設定
         *
         *  @tparam ViType  旧データ (adata_) の頂点インデックス型
         */
        template<typename ViType>
        void
        set_vertices_B()
        {
            size_t dst_vindex = clipper_.index_map_A_.num_vertices();

            for ( const auto& polygon : clipper_.polygons_B_ ) {
                const auto triangle = adata_.get_triangle<ViType>( polygon.tid() );

                for ( const auto& coord : polygon.vertices() ) {
                    // 三角形 triangle の各頂属性を、重心座標 mu で補間

                    const mu_coords_t mu = { 1 - coord[0] - coord[1], coord[0], coord[1] };

                    // POSITIONS
                    interpolate_vertex_to_buffer<DIM>( triangle, mu,
                                                       adata_.positions,
                                                       offset_positions_,
                                                       dst_vindex );

                    // N_ARRAY
                    if ( adata_.n_array ) {
                        interpolate_vertex_to_buffer<DIM>( triangle, mu,
                                                           adata_.n_array,
                                                           offset_n_array_,
                                                           dst_vindex );
                    }

                    // C_ARRAY
                    if ( adata_.c_array ) {
                        interpolate_vertex_to_buffer<NUM_COLOR_COMPOS>( triangle, mu,
                                                                        adata_.c_array,
                                                                        offset_c_array_,
                                                                        dst_vindex );
                    }

                    ++dst_vindex;
                }
            }
        }


        /** @brief A の頂点インデックスを設定
         *
         *  @tparam ViType  新データの頂点インデックス型
         */
        template<typename ViType>
        void
        set_indices_A()
        {
            const auto& src = clipper_.tri_indices_A_;
            const auto  dst = get_buffer_pointer<ViType>( offset_triangles_ );

            std::transform( src.begin(), src.end(), dst,
                            []( size_t i ) { return static_cast<ViType>( i ); } );
        }


        /** @brief B の頂点インデックスを設定
         *
         *  @tparam ViType  新データの頂点インデックス型
         */
        template<typename ViType>
        void
        set_indices_B()
        {
            const size_t dst_start = clipper_.tri_indices_A_.size();
            auto dst = get_buffer_pointer<ViType>( offset_triangles_ ) + dst_start;

            size_t vindex = clipper_.index_map_A_.num_vertices();

            for ( const auto& polygon : clipper_.polygons_B_ ) {
                const size_t num_corners = polygon.vertices().size();

                for ( size_t ci = 2; ci < num_corners; ++ci ) {
                    *dst++ = static_cast<ViType>( vindex );
                    *dst++ = static_cast<ViType>( vindex + ci - 1 );
                    *dst++ = static_cast<ViType>( vindex + ci );
                }

                vindex += num_corners;
            }
        }


        /** @brief バッファの先頭から byte_offset の EType* ポインタを取得
         */
        template<typename EType>
        EType*
        get_buffer_pointer( size_t byte_offset )
        {
            void* const addr = buffer_.data() + byte_offset;
            return static_cast<EType*>( addr );
        }


        /** @brief 頂点属性を buffer_ にコピー
         */
        template<size_t NumElems, typename EType>
        void
        copy_vertex_to_buffer( const EType* src_array,
                               size_t       src_index,
                               size_t       dst_offset,
                               size_t       dst_index )
        {
            const auto src = src_array + NumElems * src_index;
            const auto dst = get_buffer_pointer<EType>( dst_offset ) + NumElems * dst_index;

            for ( size_t ei = 0; ei < NumElems; ++ei ) {
                dst[ei] = src[ei];
            }
        }


        /** @brief 頂点属性を補間し buffer_ にコピー
         */
        template<size_t NumElems, typename EType>
        void
        interpolate_vertex_to_buffer( const triangle_t& triangle,
                                      const mu_coords_t&      mu,
                                      const EType* src_array,
                                      size_t       dst_offset,
                                      size_t       dst_index )
        {
            using std::round;

            const auto dst = get_buffer_pointer<EType>( dst_offset ) + NumElems * dst_index;

            for ( size_t ei = 0; ei < NumElems; ++ei ) {
                real_t value = 0;  // ei 要素の補間値

                for ( size_t ci = 0; ci < NUM_TRI_CORNERS; ++ci ) {
                    const auto& vi = triangle[ci];
                    value += mu[ci] * src_array[NumElems * vi + ei];
                }

                // 法線のときの長さの正規化は省略
                dst[ei] = static_cast<EType>( round( value ) );
            }
        }


      private:
        const Clipper& clipper_;
        const Analyzer&  adata_;

        size_t num_vertices_;
        size_t num_triangles_;
        size_t vindex_size_;

        size_t offset_positions_;
        size_t offset_triangles_;
        size_t offset_n_array_;
        size_t offset_c_array_;

        std::vector<byte_t> buffer_;

    };


  public:
    /** @brief 初期化
     *
     *  adata は参照のみを保持すること注意すること。
     */
    Clipper( const Analyzer&   adata,
             const rect_t& clip_rect );


    /** @brief クリップ処理を実行
     *
     *  タイルのポリゴンをクリッピングする。
     *
     *  結果は setup_javascript_functions() の clip_result パラメータに指定した
     *  関数を呼び出して通知する。
     */
    void run();


  private:
    /** @brief 基本情報を収集
     *
     *  以下のメンバー変数を設定する。
     *
     *  - index_map_A_
     *  - tri_indices_A_
     *  - polygons_B_
     *
     *  @tparam ViType  旧データの頂点インデックス型
     *  @tparam TiType  旧データの三角形インデックス型
     */
    template<typename ViType,
             typename TiType>
    void
    collect_polygons()
    {
        for ( const auto& bindex : bcollect_.collected_tblocks ) {
            assert( bcollect_.num_tblocks >= 1 );

            const size_t b_tid = get_tblock_table_item<TiType>( bindex );
            const size_t e_tid = (bindex == bcollect_.num_tblocks - 1) ?
                                 adata_.num_triangles :
                                 get_tblock_table_item<TiType>( bindex + 1 );

            assert( b_tid < e_tid );

            for ( size_t tid = b_tid; tid != e_tid; ++tid ) {
                add_triangle<ViType>( tid );
            }
        }
    }


    /** @brief tblock_table[index] を取得
     *
     *  @tparam ViType  旧データの三角形インデックス型
     *
     *  @param index  ブロックインデックス
     */
    template<typename TiType>
    size_t
    get_tblock_table_item( size_t index ) const
    {
        assert( adata_.tindex_size == sizeof( TiType ) );

        return static_cast<const TiType*>( bcollect_.tblock_table )[index];
    }


    /** @brief 三角形を取得
     *
     *  @tparam ViType  旧データの頂点インデックス型
     *
     *  @param tid  三角形インデックス
     */
    template<typename ViType>
    Triangle
    get_triangle( size_t tid ) const
    {
        assert( adata_.vindex_size == sizeof( ViType ) );

        return Triangle{ static_cast<const ViType*>( adata_.triangles ), tid };
    }


    /** @brief 三角形を追加
     *
     *  @tparam ViType  旧データの頂点インデックス型
     *
     *  @param tid  三角形インデックス
     */
    template<typename ViType>
    void
    add_triangle( size_t tid )
    {
        const Triangle triangle = get_triangle<ViType>( tid );

        if ( is_inside( triangle ) ) {
            // triangle は完全に clip_rect_ の内側
            for ( const auto& old_index : triangle.ref_corners() ) {
                tri_indices_A_.emplace_back( index_map_A_.new_index( old_index ) );
            }
        }
        else {
            if ( is_outside( triangle ) ) {
                // triangle は完全に clip_rect_ の外側
                // (何も追加しない)
            }
            else {
                // それ以外の三角形
                add_clipped_polygon( triangle, tid );
            }
        }
    }


    /** @brief triangle が clip_rect_ の完全に内側か？
     */
    bool
    is_inside( const Triangle& triangle ) const
    {
        const auto corner_flags = get_corner_flags( triangle );

        auto flags = 0;  // 全ビット 0 で初期化

        for ( size_t ci = 0; ci < NUM_TRI_CORNERS; ++ci ) {
            flags |= corner_flags[ci];
        }

        // ビット論理和が 0 のとき、完全に内側
        return flags == 0;
    }


    /** @brief triangle が clip_rect_ の完全に外側か？
     */
    bool
    is_outside( const Triangle& triangle ) const
    {
        const auto corner_flags = get_corner_flags( triangle );

        auto flags = static_cast<unsigned>( -1 );  // 全ビット 1 で初期化

        for ( size_t ci = 0; ci < NUM_TRI_CORNERS; ++ci ) {
            flags &= corner_flags[ci];
        }

        // ビット論理積が 0 以外のとき、完全に外側
        return flags != 0;
    }


    /** @brief 三角形の内外判定フラグを取得
     *
     *  資料 LargeScale3DScene の「三角形の内外判定方法」を参照
     */
    std::array<unsigned, NUM_TRI_CORNERS>
    get_corner_flags( const Triangle& triangle ) const
    {
        std::array<unsigned, NUM_TRI_CORNERS> corner_flags;

        for ( size_t ci = 0; ci < NUM_TRI_CORNERS; ++ci ) {
            const auto  vi = triangle.get_vertex_index( ci );
            const auto pos = adata_.get_position<real_t>( vi );

            unsigned flag = 0;

            for ( int ai = 0; ai < DIM; ++ai ) {
                const unsigned lout = (pos[ai] <  clip_rect_.lower[ai]) ? 1 : 0;
                const unsigned uout = (pos[ai] >= clip_rect_.upper[ai]) ? 2 : 0;
                flag += (lout + uout) << (2 * ai);
            }

            corner_flags[ci] = flag;
        }

        return corner_flags;
    }


    /** @brief クリッピングされた多角形を追加
     *
     *  資料 LargeScale3DScene の「三角形のクリッピング」を参照
     */
    void
    add_clipped_polygon( const Triangle& triangle,
                         size_t               tid )
    {
        using vec3_t = Vector<real_t, DIM>;
        using vec2_t = Polygon::vec_t;

        // 三角形の各角の位置ベクトル
        std::array<vec3_t, NUM_TRI_CORNERS> tri_points;

        for ( size_t ci = 0; ci < NUM_TRI_CORNERS; ++ci ) {
            const auto  vi = triangle.get_vertex_index( ci );
            tri_points[ci] = adata_.get_position<real_t>( vi );
        }

        Polygon polygon{ tid };

        // 計算と変数名は資料を参照
        for ( int ai = 0; ai < DIM; ++ai ) {
            const auto& a = tri_points;

            { // クリップ ai 軸下限から正に向かう半空間により切り取る
                const auto n =  vec3_t::basis( ai );
                const auto d = -clip_rect_.lower[ai];

                const auto n_ = vec2_t{ dot( a[1] - a[0], n ),
                                        dot( a[2] - a[0], n ) };

                if ( n_ != vec2_t::zero() ) {
                    const auto d_ = dot( n, a[0] ) + d;
                    if ( !polygon.trim_by_plane( n_, d_ ) ) {
                        return;
                    }
                }
            }

            { // クリップ ai 軸上限から負に向かう半空間により切り取る
                const auto n = -vec3_t::basis( ai );
                const auto d =  clip_rect_.upper[ai];

                const auto n_ = vec2_t{ dot( a[1] - a[0], n ),
                                        dot( a[2] - a[0], n ) };

                if ( n_ != vec2_t::zero() ) {
                    const auto d_ = dot( n, a[0] ) + d;
                    if ( !polygon.trim_by_plane( n_, d_ ) ) {
                        return;
                    }
                }
            }
        }

        polygons_B_.emplace_back( std::move( polygon ) );
    }


  private:
    const Analyzer& adata_;
    BCollector   bcollect_;

    // 変換済みクリップ直方体
    rect_t clip_rect_;

    // クリッピングなし部分の情報
    index_map_t           index_map_A_;  // 旧頂点索引 -> 新頂点索引
    std::vector<size_t> tri_indices_A_;  // 新頂点索引による三角形リスト

    // クリッピングあり部分の情報
    std::vector<Polygon> polygons_B_;  // 重心座標で表現した凸多角形

};

} // namespace b3dtile
