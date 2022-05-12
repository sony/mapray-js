import DemProvider from "./DemProvider";

/**
 * 標高0の地形を生成する DEM プロバイダ
 *
 * 標高 0 のフラットな地形を生成する DEM プロバイダの実装である。
 * 同一レベルのタイルは同じインスタンスを返却します。
 */
class FlatDemProvider extends DemProvider<null> {

    private _buffers: ArrayBuffer[];

    /**
     * 配信を行う最大ズームレベル
     */
    private _max_level: number;

    /**
     * 地形との交点計算において誤差 1cm 未満を保証するには、レベル9以上を指定する必要がある。
     * @param max_level 最大レベル
     */
    constructor( max_level: number = 9 ) {
        super();
        this._max_level = max_level;
        this._buffers = [];
        for ( let i=0; i<=this._max_level; ++i ) {
            const buffer = new ArrayBuffer( FlatDemProvider.BUFFERSIZE );
            this._setZeroData( buffer, i );
            this._buffers.push( buffer );
        }
    }


    override requestTile( z: number, x: number, y: number, callback: DemProvider.RequestCallback ): null
    {
        Promise.resolve()
        .then(() => {
                callback( this._buffers[z] );
        });
        return null;
    }


    override cancelRequest()
    {
    }


    private _setZeroData( buffer: ArrayBuffer, z: number )
    {
        const view = new DataView( buffer );

        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_00, this._max_level - z );
        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_10, this._max_level - z );
        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_01, this._max_level - z );
        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_11, this._max_level - z );
        view.setFloat32( FlatDemProvider.OFFSET_HMIN, 0.0, true );
        view.setFloat32( FlatDemProvider.OFFSET_HMAX, 0.0, true );

        let offset = this._setOmegaArray( view );
        this._setHeight( view, offset );
    }


    private _setOmegaArray( view: DataView )
    {
        const FLT_BYTES = 4;

        let offset = FlatDemProvider.OFFSET_ω;
        for ( let down = 0; down < 3; ++down ) {
            let count = 1 << (2 * down);
            for ( var i = 0; i < count; ++i ) {
                view.setFloat32( offset, FlatDemProvider.OMEGA_VALUE, true );
                offset += FLT_BYTES;
            }
        }
        return offset;
    }


    private _setHeight( view: DataView, current: number )
    {
        /* IEEE浮動小数点数(float) 0.0 は [0, 0, 0, 0] であり、ArrayBufferは初期化時点で既に全て 0 である。
        const FLT_BYTES = 4;

        let offset = current
        for (let p = 0; p < FlatDemProvider.PIXEL_SIZE; ++p ) {
            view.setFloat32(offset, 0.0, true);
            offset += FLT_BYTES;
        }
        */
    }
}



namespace FlatDemProvider {



export const OFFSET_QLEVEL_00 = 0;
export const OFFSET_QLEVEL_10 = 1;
export const OFFSET_QLEVEL_01 = 2;
export const OFFSET_QLEVEL_11 = 3;
export const OFFSET_HMIN      = 4;
export const OFFSET_HMAX      = 8;
export const OFFSET_ω        = 12;
export const BUFFERSIZE = 264292;
export const OMEGA_VALUE = -99.0;
export const PIXEL_SIZE = Math.round(Math.pow((1 << 8) + 1, 2));



} // namespace FlatDemProvider



export default FlatDemProvider;
