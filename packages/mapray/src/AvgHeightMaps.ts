/**
 * 平均標高マップ
 *
 * @see {@link DemBinary}
 */
class AvgHeightMaps {

    private _ρ:   number;
    private _maps: Float32Array[];


    /**
     * @param ρ   - 解像度の指数
     * @param body - DEM 配列データの標高データ部分
     */
    constructor( ρ:   number,
                 body: DataView )
    {
        this._ρ   = ρ;
        this._maps = [];   // Level: -1, -2, ..., -ρ

        if ( ρ >= 1 ) {
            // Level: -1
            var first_map = this._create_first_map( body );
            this._maps.push( first_map );

            // Level: -2 .. -ρ
            var src_map = first_map;
            for ( var lv = -2; lv >= -ρ; --lv ) {
                var next_map = this._create_next_map( lv, src_map );
                this._maps.push( next_map );
                src_map = next_map;
            }
        }
    }


    /**
     * レベル -1 の平均標高マップを生成
     *
     * @param src - DEM 配列データの標高データ部分
     *
     * @returns  レベル -1 の平均標高マップ
     */
    private _create_first_map( src: DataView ): Float32Array
    {
        var FLT_BYTES = 4;

        var size = 1 << (this._ρ - 1);
        var  dst = new Float32Array( size * size );

        var src_pitch = (2*size + 1) * FLT_BYTES;
        var dst_pitch = size;

        for ( var j = 0; j < size; ++j ) {
            var src_index = 2*j * src_pitch;
            var dst_index =   j * dst_pitch;

            for ( var i = 0; i < size; ++i ) {
                // 標高データを取り出す
                var h00 = src.getFloat32( src_index,                             true );
                var h10 = src.getFloat32( src_index + FLT_BYTES,                 true );
                var h20 = src.getFloat32( src_index + 2*FLT_BYTES,               true );
                var h01 = src.getFloat32( src_index + src_pitch,                 true );
                var h11 = src.getFloat32( src_index + src_pitch + FLT_BYTES,     true );
                var h21 = src.getFloat32( src_index + src_pitch + 2*FLT_BYTES,   true );
                var h02 = src.getFloat32( src_index + 2*src_pitch,               true );
                var h12 = src.getFloat32( src_index + 2*src_pitch + FLT_BYTES,   true );
                var h22 = src.getFloat32( src_index + 2*(src_pitch + FLT_BYTES), true );

                // 平均標高を書き込む
                dst[dst_index] = (h00 + 2*h10 + h20 + 2*h01 + 4*h11 + 2*h21 + h02 + 2*h12 + h22) / 16;

                src_index += 2*FLT_BYTES;
                dst_index += 1;
            }
        }

        return dst;
    }


    /**
     * レベル -2 .. -ρ の平均標高マップを生成
     *
     * @param lv  - 生成するマップのレベル
     * @param src - 元となる平均標高マップ (レベル lv + 1)
     *
     * @returns  レベル lv の平均標高マップ
     */
    private _create_next_map( lv:  number,
                              src: Float32Array ): Float32Array
    {
        var size = 1 << (this._ρ + lv);
        var  dst = new Float32Array( size * size );

        var src_pitch = 2*size;
        var dst_pitch =   size;

        for ( var j = 0; j < size; ++j ) {
            var src_index = 2*j * src_pitch;
            var dst_index =   j * dst_pitch;

            for ( var i = 0; i < size; ++i ) {
                // 標高データを取り出す
                var h00 = src[src_index];
                var h10 = src[src_index + 1];
                var h01 = src[src_index + src_pitch];
                var h11 = src[src_index + src_pitch + 1];

                // 平均標高を書き込む
                dst[dst_index] = (h00 + h10 + h01 + h11) / 4;

                src_index += 2;
                dst_index += 1;
            }
        }

        return dst;
    }


    /**
     * 平均標高を取得
     *
     * 地表断片 <zg, xg, yg> の平均標高を取得する。
     *
     * @param zg - 地表断片分割レベル (0 <= zg < ρ)
     * @param xg - 地表断片 X 座標
     * @param yg - 地表断片 Y 座標
     *
     * @returns  平均標高
     */
    sample( zg: number,
            xg: number,
            yg: number ): number
    {
        var  map = this._maps[this._ρ - zg - 1];
        var size = 1 << zg;
        return map[yg * size + xg];
    }

}


export default AvgHeightMaps;
