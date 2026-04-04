import BufferView from "./BufferView";
import Dom from "../util/Dom";


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
            ctx.onStartLoadImage();
            ctx.loadImage( jimage.uri )
            .then( image => {
                    this._image = image;
                    ctx.onFinishLoadImage();
            } )
            .catch( error => {
                    ctx.onFinishLoadImage( error );
            } );
        }
        else if ( jimage.bufferView !== undefined ) {
            this._bufferView = new BufferView( ctx, jimage.bufferView );

            const buffer = this._bufferView.buffer.binary;
            if ( buffer !== null && jimage.mimeType !== undefined ) {
                ctx.onStartLoadImage();
                const first = this._bufferView.byteOffset;
                const last = first + this._bufferView.byteLength;
                const blob = new Blob( [buffer.slice( first, last )], { type: jimage.mimeType } );
                Dom.loadImage( blob )
                    .then( image => {
                        this._image = image;
                        ctx.onFinishLoadImage();
                    } )
                    .catch( error => {
                        ctx.onFinishLoadImage( error );
                    } );
            }
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

}


export default Image;
