import DemProvider from "./DemProvider";
import { cfa_assert } from "./util/assertion";

/**
 * 標高0の地形を生成する DEM プロバイダ
 *
 * 標高が一定 (フラット) な地形を生成する [[DemProvider]] の実装である。
 *
 * 同一レベルのタイルは同じインスタンスを返却します。
 *
 * 標高は [[constructor]] の `options` で [[Option.height]] を指定する。
 */
class FlatDemProvider extends DemProvider {

    constructor( option?: FlatDemProvider.Option ) {
        super( new FlatDemProvider.Hook( option ) );
    }

}


const FLT_BYTES = 4;


namespace FlatDemProvider {



export class Hook implements DemProvider.Hook {

    private readonly _buffers: ArrayBuffer[];

    /**
     * 配信を行う最大ズームレベル
     */
    private readonly _max_level: number;


    /**
     * 解像度の指数
     */
    private readonly _rho: number;


    /**
     * これは互換用の初期化で、[[Option.max_level]] プロパティ
     * を指定することと同じである。
     *
     * @param max_level - 最大レベル
     */
    constructor( max_level: number );


    /**
     * パラメータ `options` の内容に従って初期化する。
     *
     * @param options - 生成オプション
     */
    constructor( options?: FlatDemProvider.Option );


    constructor( max_level_or_options?: number | FlatDemProvider.Option )
    {
        let options: FlatDemProvider.Option;

        if ( max_level_or_options === undefined ) {
            options = {};
        }
        else if ( typeof max_level_or_options === 'number' ) {
            options = { max_level: max_level_or_options };
        }
        else {
            options = max_level_or_options;
        }

        this._max_level = options.max_level ?? 9;
        this._buffers = [];
        this._rho = options.rho ?? 8;

        // タイルデータのバイト数
        const tile_bytes = Hook.HEADER_BYTES + FLT_BYTES * this._num_samples();

        const height = options.height ?? 0.0;

        for ( let i=0; i<=this._max_level; ++i ) {
            const buffer = new ArrayBuffer( tile_bytes );
            this._setTileData( buffer, i, height );
            this._buffers.push( buffer );
        }
    }


    init( _options?: { signal?: AbortSignal } ): Promise<DemProvider.Info>
    {
        return Promise.resolve( {
            resolution_power: this._rho,
        } );
    }


    requestTile( z: number, _x: number, _y: number, _options?: { signal?: AbortSignal } ): Promise<ArrayBuffer>
    {
        return Promise.resolve( this._buffers[z] );
    }


    private _setTileData( buffer: ArrayBuffer, z: number, height: number ): void
    {
        const view = new DataView( buffer );

        view.setUint8( Hook.OFFSET_QLEVEL_00, this._max_level - z );
        view.setUint8( Hook.OFFSET_QLEVEL_10, this._max_level - z );
        view.setUint8( Hook.OFFSET_QLEVEL_01, this._max_level - z );
        view.setUint8( Hook.OFFSET_QLEVEL_11, this._max_level - z );
        view.setFloat32( Hook.OFFSET_HMIN, height, true );
        view.setFloat32( Hook.OFFSET_HMAX, height, true );

        const offset = this._setOmegaArray( view );

        this._setHeight( view, offset, height );
    }


    private _setOmegaArray( view: DataView ): number
    {
        const FLT_BYTES = 4;

        let offset = Hook.OFFSET_ω;
        for ( let down = 0; down < 3; ++down ) {
            let count = 1 << (2 * down);
            for ( var i = 0; i < count; ++i ) {
                view.setFloat32( offset, Hook.OMEGA_VALUE, true );
                offset += FLT_BYTES;
            }
        }
        return offset;
    }


    private _setHeight( view: DataView, current: number, height: number ): void
    {
        cfa_assert( current === Hook.HEADER_BYTES );

        let offset = current

        const num_samples = this._num_samples();

        for ( let p = 0; p < num_samples; ++p ) {
            view.setFloat32( offset, height, true );
            offset += FLT_BYTES;
        }
    }


    /**
     * 標高配列のすべての標高数
     */
    private _num_samples(): number
    {
        // 標高配列の 1 行の標高数
        const size = (1 << this._rho) + 1;

        // 標高配列のすべての標高数
        return size * size;
    }


    private static readonly OFFSET_QLEVEL_00 = 0;
    private static readonly OFFSET_QLEVEL_10 = 1;
    private static readonly OFFSET_QLEVEL_01 = 2;
    private static readonly OFFSET_QLEVEL_11 = 3;
    private static readonly OFFSET_HMIN      = 4;
    private static readonly OFFSET_HMAX      = 8;
    private static readonly OFFSET_ω        = 12;
    private static readonly HEADER_BYTES     = 96;
    private static readonly OMEGA_VALUE = -99.0;

}



/**
 * 生成オプション
 *
 * @see [[FlatDemProvider.constructor]]
 */
export interface Option {

    /**
     * 最大レベル
     *
     * 地形との交点計算において誤差 1cm 未満を保証するには、レベル 9 以
     * 上を指定する必要がある。
     *
     * @defaultValue 9
     */
    max_level?: number;


    /**
     * 解像度の指数
     *
     * 一般的にこのプロパティの値は 8 または 9 である。
     *
     * @defaultValue 8
     *
     * @see [[DemProvider.getResolutionPower]]
     */
    rho?: number;


    /**
     * 標高 (メートル)
     *
     * @defaultValue 0.0
     */
    height?: number;

}

}


export default FlatDemProvider;
