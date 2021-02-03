#pragma once

#include "Base.hpp"
#include "Analyzer.hpp"
#include "../HashSet.hpp"
#include <vector>
#include <cassert>


namespace b3dtile {

/** @brief 三角形ブロックの収集
 *
 *  clip_rect と交差するノードの三角形ブロックを収集する。
 *
 *  run() を実行した後に、以下のメンバー変数にアクセスできる。ただし構築子に
 *  与えた adata の参照先は存続していなければならない。
 *
 *   - num_tblocks
 *   - tblock_table
 *   - collected_tblocks
 *
 *  num_tblocks と tblock_table は基本的に adata の同名メンバーと同じ意味で
 *  あるが、ツリーが存在しないデータでも 0 または 1 個のブロックが存在するか
 *  のように設定される。
 *
 *  collected_tblocks は収集した三角形ブロックのインデックス (重複しない) の
 *  リストである。
 */
class Tile::BCollector : Base {

  public:
    /** @brief 初期化
     *
     *  adata は参照のみを保持すること注意すること。
     */
    BCollector( const Analyzer&   adata,
                const rect_t& clip_rect )
        : adata_{ adata },
          clip_rect_{ clip_rect },
          num_tblocks{ 0 },
          tblock_table{ nullptr }
    {
        assert( clip_rect.is_valid_size() );
    }


    /** @brief 三角形ブロックを収集
     */
    void
    run()
    {
        if ( adata_.num_triangles == 0 ) {
            // 三角形が存在しないとき 0 ブロックにする
            num_tblocks  = 0;
            tblock_table = nullptr;
        }
        else if ( adata_.root_node ) {
            /* ツリーが存在する */

            // トラバース
            traverse_branch( adata_.root_node, TILE_RECT );

            // 本来のブロックを使う
            num_tblocks  = adata_.num_tblocks;
            tblock_table = adata_.tblock_table;
        }
        else {
            /* ツリーが存在しない */

            // トラバースせずに、タイルのすべての三角形を持つ仮想的な
            // 1 ブロックを作る
            collected_tblocks.push_back( 0 );

            num_tblocks = collected_tblocks.size();

            if ( adata_.tindex_size == sizeof( uint16_t ) ) {
                tblock_table_dummy_.a16[0] = 0;
                tblock_table = tblock_table_dummy_.a16;
            }
            else {
                tblock_table_dummy_.a32[0] = 0;
                tblock_table = tblock_table_dummy_.a32;
            }
        }
    }


    BCollector( const BCollector& ) = delete;
    void operator=( const BCollector& ) = delete;


  private:
    /** @brief 枝ノードをトラバース
     */
    const byte_t*
    traverse_branch( const byte_t* node_data,
                     const rect_t& node_rect )
    {
        // 三角形ツリーのノード種類
        enum class NodeType {
            NONE   = 0,
            BRANCH = 1,
            LEAF   = 2,
        };

        const byte_t* cursor = node_data;

        // TREE_SIZE
        size_t tree_size = read_value<uint16_t>( cursor );

        // CHILDREN
        const unsigned children = read_value<uint16_t>( cursor );

        if ( tree_size == 0 ) {
            // TREE_SIZE_EX
            tree_size = read_value<uint32_t>( cursor );
        }

        for ( int w = 0; w < 2; ++w ) {
            for ( int v = 0; v < 2; ++v ) {
                for ( int u = 0; u < 2; ++u ) {
                    const int child_index = u + 2*v + 4*w;
                    const auto  node_type = static_cast<NodeType>( (children >> (2 * child_index)) & 0b11u );

                    if ( node_type == NodeType::BRANCH ) {
                        const auto child_rect = get_child_rect( node_rect, { u, v, w } );
                        if ( child_rect.is_cross( clip_rect_ ) ) {
                            cursor = traverse_branch( cursor, child_rect );
                        }
                        else {
                            cursor = skip_branch( cursor );
                        }
                    }
                    else if ( node_type == NodeType::LEAF ) {
                        const auto child_rect = get_child_rect( node_rect, { u, v, w } );
                        if ( child_rect.is_cross( clip_rect_ ) ) {
                            cursor = traverse_leaf( cursor );
                        }
                        else {
                            cursor = skip_leaf( cursor );
                        }
                    }
                    else {
                        assert( node_type == NodeType::NONE );
                        // 子ノードがないときは何もしない
                    }
                }
            }
        }

        assert( cursor == node_data + WORD_SIZE * tree_size );
        return cursor;
    }


    /** @brief 枝ノードを読み飛ばし
     */
    const byte_t*
    skip_branch( const byte_t* node_data ) const
    {
        const byte_t* cursor = node_data;

        // TREE_SIZE
        size_t tree_size = read_value<uint16_t>( cursor );

        // CHILDREN
        read_value<uint16_t>( cursor );

        if ( tree_size == 0 ) {
            // TREE_SIZE_EX
            tree_size = read_value<uint32_t>( cursor );
        }

        return node_data + WORD_SIZE * tree_size;
    }


    /** @brief 葉ノードをトラバース
     */
    const byte_t*
    traverse_leaf( const byte_t* node_data )
    {
        const byte_t* cursor = node_data;

        // NUM_BLOCKS
        const size_t num_blocks = read_value<uint32_t>( cursor );

        // BLOCK_INDICES
        if ( adata_.bindex_size == sizeof( uint16_t ) ) {
            cursor = get_tblock_indices<uint16_t>( cursor, num_blocks );
        }
        else {
            cursor = get_tblock_indices<uint32_t>( cursor, num_blocks );
        }

        return cursor;
    }


    /** @brief TBLOCK のインデックス配列を collected_tblocks に取得
     *
     *  @tparam BiType  三角形ブロックインデックスの型
     *
     *  @param bindices_data  TBLOCK インデックス配列の開始ポインタ
     *  @param num_blocks     配列の要素数
     *
     *  @return 次の読み込みポインタ
     */
    template<typename BiType>
    const byte_t*
    get_tblock_indices( const byte_t* bindices_data,
                        size_t           num_blocks )
    {
        const auto begin = get_pointer<BiType>( bindices_data );
        const auto   end = begin + num_blocks;

        for ( auto it = begin; it != end; ++it ) {
            const size_t bindex = *it;
            if ( bindex_set_.insert( bindex ) ) {
                collected_tblocks.push_back( bindex );
            }
        }

        return bindices_data + get_aligned<4>( sizeof( BiType ) * num_blocks );
    }


    /** @brief 葉ノードをトラバース
     */
    const byte_t*
    skip_leaf( const byte_t* node_data ) const
    {
        const byte_t* cursor = node_data;

        // NUM_BLOCKS
        const size_t num_blocks = read_value<uint32_t>( cursor );

        // BLOCK_INDICES
        cursor += get_aligned<4>( adata_.bindex_size * num_blocks );

        return cursor;
    }


  private:
    const Analyzer&  adata_;
    const rect_t clip_rect_;

    // 三角形ブロックの重複を除去するための一時情報
    HashSet bindex_set_;

    // 仮想 1 ブロック用ダミー
    union {
        uint16_t a16[1];
        uint32_t a32[1];
    } tblock_table_dummy_;


  public: // 収集結果

    // Analyzer の同名メンバーの代わりに使う
    size_t       num_tblocks;
    const void* tblock_table;  // tindex_t[]

    // 収集した三角形ブロックのインデックス
    std::vector<size_t> collected_tblocks;

};

} // namespace b3dtile
