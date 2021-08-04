import DemProvider from "./DemProvider";

/**
 * @summary 標高0の地形を生成する DEM プロバイダ
 * @classdesc
 * <p>標高0のフラットな地形を生成する DEM プロバイダの実装である。</p>
 * @memberof mapray
 * @extends mapray.DemProvider
 */
class FlatDemProvider extends DemProvider<null> {

    private _buffer: ArrayBuffer;


    constructor() {
        super();

        this._buffer = new ArrayBuffer( FlatDemProvider.BUFFERSIZE );
        this._setZeroData( this._buffer );
    }


    override requestTile( z: number, x: number, y: number, callback: DemProvider.RequestCallback ): null
    {
        callback( this._buffer );
        return null;
    }


    override cancelRequest()
    {
    }


    private _setZeroData( buffer: ArrayBuffer )
    {
        const view = new DataView( buffer );

        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_00, 0 );
        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_10, 0 );
        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_01, 0 );
        view.setUint8( FlatDemProvider.OFFSET_QLEVEL_11, 0 );
        view.setFloat32( FlatDemProvider.OFFSET_HMIN, 0.0, true );
        view.setFloat32( FlatDemProvider.OFFSET_HMAX, 0.0, true );

        let offset = this._setOmegaArray( view );
        this._setHeight( view, offset);
    }


    private _setOmegaArray( view: DataView )
    {
        const FLT_BYTES = 4;

        let offset = 0;
        for ( let down = 0; down < 3; ++down ) {
            let count = 1 << (2 * down);
            for ( var i = 0; i < count; ++i ) {
                view.setFloat32( FlatDemProvider.OFFSET_ω + offset, FlatDemProvider.OMEGA_VALUE, true );
                offset += FLT_BYTES;
            }
        }
        return offset;
    }


    private _setHeight( view: DataView, current: number )
    {
        const FLT_BYTES = 4;

        let offset = current
        for (let p = 0; p < FlatDemProvider.PIXEL_SIZE; ++p ) {
            view.setFloat32(offset, 0.0, true);
            offset += FLT_BYTES;
        }
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
