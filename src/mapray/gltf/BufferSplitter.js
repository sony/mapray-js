/**
 * バッファの分割を補助
 *
 * @memberof mapray.gltf
 * @private
 */
class BufferSplitter {

    /**
     */
    constructor()
    {
        // 処理しやすいように最初と最後はにダミーの断片を置く

        var frag0 = new Fragment( -2, -1 );
        var frag1 = new Fragment( 2**32 + 1, 2**32 + 2 );

        frag0.next = frag1;
        frag1.prev = frag0;

        this._fragments = frag0;
    }


    /**
     * 分割を更新
     *
     * @param {mapray.gltf.Accessor} accessor  バッファを参照するアクセサ
     */
    update( accessor )
    {
        const range = accessor.getRangeInBuffer();
        this._updateByRange( { first: BufferSplitter._floor4( range.first ), last: range.last } );
    }


    /**
     * 分割の更新を終了
     *
     * @param {mapray.gltf.Buffer} buffer  分割されるバッファ
     */
    close( buffer )
    {
        // 先頭のダミーを削除
        this._fragments = this._fragments.next;

        // 部分バッファを設定
        for ( let frag = this._fragments ;; frag = frag.next ) {
            if ( frag.next === null ) {
                // 最後のダミーを削除
                frag.prev.next = null;
                break;
            }
            frag.buffer = buffer.createSubBuffer( frag.first, frag.last );
        }
    }


    /**
     * アクセサを部分バッファで再構築
     *
     * @param {mapray.gltf.Accessor} accessor  再構築するアクセサ
     */
    rebuildAccessor( accessor )
    {
        for ( let frag = this._fragments; frag !== null; frag = frag.next ) {
            if ( accessor.isIncluded( frag.first, frag.last ) ) {
                accessor.rebuildBySplitter( frag.buffer, frag.first );
                break;
            }
        }
    }


    /**
     * 分割を更新
     *
     * @param {object} range  Accessor の範囲
     * @private
     */
    _updateByRange( range )
    {
        for ( let frag = this._fragments; frag.next !== null; ) {
            if ( frag.isInside( range ) ) {
                // frag 断片と frag.next 断片の間に新しい range 断片を挿入
                let frag0 = frag;
                let frag1 = frag.next;
                let fragx = new Fragment( range.first, range.last );
                frag0.next = fragx;
                frag1.prev = fragx;
                fragx.prev = frag0;
                fragx.next = frag1;
                break;
            }
            else if ( frag.isTouch( range ) ) {
                // range に frag を統合し、frag を削除し、frag.prev から始める
                let frag0 = frag.prev;
                let frag1 = frag.next;
                frag0.next = frag1;
                frag1.prev = frag0;

                range = frag.mergeRange( range );
                frag  = frag0;
            }
            else {
                frag = frag.next;
            }
        }
    }


    /**
     * 4 の倍数に切り下げ
     *
     * @param  {number} value  切り下げる値
     * @return {number}        value を 4 の倍数に切り下げた整数
     * @private
     */
    static
    _floor4( value )
    {
        return 4 * Math.floor( value / 4 );
    }

}


/**
 * バッファの断片
 *
 * @memberof mapray.gltf.BufferSplitter
 * @private
 */
class Fragment {

    /**
     * @param {number} first  先頭オフセット
     * @param {number} last   末尾オフセット + 1
     */
    constructor( first, last )
    {
        this.first  = first;
        this.last   = last;
        this.buffer = null;  // 部分バッファ
        this.prev   = null;
        this.next   = null;
    }


    /**
     * range は frag と frag.next の間の内側か？
     *
     * @param  {object} range
     * @return {boolean}
     * @private
     */
    isInside( range )
    {
        return (this.last < range.first) && (range.last < this.next.first);
    }


    /**
     * range は frag と接触しているか？
     *
     * @param  {object} range
     * @return {boolean}
     */
    isTouch( range )
    {
        return (this.last >= range.first) && (range.last >= this.first);
    }


    /**
     * this と range を結合した range を取得
     *
     * @param  {object} range
     * @return {object}
     */
    mergeRange( range )
    {
        return {
            first: Math.min( this.first, range.first ),
            last:  Math.max( this.last,  range.last  )
        };
    }

}


export default BufferSplitter;
