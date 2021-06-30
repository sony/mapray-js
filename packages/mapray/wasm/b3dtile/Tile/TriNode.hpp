#pragma once

#include "Base.hpp"
#include <cassert>


namespace b3dtile {

/** @brief 三角形ツリーのノード
 */
class Tile::TriNode : Base {

    enum class Type {
        NONE   = 0,
        BRANCH = 1,
        LEAF   = 2,
    };

  public:
    /** @brief 初期化
     */
    explicit
    TriNode( const byte_t* data )
        : type_{ Type::BRANCH },
          data_{ data } {}


    bool
    is_none() const { return type_ == Type::NONE; }


    bool
    is_branch_type() const { return type_ == Type::BRANCH; }


    bool
    is_leaf_type() const { return type_ == Type::LEAF; }


    /** @brief 子ノードを取得
     *
     *  @tparam BiType  三角形ブロックインデックスの型
     *
     *  @param cindex  子ノードのインデックス
     */
    template<typename BiType>
    TriNode
    get_child( size_t cindex ) const
    {
        assert( is_branch_type() );

        const byte_t* cursor = data_;

        // TREE_SIZE
        size_t tree_size = read_value<uint16_t>( cursor );

        // CHILDREN
        const unsigned children = read_value<uint16_t>( cursor );

        if ( tree_size == 0 ) {
            // TREE_SIZE_EX
            tree_size = read_value<uint32_t>( cursor );
        }

        // cindex より前の子を読み飛ばす
        for ( size_t i = 0; i < cindex; ++i ) {
            const auto cnode_type = static_cast<Type>( (children >> (2 * i)) & 0b11u );
            if ( cnode_type == Type::BRANCH ) {
                cursor = skip_branch( cursor );
            }
            else if ( cnode_type == Type::LEAF ) {
                cursor = skip_leaf<BiType>( cursor );
            }
            else {
                assert( cnode_type == Type::NONE );
            }
        }

        const auto type = static_cast<Type>( (children >> (2 * cindex)) & 0b11u );
        return TriNode{ type, cursor };
    }


    /** @brief 三角形ブロック数を取得
     */
    size_t
    num_tblocks() const
    {
        assert( is_leaf_type() );

        const byte_t* cursor = data_;

        // NUM_BLOCKS
        const size_t num_blocks = read_value<uint32_t>( cursor );

        return num_blocks;
    }


    /** @brief 三角形ブロックのインデックス配列を取得
     */
    template<typename BiType>
    const BiType*
    get_tblock_indices() const
    {
        assert( is_leaf_type() );

        const auto offset = sizeof( uint32_t );

        return get_pointer<BiType>( data_, offset );
    }


  private:
    TriNode( Type          type,
             const byte_t* data )
        : type_{ type },
          data_{ data } {}


    /** @brief 枝ノードを読み飛ばし
     */
    static const byte_t*
    skip_branch( const byte_t* data )
    {
        const byte_t* cursor = data;

        // TREE_SIZE
        size_t tree_size = read_value<uint16_t>( cursor );

        // CHILDREN
        read_value<uint16_t>( cursor );

        if ( tree_size == 0 ) {
            // TREE_SIZE_EX
            tree_size = read_value<uint32_t>( cursor );
        }

        return data + WORD_SIZE * tree_size;
    }


    /** @brief 葉ノードを読み飛ばし
     */
    template<typename BiType>
    static const byte_t*
    skip_leaf( const byte_t* data )
    {
        const byte_t* cursor = data;

        // NUM_BLOCKS
        const size_t num_blocks = read_value<uint32_t>( cursor );

        // BLOCK_INDICES
        cursor += get_aligned<4>( sizeof( BiType ) * num_blocks );

        return cursor;
    }


  private:
    Type          type_;
    const byte_t* data_;

};

} // namespace b3dtile
