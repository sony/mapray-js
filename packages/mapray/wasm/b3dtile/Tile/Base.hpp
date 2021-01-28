#pragma once

#include "../Tile.hpp"
#include "../Rect.hpp"
#include <array>
#include <limits>
#include <cstdint>   // for int8_t, uint8_t, uint16_t, uint32_t
#include <cstddef>   // for size_t


namespace b3dtile {

/** @brief 共通に使う実装用クラス
 *
 *  private 継承して簡単にアクセスできる。
 */
class Tile::Base {

  public:

    using   size_t = std::size_t;
    using   int8_t = std::int8_t;
    using uint16_t = std::uint16_t;
    using uint32_t = std::uint32_t;


    /** @brief 空間の次元数
     */
    static constexpr int DIM = 3;


    /** @brief 1 つの三角形の頂点数
     */
    static constexpr size_t NUM_TRI_CORNERS = 3;


    /** @brief カラーの要素数
     */
    static constexpr size_t NUM_COLOR_COMPOS = 3;


    /** @brief DESCENDANTS フィールドの先頭データからの位置
     */
    static constexpr size_t OFFSET_DESCENDANTS = 0;


    /** @brief ノードサイズの単位
     *
     *  TREE_SIZE の 1 単位のバイト数
     */
    static constexpr size_t WORD_SIZE = 4;


    // VINDEX, TINDEX, BINDEX のサイズを判定する値
    static constexpr size_t INDEX_SIZE_BORDER = 65536;  // 2^16


    /** @brief 実数型
     */
    using real_t = float;


    /** @brief 直方体の型
     */
    using rect_t = Rect<real_t, DIM>;


    /** @brief タイルの位置要素の型
     */
    using p_elem_t = std::uint16_t;


    /** @brief タイルの法線要素の型
     */
    using n_elem_t = std::int8_t;


    /** @brief タイルのカラー要素の型
     */
    using c_elem_t = std::uint8_t;


    /** @brief タイル全体の直方体 (ALCS)
     */
    static constexpr rect_t TILE_RECT = rect_t::create_cube( { 0, 0, 0 }, 1 );


    /** @brief ALCS から正規化 uint16 座標への変換係数
     */
    template<typename Type = real_t>
    static constexpr auto ALCS_TO_U16 = static_cast<Type>( std::numeric_limits<p_elem_t>::max() );


    /** @brief 三角形 (頂点インデックス)
     */
    class Triangle {

      public:
        /** @brief 初期化
         *
         *  @param triangles  三角形配列 (頂点インデックス配列)
         *  @param tid        三角形インデックス
         */
        template<typename VIndex>
        Triangle( const VIndex* triangles,
                  size_t              tid )
        {
            auto src = triangles + NUM_TRI_CORNERS * tid;

            std::copy( src, src + NUM_TRI_CORNERS, corners_.begin() );
        }


        /** @brief 角 cid の頂点インデックスを取得
         */
        size_t
        get_vertex_index( size_t cid ) const
        {
            return corners_[cid];
        }


        /** @brief 頂点インデックスの配列を参照
         */
        const auto&
        ref_corners() const
        {
            return corners_;
        }


      private:
        // 三角形の角 (頂点インデックス配列)
        std::array<size_t, NUM_TRI_CORNERS> corners_;

    };


    /** @brief 要素数からそのインデックス型のサイズを取得
     */
    static constexpr size_t
    get_index_size( size_t count )
    {
        return (count > INDEX_SIZE_BORDER) ? sizeof( uint32_t ) : sizeof( uint16_t );
    }


    /** @brief オブジェクトのポインタを取得
     *
     *  data から offset の位置の Type 型オブジェクトのポインタを取得する。
     */
    template<typename Type>
    static const Type*
    get_pointer( const byte_t* data,
                 size_t      offset = 0 )
    {
        return reinterpret_cast<const Type*>( data + offset );
    }


    /** @brief 値を読み込む
     *
     *  cursor の位置の Type 型の値を取得する。
     *  cursor に Type のサイズを加える。
     */
    template<typename Type>
    static Type
    read_value( const byte_t*& cursor )
    {
        const auto value = *reinterpret_cast<const Type*>( cursor );

        cursor += sizeof( Type );

        return value;
    }


    /** @brief 値の参照を取得
     *
     *  data から offset の位置の Type 型の値の参照を取得する。
     */
    template<typename Type>
    static const Type&
    ref_value( const byte_t* data,
               size_t      offset = 0 )
    {
        return *reinterpret_cast<const Type*>( data + offset );
    }


    /** @brief pos を N バイトアライメント
     */
    template<size_t N, typename Type>
    static Type
    get_aligned( const Type& pos )
    {
        return static_cast<Type>( (pos + N - 1) / N * N );
    }


    /** @brief 子ノードの領域を取得
     */
    template<typename T>
    static constexpr Rect<T, DIM>
    get_child_rect( const Rect<T, DIM>&          parent,
                    const std::array<int, DIM>& whiches )
    {
        Rect<T, DIM> rect;

        for ( size_t i = 0; i < DIM; ++i ) {
            const T hsize = (parent.upper[i] - parent.lower[i]) / 2;

            rect.lower[i] = parent.lower[i] + static_cast<T>( whiches[i] ) * hsize;
            rect.upper[i] = rect.lower[i] + hsize;
        }

        return rect;
    }


    /** @brief 子ノードの領域を取得
     */
    template<typename T>
    static constexpr Rect<T, DIM>
    get_child_rect( const Rect<T, DIM>& parent,
                    size_t              cindex )
    {
        Rect<T, DIM> rect;

        for ( size_t i = 0; i < DIM; ++i ) {
            const T    hsize = (parent.upper[i] - parent.lower[i]) / 2;
            const auto coord = static_cast<T>( (cindex >> i) & 1u );

            rect.lower[i] = parent.lower[i] + coord * hsize;
            rect.upper[i] = rect.lower[i] + hsize;
        }

        return rect;
    }

};

} // namespace b3dtile
