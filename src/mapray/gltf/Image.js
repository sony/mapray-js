import BufferView from "./BufferView";


/**
 * glTF の image に対応
 * @memberof mapray.gltf
 * @private
 */
class Image {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {number}              index  images 索引
     */
    constructor( ctx, index )
    {
        this._index = index;

        // glTF の image オブジェクト (specification/2.0/schema/image.schema.json)
        var jimage = ctx.gjson.images[index];

        if ( jimage.uri !== undefined ) {
            // URI が相対パスの場合は glTF ファイルから、データ URI も可能
            // 画像形式は JPEG または PNG でなければならない
            this._uri = ctx.solveResourceUri( jimage.uri );
            this._load_image( ctx, this._uri );
        }
        else if ( jimage.bufferView !== undefined ) {
            this._bufferView = new BufferView( ctx, jimage.bufferView );
        }

        // mimeType は "image/jpeg" または "image/png" で bufferView のときは必須
        // uri のときは任意であるが mimeType が指定されているとき、タイプは mimeType と解釈する
        this._mimeType = jimage.mimeType;

        this._image    = null;
    }


    /**
     * 対応する glTF オブジェクトでの索引を取得
     * @type {number}
     * @readonly
     */
    get index() { return this._index; }


    /**
     * 画像データ
     * @type {HTMLImageElement}
     * @readonly
     */
    get image() { return this._image; }


    /**
     * 画像データの読み込みを開始
     * @param {mapray.gltf.Context} ctx  読み込みコンテキスト
     * @param {string}              url  画像データの URL
     * @private
     */
    _load_image( ctx, url )
    {
        var image = document.createElement( "img" );

        image.onload = () => {
            // 画像データの取得に成功
            this._image = image;
            ctx.onFinishLoadImage();
        };

        image.onerror = () => {
            // 画像データの取得に失敗
            ctx.onFinishLoadImage( new Error( "Failed to load image in glTF" ) );
        };

        const params = ctx.makeImageLoadParams( url );

        if ( params.crossOrigin ) {
            image.crossOrigin = params.crossOrigin;
        }
        image.src = params.url;

        ctx.onStartLoadImage();
    }

}


export default Image;
