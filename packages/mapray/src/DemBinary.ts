import { Area } from "./AreaUtil";
import GeoMath from "./GeoMath";
import DemSampler from "./DemSampler";
import DemSamplerLinear from "./DemSamplerLinear";
import DemSamplerNearest from "./DemSamplerNearest";
import AvgHeightMaps from "./AvgHeightMaps";


/**
 * DEM バイナリーデータ
 *
 * @see DemSampler
 */
class DemBinary implements Area {

    // from Area
    readonly z: number;
    readonly x: number;
    readonly y: number;


    /**
     * 最小標高
     *
     * このタイルに対応する地表の領域で最も低い点の標高を返す。
     *
     * この値は this の葉タイルのデータに基づいているので、this の個々
     * のサンプル値の最小値よりも小さい値の可能性があることに注意され
     * たい。
     */
    readonly height_min: number;


    /**
     * 最大標高
     *
     * このタイルに対応する地表の領域で最も高い点の標高を返す。
     *
     * この値は this の葉タイルのデータに基づいているので、this の個々
     * のサンプル値の最大値よりも大きい値の可能性があることに注意され
     * たい。
     */
    readonly height_max: number;


    /**
     * @param z      ズームレベル
     * @param x      X タイル座標
     * @param y      Y タイル座標
     * @param ρ     解像度の指数
     * @param array  DEM 配列データ
     */
    constructor( z:     number,
                 x:     number,
                 y:     number,
                 ρ:    number,
                 array: ArrayBuffer )
    {
        this.z = z;
        this.x = x;
        this.y = y;

        this._ρ= ρ;

        // ヘッダー情報を取得
        var header = new DataView( array );
        this._qlevels = [
            header.getUint8( DemBinary.OFFSET_QLEVEL_00 ),              // 四分存在レベル (左上)
            header.getUint8( DemBinary.OFFSET_QLEVEL_10 ),              // 四分存在レベル (右上)
            header.getUint8( DemBinary.OFFSET_QLEVEL_01 ),              // 四分存在レベル (左下)
            header.getUint8( DemBinary.OFFSET_QLEVEL_11 )               // 四分存在レベル (右下)
        ];
        this.height_min = header.getFloat32( DemBinary.OFFSET_HMIN, true );  // 最小標高
        this.height_max = header.getFloat32( DemBinary.OFFSET_HMAX, true );  // 最大標高
        this._ω = this._createωArray( header );                       // 複雑度

        // 標高配列への参照を取得
        this._body = new DataView( array, DemBinary.HEADER_BYTES );

        // 標高配列の 1 行の標高数
        this._size = (1 << ρ) + 1;
    }


    /**
     * 地表断片に対して葉タイルか？
     *
     * 地表断片 [zg, xg, yg] に対して、this はサーバー内で最も詳細な
     * DEM データであるかどうかを返す。
     *
     * 制約: [zg, xg, yg] の領域は this と同じまたは包含されていること。
     *
     * @param zg  分割レベル
     * @param xg  X 座標
     * @param yg  Y 座標
     * @returns   葉タイルのとき true, それ以外は false
     */
    isLeaf( zg: number,
            xg: number,
            yg: number ): boolean
    {
        if ( zg > this.z ) {
            return this.getQuadLevel( zg, xg, yg ) == 0;
        }
        else {
            var q = this._qlevels;
            return (q[0] == 0) || (q[1] == 0) || (q[2] == 0) || (q[3] == 0);
        }
    }


    /**
     * 四分存在レベルを取得
     *
     * 制約: zg > this.z かつ [zg, xg, yg] の領域は this に包含されて
     * いること。
     *
     * @param zg  分割レベル
     * @param xg  X 座標
     * @param yg  Y 座標
     * @returns   四分存在レベル
     */
    getQuadLevel( zg: number,
                  xg: number,
                  yg: number ): number
    {
        var pow = Math.pow( 2, this.z - zg );
        var   u = Math.floor( 2 * ((xg + 0.5) * pow - this.x) );
        var   v = Math.floor( 2 * ((yg + 0.5) * pow - this.y) );
        return this._qlevels[2*v + u];
    }


    /**
     * 四分存在レベルを取得
     *
     * 基底タイル座標 (左上(0, 0)、右下(1, 1)) [xt, yt] を含む領域の四
     * 分存在レベルを取得する。
     *
     * 制約: [xt, yt] の領域は this に包含されていること。
     *
     * @param xt - X 座標
     * @param yt - Y 座標
     *
     * @returns  四分存在レベル
     */
    getQuadLevelDirect( xt: number,
                        yt: number ): number
    {
        var pow = Math.round( Math.pow( 2, this.z + 1 ) );
        var   u = GeoMath.clamp( Math.floor( xt * pow ), 0, pow - 1 ) % 2;
        var   v = GeoMath.clamp( Math.floor( yt * pow ), 0, pow - 1 ) % 2;
        return this._qlevels[2*v + u];
    }


    /**
     * 標高点正方形の4隅の標高を取得
     *
     * 注意: 次の呼び出しで、結果配列は上書きされる。
     *
     * @param u - 水平方向の標高点正方形位置
     * @param v - 垂直方向の標高点正方形位置
     *
     * @returns  4隅の標高の配列 [左上, 右上, 左下, 右下]
     */
    getHeights( u: number, v: number ): number[]
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
     * 地表断片の分割指数を取得
     *
     * 注意: 次の呼び出しで、結果配列は上書きされる。
     *
     * @param flake_area  地表断片の領域
     * @param lod         地表詳細レベル (LOD)
     * @param cu          水平球面分割レベル (>= 0, 整数)
     * @param cv          垂直球面分割レベル (>= 0, 整数)
     *
     * @returns  [水平分割指数, 垂直分割指数]
     */
    getDivisionPowers( flake_area: Area,
                       lod:      number,
                       cu:       number,
                       cv:       number ): [number, number]
    {
        var zg = flake_area.z;
        var ze = this.z;
        var  b = GeoMath.LOG2PI - this._ρ + 1;  // b = log2π - ρ + 1
        var ω = this._getComplexity( zg, flake_area.x, flake_area.y );

        // {gu, gv} = max( {cu, cv}, min( ze + ρ, round( lod + b + ω ) ) − zg )
        var arg = Math.min( ze + this._ρ, Math.round( lod + b + ω ) ) - zg;

        var result = DemBinary._getDivisionPowers_result;
        result[0] = Math.max( cu, arg );  // 水平分割指数
        result[1] = Math.max( cv, arg );  // 垂直分割指数
        return result;
    }


    /**
     * DEM サンプラーを生成
     *
     * @param flake_area  地表断片の領域
     *
     * @returns  DEM サンプラー
     */
    newSampler( flake_area: Area ): DemSampler
    {
        // 今のところ、地表断片が 1 標高点またはそれ以上のとき、最近傍サンプラーでも結果が
        // 変わらないので、最適化のためにサンプラーを別けている
        var samplerClass = (flake_area.z - this.z > this._ρ) ? DemSamplerLinear : DemSamplerNearest;
        return new samplerClass( this, this._ρ, this._body );
    }


    /**
     * 線形 DEM サンプラーを生成
     *
     * @returns  DEM サンプラー
     */
    newLinearSampler(): DemSamplerLinear
    {
        return new DemSamplerLinear( this, this._ρ, this._body );
    }


    /**
     * 平均標高マップを生成
     *
     * @return  平均標高マップ
     */
    newAvgHeightMaps(): AvgHeightMaps
    {
        return new AvgHeightMaps( this._ρ, this._body );
    }


    private _createωArray( header: DataView ): Float32Array[]
    {
        var FLT_BYTES = 4;

        var ωs: Float32Array[] = [];
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
     * 複雑度を取得
     *
     * @param zg  分割レベル
     * @param xg  X 座標
     * @param yg  Y 座標
     *
     * @returns  複雑度
     */
    private _getComplexity( zg: number,
                            xg: number,
                            yg: number ): number
    {
        var d = zg - this.z;
        var p = Math.round( Math.pow( 2, d ) );

        var dmax = 2;  // this._ω.length - 1
        var smax = 4;  // 2^c

        var u;
        var v;
        if ( d <= dmax ) {
            u = xg - p * this.x;
            v = yg - p * this.y;
        }
        else {
            u = Math.floor( smax * ((xg + 0.5) / p - this.x) );
            v = Math.floor( smax * ((yg + 0.5) / p - this.y) );
        }

        var index = Math.min( d, dmax );
        var array = this._ω[index];
        return Math.min( array[v * (1 << index) + u], DemBinary.ω_limit );
    }


    private _ρ:      number;
    private _qlevels: number[];
    private _ω:      Float32Array[];
    private _body:    DataView;
    private _size:    number;

    private static readonly OFFSET_QLEVEL_00 = 0;
    private static readonly OFFSET_QLEVEL_10 = 1;
    private static readonly OFFSET_QLEVEL_01 = 2;
    private static readonly OFFSET_QLEVEL_11 = 3;
    private static readonly OFFSET_HMIN      = 4;
    private static readonly OFFSET_HMAX      = 8;
    private static readonly OFFSET_ω        = 12;
    private static readonly HEADER_BYTES     = 96;
    static ω_limit                           = 6;

    private static readonly _getHeights_result: [number, number, number, number] = [0, 0, 0, 0];
    private static readonly _getDivisionPowers_result: [number, number] = [0, 0];

}


export default DemBinary;
