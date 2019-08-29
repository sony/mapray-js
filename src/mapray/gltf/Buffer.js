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
                ctx.onStartLoadBuffer();
                ctx.loadBinary( jbuffer.uri )
                .then( buffer => {
                        // バイナリデータの取得に成功
                        this._binary = buffer;
                        ctx.onFinishLoadBuffer();
                } )
                .catch( error => {
                        // バイナリデータの取得に失敗
                        ctx.onFinishLoadBuffer( new Error( "Failed to load binary in glTF" ) );
                } );
            }
            else {
                // todo: GLB-stored Buffer
                this._uri = null;
                this._binary = null;
            }
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

}


export default Buffer;
