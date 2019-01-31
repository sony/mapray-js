import FallRenderCallback from "./FallRenderCallback";


const accessToken = "<your access token here>";

/**
 * @summary 下降カメラ
 */
class Fall {

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container )
    {
        this._image_provider  = new mapray.StandardImageProvider( "http://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 0, 18 );
        this._render_callback = new FallRenderCallback( this );

        this._viewer = new mapray.Viewer( container, { image_provider:  this._image_provider,
                                                       dem_provider:    new mapray.CloudDemProvider(accessToken),
                                                       render_callback: this._render_callback } );
    }


    /**
     * アプリを停止してから削除する。
     */
    destroy()
    {
        this._viewer.destroy();
    }

}


export default Fall;
