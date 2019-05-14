/**
 * glTF の bufferView に対応
 * @memberof mapray.gltf
 * @private
 */
class BufferView {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {number}              index  バッファビュー索引
     */
    constructor( ctx, index )
    {
        // glTF の bufferView オブジェクト (specification/2.0/schema/bufferView.schema.json)
        var jbufferView = ctx.gjson.bufferViews[index];

        this._buffer     = ctx.findBuffer( jbufferView.buffer );

        this._byteLength = jbufferView.byteLength;
        this._target     = jbufferView.target;  // ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER

        this._byteOffset = (jbufferView.byteOffset !== undefined) ? jbufferView.byteOffset : 0;
        this._byteStride = (jbufferView.byteStride !== undefined) ? jbufferView.byteStride : 0;
    }


    /**
     * 参照する gltf.Buffer インスタンスを取得
     * @type {mapray.gltf.Buffer}
     * @readonly
     */
    get buffer() { return this._buffer; }


    /**
     * ファッファ先頭からのバイトオフセット
     * @type {number}
     * @readonly
     */
    get byteOffset() { return this._byteOffset; }


    /**
     * インタリーブのバイトストライド
     * @type {number}
     * @readonly
     */
    get byteStride() { return this._byteStride; }


    /**
     * バッファ分割用の再構築処理
     *
     * @param {mapray.gltf.Buffer} buffer  部分バッファ
     */
    rebuildBySplitter( buffer )
    {
        // 部分バッファ全体を参照するようにする
        this._buffer     = buffer;
        this._byteLength = buffer.byteLength;
        this._byteOffset = 0;
    }

}


export default BufferView;
