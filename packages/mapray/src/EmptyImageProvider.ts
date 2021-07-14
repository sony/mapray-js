import ImageProvider from "./ImageProvider";


/**
 * ダミー画像プロバイダ
 *
 * 状態は常に READY、レベル 0 のみの巨大画像、ただし画像は永遠に返さない。
 */
class EmptyImageProvider extends ImageProvider {

    /**
     */
    constructor()
    {
        super();
    }


    /**
     */
    override requestTile( z: number, x: number, y: number, callback: ImageProvider.RequestCallback ): object
    {
        return this;
    }


    /**
     */
    override cancelRequest( id: object )
    {
    }


    /**
     */
    override getImageSize(): number
    {
        return 4096;
    }


    /**
     */
    override getZoomLevelRange(): ImageProvider.Range
    {
        return new ImageProvider.Range( 0, 0 );
    }

}


export default EmptyImageProvider;
