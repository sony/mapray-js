#include "Clipper.hpp"


namespace b3dtile {

using Clipper = Tile::Clipper;


Clipper::Clipper( const Analyzer&   adata,
                  const rect_t& clip_rect )
    : adata_{ adata },
      bcollect_{ adata, clip_rect },
      index_map_A_{ adata.num_vertices }
{
    bcollect_.run();

    // clip_rect_ の座標系の変換と境界調整
    for ( size_t i = 0; i < DIM; ++i ) {
        clip_rect_.lower[i] = ALCS_TO_U16 * clip_rect.lower[i];
        clip_rect_.upper[i] = (clip_rect.upper[i] < 1) ?
                              (ALCS_TO_U16 * clip_rect.upper[i]) :
                              ALCS_TO_U16 * (1 + std::numeric_limits<real_t>::epsilon());

        // タイル生成時の最後の数値丸めにより clip_rect.upper[x] == 1 の面に張り
        // 付いている三角形が存在することがある。もともと開区間のタイル内に入っ
        // ていたはずなので、タイル内に存在するように見せるための調整をしている
    }
}


void
Clipper::run()
{
    if ( adata_.vindex_size == sizeof( uint16_t ) ) {
        if ( adata_.tindex_size == sizeof( uint16_t ) ) {
            collect_polygons<uint16_t, uint16_t>();
        }
        else {
            collect_polygons<uint16_t, uint32_t>();
        }
    }
    else {
        if ( adata_.tindex_size == sizeof( uint16_t ) ) {
            collect_polygons<uint32_t, uint16_t>();
        }
        else {
            collect_polygons<uint32_t, uint32_t>();
        }
    }

    Result{ *this }.run();
}

} // namespace b3dtile
