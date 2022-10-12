import ImageProvider from "./ImageProvider";


/**
 * ダミー画像プロバイダ
 *
 * 状態は常に READY、レベル 0 のみの巨大画像、ただし画像は永遠に返さない。
 */
class EmptyImageProvider extends ImageProvider<void> {

    /**
     */
    constructor()
    {
        super();
    }


    /**
     */
    override requestTile( _z: number, _x: number, _y: number, _callback: ImageProvider.RequestCallback ): void
    {
    }


    /**
     */
    override cancelRequest(): void
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
