/**
 * glTF の buffer に対応
 * @memberof mapray.gltf
 * @private
 */
class Buffer {

    /**
     * @param {mapray.gltf.Context} [ctx]    読み込みコンテキスト
     * @param {number}              [index]  buffers 索引
     */
    constructor( ctx, index )
    {
        if ( ctx === undefined ) {
            // 引数なし構築 (特殊インスタンス用)
            this._index      = -1;
            this._byteLength = 0;
            this._uri        = null;
            this._binary     = null;
        }
        else {
            this._index = index;

            // glTF の buffer オブジェクト (specification/2.0/schema/buffer.schema.json)
            var jbuffer = ctx.gjson.buffers[index];

            this._byteLength = jbuffer.byteLength;

            if ( jbuffer.uri !== undefined ) {
                // URI が相対パスの場合は glTF ファイルから、データ URI も可能
                this._uri = ctx.solveResourceUri( jbuffer.uri );
                this._load_binary( ctx, this._uri );
            }
            else {
                // todo: GLB-stored Buffer
                this._uri = null;
            }

            this._binary = null;
        }
    }


    /**
     * 対応する glTF オブジェクトでの索引を取得
     * @type {number}
     * @readonly
     */
    get index() { return this._index; }


    /**
     * バイナリデータ
     * @type {ArrayBuffer}
     * @readonly
     */
    get binary() { return this._binary; }


    /**
     * バイナリデータのバイト数を取得
     * @type {number}
     * @readonly
     */
    get byteLength() { return this._byteLength; }


    /**
     * 部分バッファを生成
     *
     * @param  {number} first  最初のバイト位置
     * @param  {number} last   最後のバイト位置 + 1
     * @return {mapray.gltf.Buffer}  部分バッファ
     */
    createSubBuffer( first, last )
    {
        var subBuffer = new Buffer();

        subBuffer._byteLength = last - first;
        subBuffer._binary     = this._binary.slice( first, last );

        return subBuffer;
    }


    /**
     * バッファデータの読み込みを開始
     * @param {mapray.gltf.Context} ctx  読み込みコンテキスト
     * @param {string}              url  バッファデータの URL
     * @private
     */
    _load_binary( ctx, url )
    {
        const params = ctx.makeBinaryFetchParams( url );

        fetch( params.url, params.init )
            .then( response => {
                if ( response.ok )
                    return response.arrayBuffer();
                else
                    return Promise.reject( Error( response.statusText ) );
            } )
            .then( buffer => {
                // バイナリデータの取得に成功
                this._binary = buffer;
                ctx.onFinishLoadBuffer();
            } )
            .catch( error => {
                // バイナリデータの取得に失敗
                ctx.onFinishLoadBuffer( new Error( "Failed to load binary in glTF" ) );
            } );

        ctx.onStartLoadBuffer();
    }

}


export default Buffer;
