#include "Tile.hpp"
#include "wasm_types.hpp"
#include <emscripten/emscripten.h>  // for EMSCRIPTEN_KEEPALIVE
#include <cstddef>  // for size_t
#include <cassert>

using std::size_t;
using b3dtile::Tile;


/** @brief b3dtile インスタンスを初期化
 *
 *  @param binary_copy  詳細は Tile.hpp を参照
 *  @param clip_result  詳細は Tile.hpp を参照
 */
extern "C" EMSCRIPTEN_KEEPALIVE
void
initialize( Tile::binary_copy_func_t* binary_copy,
            Tile::clip_result_func_t* clip_result )
{
    Tile::setup_javascript_functions( binary_copy, clip_result );
}


extern "C" EMSCRIPTEN_KEEPALIVE
Tile*
tile_create( wasm_i32_t size )
{
    assert( size > 0 );
    return new Tile{ static_cast<size_t>( size ) };
}


extern "C" EMSCRIPTEN_KEEPALIVE
void
tile_destroy( const Tile* tile )
{
    assert( tile );
    delete tile;
}


extern "C" EMSCRIPTEN_KEEPALIVE
void
tile_clip( const Tile* tile,
           wasm_f32_t     x,
           wasm_f32_t     y,
           wasm_f32_t     z,
           wasm_f32_t  size )
{
    tile->clip( x, y, z, size );
}
