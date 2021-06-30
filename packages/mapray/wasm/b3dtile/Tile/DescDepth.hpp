#pragma once

#include "Base.hpp"
#include <array>
#include <cassert>


namespace b3dtile {

/** @brief Tile::get_descendant_depth() の実装
 */
class Tile::DescDepth : Base {

    // 子孫ツリーのノード種類
    enum class NodeType {
        EMPTY_VOID = 0,
        EMPTY_GEOM = 1,
        BRANCH     = 2,
        LEAF       = 3,
    };


  public:
    using position_t = std::array<double, DIM>;


  public:
    /** @brief 初期化
     */
    DescDepth( const byte_t*    data,
               const position_t& pos,
               int             limit )
        : root_bnode_{ data + OFFSET_DESCENDANTS },
          target_pos_{ pos },
          limit_{ limit }
    {}


    /** @brief 処理を実行
     */
    int
    run()
    {
        int     level = 0;
        auto position = target_pos_;
        auto   cursor = root_bnode_;

        for (;;) {
            /* Skip TREE_SIZE */  read_value<uint16_t>( cursor );
            const auto children = read_value<uint16_t>( cursor );

            const auto child_index = get_target_child( position );
            const auto  child_type = get_child_node_type( children, child_index );

            if ( child_type == NodeType::BRANCH ) {
                if ( ++level >= limit_ ) {
                    // 上限レベルに到達したので終了
                    break;
                }

                cursor = skip_younger_siblings( children, child_index, cursor );
                continue;
            }
            else if ( child_type == NodeType::LEAF ) {
                // 最もレベルの高い子孫に到達したので終了
                ++level;
                break;
            }
            else {
                assert( child_type == NodeType::EMPTY_VOID ||
                        child_type == NodeType::EMPTY_GEOM );
                // 子ノードがないときは、これまでで一番深い深度を返す
                break;
            }
        }

        assert( level <= limit_ );
        return level;
    }


  private:
    /** @brief 子ノードの型を取得
     */
    static NodeType
    get_child_node_type( unsigned  children,
                         size_t child_index )
    {
        return static_cast<NodeType>( (children >> (2 * child_index)) & 0b11u );
    }


    /** @brief 目標に向かう子ノードの情報を取得
     *
     *  pos は親ノード座標系から子ノード座標系の座標に更新される。
     *
     *  @param[in,out] pos  目標位置 (ALCS)
     *
     *  @return 子ノードのインデックス
     */
    static size_t
    get_target_child( position_t& pos )
    {
        unsigned child_index = 0;

        for ( size_t i = 0; i < DIM; ++i ) {
            pos[i] *= 2;

            if ( pos[i] >= 1 ) {
                pos[i] -= 1;
                child_index |= (1u << i);
            }
        }

        return child_index;
    }


    /**
     *  children 上の child_index より前の子ノードとその子孫をスキップする。
     */
    static const byte_t*
    skip_younger_siblings( unsigned  children,
                           size_t child_index,
                           const byte_t* next )
    {
        auto cursor = next;

        for ( size_t i = 0; i < child_index; ++i ) {
            // 弟ノードの型
            const auto child_type = get_child_node_type( children, i );

            if ( child_type == NodeType::BRANCH ) {
                const auto tree_size = ref_value<uint16_t>( cursor );
                cursor += WORD_SIZE * tree_size;
            }
        }

        return cursor;
    }


  private:
    const byte_t* const root_bnode_;  // 最上位ノードへのポインタ
    const position_t    target_pos_;  // タイル上の目標位置 (ALCS)
    const int                limit_;  // レベル上限

};

} // namespace b3dtile
