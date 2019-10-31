import ImageProvider from "./ImageProvider";


/**
 * @summary ダミー画像プロバイダ
 *
 * 状態は常に READY、レベル 0 のみの巨大画像、ただし画像は永遠に返さない。
 *
 * @memberof mapray
 * @extends mapray.ImageProvider
 * @private
 */
class EmptyImageProvider extends ImageProvider {

    /**
     */
    constructor()
    {
        super();
    }


    /**
     * @override
     */
    requestTile( z, x, y, callback )
    {
        return this;
    }


    /**
     * @override
     */
    cancelRequest( id )
    {
    }


    /**
     * @override
     */
    getImageSize()
    {
        return 4096;
    }


    /**
     * @override
     */
    getZoomLevelRange()
    {
        return new ImageProvider.Range( 0, 0 );
    }

}


export default EmptyImageProvider;
