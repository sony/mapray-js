import DemProvider from "./DemProvider";

/**
 * @summary 標高0の地形を生成する DEM プロバイダ
 * @classdesc
 * <p>標高0のフラットな地形を生成する DEM プロバイダの実装である。</p>
 * @memberof mapray
 * @extends mapray.DemProvider
 */
class FlatDemProvider extends DemProvider {

    constructor() {
        super();
    }


    /**
     * @override
     */
    requestTile( z, x, y, callback )
    {
        var actrl = new AbortController();

        this._buffer = new ArrayBuffer( FlatDemProvider.BUFFERSIZE );
        this._setZeroData( this._buffer );
        new Promise( resolve => { resolve(); } )
            .then( () => {
                callback( this._buffer );
            } )
            .catch( () => {
                callback( null );
            } );

        return actrl;
    }

    /**
     * @override
     */
    cancelRequest( id )
    {
        var actrl = id;  // 要求 ID を AbortController に変換
        actrl.abort();   // 取り消したので要求を中止
    }

    _setZeroData( buffer )
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

    _setOmegaArray( view )
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

    _setHeight( view, current )
    {
        const FLT_BYTES = 4;

        let offset = current
        for (let p = 0; p < FlatDemProvider.PIXEL_SIZE; ++p ) {
            view.setFloat32(offset, 0.0, true);
            offset += FLT_BYTES;
        }
    }
}

FlatDemProvider.OFFSET_QLEVEL_00 = 0;
FlatDemProvider.OFFSET_QLEVEL_10 = 1;
FlatDemProvider.OFFSET_QLEVEL_01 = 2;
FlatDemProvider.OFFSET_QLEVEL_11 = 3;
FlatDemProvider.OFFSET_HMIN      = 4;
FlatDemProvider.OFFSET_HMAX      = 8;
FlatDemProvider.OFFSET_ω        = 12;
FlatDemProvider.BUFFERSIZE = 264292;
FlatDemProvider.OMEGA_VALUE = -99.0;
FlatDemProvider.PIXEL_SIZE = Math.pow((1 << 8) + 1, 2);

export default FlatDemProvider;
