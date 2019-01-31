import GeoMath from "./GeoMath";
import DemSamplerLinear from "./DemSamplerLinear";
import DemSamplerNearest from "./DemSamplerNearest";
import AvgHeightMaps from "./AvgHeightMaps";


/**
 * @summary DEM バイナリーデータ
 * @memberof mapray
 * @private
 * @see mapray.DemSampler
 */
class DemBinary {

    /**
     * @param {number}      z      ズームレベル
     * @param {number}      x      X タイル座標
     * @param {number}      y      Y タイル座標
     * @param {number}      ρ     解像度の指数
     * @param {ArrayBuffer} array  DEM 配列データ
     */
    constructor( z, x, y, ρ, array )
    {
        this._z = z;
        this._x = x;
        this._y = y;
        this._ρ= ρ;

        // ヘッダー情報を取得
        var header = new DataView( array );
        this._qlevels = [
            header.getUint8( DemBinary.OFFSET_QLEVEL_00 ),              // 四分存在レベル (左上)
            header.getUint8( DemBinary.OFFSET_QLEVEL_10 ),              // 四分存在レベル (右上)
            header.getUint8( DemBinary.OFFSET_QLEVEL_01 ),              // 四分存在レベル (左下)
            header.getUint8( DemBinary.OFFSET_QLEVEL_11 )               // 四分存在レベル (右下)
        ];
        this._hmin = header.getFloat32( DemBinary.OFFSET_HMIN, true );  // 最小標高
        this._hmax = header.getFloat32( DemBinary.OFFSET_HMAX, true );  // 最大標高
        this._ω = this._createωArray( header );                       // 複雑度

        // 標高配列への参照を取得
        this._body = new DataView( array, DemBinary.HEADER_BYTES );

        // 標高配列の 1 行の標高数
        this._size = (1 << ρ) + 1;
    }


    /**
     * @summary ズームレベル
     * @type {number}
     * @readonly
     */
    get z()
    {
        return this._z;
    }


    /**
     * @summary X タイル座標
     * @type {number}
     * @readonly
     */
    get x()
    {
        return this._x;
    }


    /**
     * @summary Y タイル座標
     * @type {number}
     * @readonly
     */
    get y()
    {
        return this._y;
    }


    /**
     * @summary 最小標高
     * @desc
     * <p>このタイルに対応する地表の領域で最も低い点の標高を返す。</p>
     * <p>この値は this の葉タイルのデータに基づいているので、this の個々のサンプル値の最小値よりも小さい値の可能性があることに注意されたい。</p>
     * @type {number}
     * @readonly
     */
    get height_min()
    {
        return this._hmin;
    }


    /**
     * @summary 最大標高
     * <p>このタイルに対応する地表の領域で最も高い点の標高を返す。</p>
     * <p>この値は this の葉タイルのデータに基づいているので、this の個々のサンプル値の最大値よりも大きい値の可能性があることに注意されたい。</p>
     * @type {number}
     * @readonly
     */
    get height_max()
    {
        return this._hmax;
    }

    /**
     * @summary 地表断片に対して葉タイルか？
     * @desc
     * <p>地表断片 [zg, xg, yg] に対して、this はサーバー内で最も詳細な DEM データであるかどうかを返す。</p>
     * <p>制約: [zg, xg, yg] の領域は this と同じまたは包含されていること。</p>
     * @param  {number}   zg  分割レベル
     * @param  {number}   xg  X 座標
     * @param  {number}   yg  Y 座標
     * @return {boolean}      葉タイルのとき true, それ以外は false
     */
    isLeaf( zg, xg, yg )
    {
        if ( zg > this._z ) {
            return this.getQuadLevel( zg, xg, yg ) == 0;
        }
        else {
            var q = this._qlevels;
            return (q[0] == 0) || (q[1] == 0) || (q[2] == 0) || (q[3] == 0);
        }
    }


    /**
     * @summary 四分存在レベルを取得
     * @desc
     * <p>制約: zg > this.z かつ [zg, xg, yg] の領域は this に包含されていること。</p>
     * @param  {number}   zg  分割レベル
     * @param  {number}   xg  X 座標
     * @param  {number}   yg  Y 座標
     * @return {number}       四分存在レベル
     */
    getQuadLevel( zg, xg, yg )
    {
        var pow = Math.pow( 2, this._z - zg );
        var   u = Math.floor( 2 * ((xg + 0.5) * pow - this._x) );
        var   v = Math.floor( 2 * ((yg + 0.5) * pow - this._y) );
        return this._qlevels[2*v + u];
    }


    /**
     * @summary 四分存在レベルを取得
     * @desc
     * <p>基底タイル座標 (左上(0, 0)、右下(1, 1)) [xt, yt] を含む領域の四分存在レベルを取得する。</p>
     * <p>制約: [xt, yt] の領域は this に包含されていること。</p>
     * @param  {number} xt  X 座標
     * @param  {number} yt  Y 座標
     * @return {number}     四分存在レベル
     */
    getQuadLevelDirect( xt, yt )
    {
        var pow = Math.round( Math.pow( 2, this._z + 1 ) );
        var   u = GeoMath.clamp( Math.floor( xt * pow ), 0, pow - 1 ) % 2;
        var   v = GeoMath.clamp( Math.floor( yt * pow ), 0, pow - 1 ) % 2;
        return this._qlevels[2*v + u];
    }


    /**
     * @summary 標高点正方形の4隅の標高を取得
     * @desc
     * <p>注意: 次の呼び出しで、結果配列は上書きされる。</p>
     * @param  {number} u  水平方向の標高点正方形位置
     * @param  {number} v  垂直方向の標高点正方形位置
     * @return {array}     4隅の標高の配列 [左上, 右上, 左下, 右下]
     */
    getHeights( u, v )
    {
        var FLT_BYTES = 4;
        var    origin = FLT_BYTES * (v * this._size + u);
        var     pitch = FLT_BYTES * this._size;

        var h = DemBinary._getHeights_result;
        h[0] = this._body.getFloat32( origin,                     true );
        h[1] = this._body.getFloat32( origin + FLT_BYTES,         true );
        h[2] = this._body.getFloat32( origin + pitch,             true );
        h[3] = this._body.getFloat32( origin + pitch + FLT_BYTES, true );
        return h;
    }


    /**
     * @summary 地表断片の分割指数を取得
     * @desc
     * <p>注意: 次の呼び出しで、結果配列は上書きされる。</p>
     * @param  {mapray.Globe.Flake} flake  地表断片
     * @param  {number}           lod    地表詳細レベル (LOD)
     * @param  {number}           cu     水平球面分割レベル
     * @param  {number}           cv     垂直球面分割レベル
     * @return {array}                   [水平分割指数, 垂直分割指数]
     */
    getDivisionPowers( flake, lod, cu, cv )
    {
        var zg = flake.z;
        var ze = this._z;
        var  b = GeoMath.LOG2PI - this._ρ + 1;  // b = log2π - ρ + 1
        var ω = this._getComplexity( zg, flake.x, flake.y );

        // {gu, gv} = max( {cu, cv}, min( ze + ρ, round( lod + b + ω ) ) − zg )
        var arg = Math.min( ze + this._ρ, Math.round( lod + b + ω ) ) - zg;

        var result = DemBinary._getDivisionPowers_result;
        result[0] = Math.max( cu, arg );  // 水平分割指数
        result[1] = Math.max( cv, arg );  // 垂直分割指数
        return result;
    }


    /**
     * @summary DEM サンプラーを生成
     * @param  {mapray.Flake} flake  地表断片
     * @return {mapray.DemSampler}   DEM サンプラー
     */
    newSampler( flake )
    {
        // 今のところ、地表断片が 1 標高点またはそれ以上のとき、最近傍サンプラーでも結果が
        // 変わらないので、最適化のためにサンプラーを別けている
        var samplerClass = (flake.z - this._z > this._ρ) ? DemSamplerLinear : DemSamplerNearest;
        return new samplerClass( this._z, this._x, this._y, this._ρ, this._body );
    }


    /**
     * @summary 平均標高マップを生成
     * @return {mapray.AvgHeightMaps}  平均標高マップ
     */
    newAvgHeightMaps()
    {
        return new AvgHeightMaps( this._ρ, this._body );
    }


    /**
     * @private
     */
    _createωArray( header )
    {
        var FLT_BYTES = 4;

        var ωs = [];
        var offset = 0;
        for ( var down = 0; down < 3; ++down ) {
            var count = 1 << (2 * down);
            var array = new Float32Array( count );
            for ( var i = 0; i < count; ++i ) {
                array[i] = header.getFloat32( DemBinary.OFFSET_ω + offset, true );
                offset += FLT_BYTES;
            }
            ωs.push( array );
        }

        return ωs;
    }


    /**
     * @summary 複雑度を取得
     * @desc
     * <p>this 上の地表断片 (zg, xg, yg) の複雑度 (ω) を取得する。</p>
     * @param  {number}  zg  分割レベル
     * @param  {number}  xg  X 座標
     * @param  {number}  yg  Y 座標
     * @return {number}      複雑度
     * @private
     */
    _getComplexity( zg, xg, yg )
    {
        var d = zg - this._z;
        var p = Math.round( Math.pow( 2, d ) );

        var dmax = 2;  // this._ω.length - 1
        var smax = 4;  // 2^c

        var u;
        var v;
        if ( d <= dmax ) {
            u = xg - p * this._x;
            v = yg - p * this._y;
        }
        else {
            u = Math.floor( smax * ((xg + 0.5) / p - this._x) );
            v = Math.floor( smax * ((yg + 0.5) / p - this._y) );
        }

        var index = Math.min( d, dmax );
        var array = this._ω[index];
        return Math.min( array[v * (1 << index) + u], DemBinary.ω_limit );
    }

}


DemBinary.OFFSET_QLEVEL_00 = 0;
DemBinary.OFFSET_QLEVEL_10 = 1;
DemBinary.OFFSET_QLEVEL_01 = 2;
DemBinary.OFFSET_QLEVEL_11 = 3;
DemBinary.OFFSET_HMIN      = 4;
DemBinary.OFFSET_HMAX      = 8;
DemBinary.OFFSET_ω        = 12;
DemBinary.HEADER_BYTES     = 96;
DemBinary.ω_limit         = 6;
DemBinary._getHeights_result        = new Array( 4 );
DemBinary._getDivisionPowers_result = new Array( 2 );


export default DemBinary;
