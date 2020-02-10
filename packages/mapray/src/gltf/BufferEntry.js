import BufferSplitter from "./BufferSplitter";
import BitVector from "../BitVector";


/**
 * コンテキストでの Buffer 管理アイテム
 *
 * @memberof mapray.gltf
 * @private
 */
class BufferEntry {

    /**
     * @param {mapray.gltf.Buffer} buffer  バッファ
     */
    constructor( buffer )
    {
        this._buffer = buffer;
        this._attrib_accessors = [];
        this._index_accessors  = [];
    }


    /**
     * 管理対象のバッファを取得
     *
     * @type {mapray.gltf.Buffer}
     * @readonly
     */
    get buffer() { return this._buffer; }


    /**
     * 頂点属性で使われている Accessor インスタンスを追加
     */
    addAttributeAccessor( accessor )
    {
        this._attrib_accessors.push( accessor );
    }


    /**
     * インデックスで使われている Accessor インスタンスを追加
     */
    addIndexAccessor( accessor )
    {
        this._index_accessors.push( accessor );
    }


    /**
     * バイナリをマシンのバイトオーダーに合わせて書き換え
     */
    rewriteByteOrder()
    {
        var modmap = new BitVector( Math.ceil( this._buffer.byteLength / 2 ) );

        for ( const accessor of this._getUnitedOriginalAccessors() ) {
            accessor.modifyByteOrder( modmap );
        }
    }


    /**
     * バッファを分割し、Accessor を再構築
     */
    splitBufferAndRebuildAccessors()
    {
        this._splitBufferAndRebuildAccessors( this._attrib_accessors );
        this._splitBufferAndRebuildAccessors( this._index_accessors );
    }


    /**
     * バッファを分割し、Accessor を再構築
     *
     * @param {iterable.<mapray.gltf.Accessor>} accessors  入力 Accessor 反復子
     */
    _splitBufferAndRebuildAccessors( accessors )
    {
        var splitter = new BufferSplitter();

        for ( const accessor of BufferEntry._getOriginalAccessors( accessors ) ) {
            splitter.update( accessor );
        }

        splitter.close( this._buffer );

        for ( const accessor of accessors ) {
            splitter.rebuildAccessor( accessor );
        }
    }


    /**
     * バッファを参照ている原初 Accessor の反復子
     *
     * @return {iterable.<mapray.gltf.Accessor>}  原初 Accessor 反復子
     * @private
     */
    _getUnitedOriginalAccessors()
    {
        return BufferEntry._getOriginalAccessors( this._attrib_accessors.concat( this._index_accessors ) );
    }


    /**
     * 原初 Accessor の反復子を取得
     *
     * @param  {iterable.<mapray.gltf.Accessor>} accessors  入力 Accessor 反復子
     * @return {iterable.<mapray.gltf.Accessor>}            原初 Accessor 反復子
     * @private
     */
    static
    _getOriginalAccessors( accessors )
    {
        var orig_accessors = new Map();

        for ( const accessor of accessors ) {
            const key = accessor.index;
            if ( !orig_accessors.has( key ) ) {
                orig_accessors.set( key, accessor );
            }
        }

        return orig_accessors.values();
    }

}


export default BufferEntry;
