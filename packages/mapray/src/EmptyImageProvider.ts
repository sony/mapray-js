import ImageProvider from "./ImageProvider";


/**
 * ダミー画像プロバイダ
 *
 * 動作は {@link EmptyImageProvider.Hook } によって規定される
 */
class EmptyImageProvider extends ImageProvider {

    constructor() {
        super( new EmptyImageProvider.Hook() );
    }

}



namespace EmptyImageProvider {



/**
 * 状態は常に レベル 0 のみの巨大画像、ただし画像は永遠に返さない。
 */
export class Hook implements ImageProvider.Hook {

    /** {@link ImageProvider.init} */
    init()
    {
        return Promise.resolve( ImageProvider.applyInfoWithDefaults( {
            zoom_level_range: new ImageProvider.Range( 0, 0 ),
        } ) );
    }

    /** {@link ImageProvider.requestTile} */
    requestTile( _z: number, _x: number, _y: number ) {
        return Promise.resolve( null );
    }

}



} // namespace EmptyImageProvider



export default EmptyImageProvider;
