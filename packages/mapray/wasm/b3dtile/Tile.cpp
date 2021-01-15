#include "Tile.hpp"
#include "Tile/Base.hpp"
#include "Tile/Analyzer.hpp"
#include "Tile/DescDepth.hpp"
#include "Tile/Clipper.hpp"
#include <cassert>


namespace b3dtile {

Tile::binary_copy_func_t*
Tile::binary_copy_;

Tile::clip_result_func_t*
Tile::clip_result_;


void
Tile::setup_javascript_functions( binary_copy_func_t* binary_copy,
                                  clip_result_func_t* clip_result )
{
    binary_copy_ = binary_copy;
    clip_result_ = clip_result;
}


Tile::Tile( size_t size )
    : data_{ new byte_t[size] }
{
    // バイナリデータをコピー (JS の ArrayBuffer から data_ へ)
    binary_copy_( data_ );
}


Tile::~Tile()
{
    delete[] data_;
}


int
Tile::get_descendant_depth( double  x,
                            double  y,
                            double  z,
                            int limit ) const
{
    assert( limit >= 1 );
    return Tile::DescDepth{ data_, { x, y, z }, limit }.run();
}


void
Tile::clip( float    x,
            float    y,
            float    z,
            float size ) const
{
    assert( size > 0 );

    const auto clip_rect = Base::rect_t::create_cube( { x, y, z }, size );

    const Analyzer analyzer{ data_ };

    if ( clip_rect.includes( Base::TILE_RECT ) ) {
        /* タイルは clip_rect に包含されている */
        // タイルのデータをそのまま返す (最適化)
        clip_result_( static_cast<wasm_i32_t>( analyzer.num_vertices ),
                      static_cast<wasm_i32_t>( analyzer.num_triangles ),
                      analyzer.positions );
    }
    else {
        /* タイルは clip_rect からはみ出している */
        // クリッピング結果を返す
        Clipper{ analyzer, clip_rect }.run();
    }
}

} // namespace b3dtile
