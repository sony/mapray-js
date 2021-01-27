#include "../b3dtile/Tile.hpp"
#include "../b3dtile/Rect.hpp"
#include <boost/test/unit_test.hpp>
#include <filesystem>
#include <fstream>
#include <algorithm>
#include <vector>
#include <memory>

namespace utf = boost::unit_test;
namespace  fs = std::filesystem;
using b3dtile::Tile;
using b3dtile::Rect;


struct Env {

    Env()
    {
        Tile::setup_javascript_functions( &binary_copy,
                                          &clip_result,
                                          &ray_result );
    }


    static void
    binary_copy( void* dst_begin )
    {
        const auto src = static_cast<const Tile::byte_t*>( src_begin );
        const auto dst = static_cast<Tile::byte_t*>( dst_begin );

        std::copy( src, src + src_size, dst );
    }


    static void
    clip_result( wasm_i32_t /*num_vertices*/,
                 wasm_i32_t /*num_triangles*/,
                 const void*         /*data*/ )
    {}


    static void
    ray_result( wasm_f64_t /*distance*/,
                wasm_i32_t       /*id*/ )
    {}


    static inline const void* src_begin;
    static inline std::size_t src_size;

};


std::unique_ptr<Tile>
create_tile( const fs::path& path )
{
    if ( !fs::exists( path ) ) {
        throw std::runtime_error( "file cannot be found: " + path.string() );
    }

    std::ifstream ifs{ path, std::ios_base::binary };

    std::vector<char> buffer( fs::file_size( path ) );
    ifs.read( buffer.data(), buffer.size() );

    Env::src_begin = buffer.data();
    Env::src_size  = buffer.size();

    return std::make_unique<Tile>( Env::src_size );
}


BOOST_FIXTURE_TEST_SUITE( b3dtile_suite, Env )


BOOST_AUTO_TEST_CASE( tile_constructor )
{
    BOOST_CHECK_NO_THROW( create_tile( "tile.bin" ) );
}


BOOST_AUTO_TEST_CASE( tile_clip_full )
{
    const auto tile = create_tile( "tile.bin" );

    BOOST_CHECK_NO_THROW( tile->clip( 0, 0, 0, 1 ) );
}


BOOST_AUTO_TEST_CASE( tile_clip_part )
{
    const auto tile = create_tile( "tile.bin" );

    const size_t num_divs = 4;
    const float      size = 1.0f / num_divs;

    for ( float z = 0; z < 1; z += size ) {
        for ( float y = 0; y < 1; y += size ) {
            for ( float x = 0; x < 1; x += size ) {
                BOOST_CHECK_NO_THROW( tile->clip( x, y, z, size ) );
            }
        }
    }
}


BOOST_AUTO_TEST_CASE( tile_descendant_depth )
{
    const auto tile = create_tile( "tile.bin" );

    const size_t num_divs = 64;
    const double     size = 1.0 / num_divs;

    int min_depth = 1000;
    int max_depth = 0;

    for ( double z = 0; z < 1; z += size ) {
        for ( double y = 0; y < 1; y += size ) {
            for ( double x = 0; x < 1; x += size ) {
                const auto depth = tile->get_descendant_depth( x, y, z, 100 );
                min_depth = std::min( min_depth, depth );
                max_depth = std::max( max_depth, depth );
            }
        }
    }

    BOOST_CHECK( min_depth >= 0 );
    BOOST_CHECK( max_depth <= 100 );
}



BOOST_AUTO_TEST_CASE( tile_find_ray_distance )
{
    const auto tile = create_tile( "tile.bin" );

    const auto rect = Rect<float, Tile::DIM>::create_cube( { 0, 0, 0 }, 1 );

    tile->find_ray_distance( { 0, 0, 0 }, { 1, 1, 1 }, 100, rect );
}


BOOST_AUTO_TEST_SUITE_END()
