#pragma once

#include "Base.hpp"
#include <array>
#include <cassert>


namespace b3dtile {

/** @brief バイナリを解析
 *
 *  構築子を実行した後に、タイル情報のメンバー変数にアクセスできる。
 */
class Tile::Analyzer : Base {

    // バイナリフォーマットの情報
    static constexpr uint32_t FLAG_N_ARRAY  = (1u << 0);
    static constexpr uint32_t FLAG_C_ARRAY  = (1u << 1);
    static constexpr uint32_t FLAG_TRI_TREE = (1u << 8);


  public:
    // 要素数
    size_t  num_vertices;
    size_t num_triangles;
    size_t   num_tblocks;

    // インデックス型のバイト数
    size_t vindex_size;
    size_t tindex_size;
    size_t bindex_size;

    // 要素配列
    const p_elem_t* positions;
    const void*     triangles;  // vindex_t[]
    const n_elem_t*   n_array;  // optional
    const c_elem_t*   c_array;  // optional

    // 三角形ツリー (optional)
    const void* tblock_table;  // tindex_t[]
    const byte_t*  root_node;


  public:
    /** @brief 初期化
     *
     *  @param data  タイルのバイナリーデータ
    */
    explicit
    Analyzer( const byte_t* data )
        : num_tblocks{ 0 },
          bindex_size{ 0 },
          n_array{ nullptr },
          c_array{ nullptr},
          tblock_table{ nullptr },
          root_node{ nullptr }
    {
        const auto tree_size = ref_value<uint16_t>( data, OFFSET_DESCENDANTS );
        const byte_t* cursor = data + OFFSET_DESCENDANTS + WORD_SIZE * tree_size;

        // CONTENTS
        const auto contents = read_value<uint32_t>( cursor );

        num_vertices  = read_value<uint32_t>( cursor );
        num_triangles = read_value<uint32_t>( cursor );

        vindex_size = get_index_size( num_vertices );
        tindex_size = get_index_size( num_triangles );

        size_t offset = cursor - data;

        // 位置配列 (POSITIONS)
        positions = get_pointer<p_elem_t>( data, offset );
        offset += get_aligned<4>( DIM * sizeof( p_elem_t ) * num_vertices );

        // 三角形配列 (TRIANGLES)
        triangles = get_pointer<void>( data, offset );
        offset += get_aligned<4>( NUM_TRI_CORNERS * vindex_size * num_triangles );

        // 法線配列 (N_ARRAY)
        if ( contents & FLAG_N_ARRAY ) {
            n_array = get_pointer<n_elem_t>( data, offset );
            offset += get_aligned<4>( DIM * sizeof( n_elem_t ) * num_vertices );
        }

        // カラー配列 (C_ARRAY)
        if ( contents & FLAG_C_ARRAY ) {
            c_array = get_pointer<c_elem_t>( data, offset );
            offset += get_aligned<4>( NUM_COLOR_COMPOS * sizeof( c_elem_t ) * num_vertices );
        }

        // 三角形ツリー
        if ( contents & FLAG_TRI_TREE ) {
            num_tblocks = ref_value<uint32_t>( data, offset );
            offset += sizeof( uint32_t );

            bindex_size = get_index_size( num_tblocks );

            tblock_table = get_pointer<void>( data, offset );
            offset += get_aligned<4>( tindex_size * num_tblocks );

            root_node = get_pointer<byte_t>( data, offset );
        }
    }


    /** @brief 位置を取得
     */
    template<typename EType>
    std::array<EType, DIM>
    get_position( size_t vid ) const
    {
        const auto coords = positions + DIM * vid;

        std::array<EType, DIM> result;

        for ( size_t i = 0; i < DIM; ++i ) {
            result[i] = static_cast<EType>( coords[i] );
        }

        return result;
    }


    /** @brief 三角形の頂点インデックス配列を取得
     */
    template<typename ViType>
    std::array<size_t, NUM_TRI_CORNERS>
    get_triangle( size_t tid ) const
    {
        assert( vindex_size == sizeof( ViType ) );

        std::array<size_t, NUM_TRI_CORNERS> result;

        const void* const addr = static_cast<const byte_t*>( triangles ) + NUM_TRI_CORNERS * sizeof( ViType ) * tid;

        for ( size_t i = 0; i < NUM_TRI_CORNERS; ++i ) {
            result[i] = static_cast<const ViType*>( addr )[i];
        }

        return result;
    }


    Analyzer( const Analyzer& ) = delete;
    void operator=( const Analyzer& ) = delete;

};

} // namespace b3dtile
