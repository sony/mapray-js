/**
 * @summary ビット配列
 *
 * @memberof mapray
 * @private
 */
class BitVector {

    /**
     * 初期値はすべてのビットが false である。
     *
     * @param {number} length  ビット数
     */
    constructor( length )
    {
        this._length = length;
        this._array  = new Uint32Array( Math.ceil( length / 32 ) );
    }


    /**
     * @summary ビット数
     * @type {number}
     * @readonly
     */
    get length()
    {
        return this._length;
    }


    /**
     * @summary ビットを設定
     *
     * @param {number}  index  インデックス
     * @param {boolean} value  値
     */
    setBit( index, value )
    {
        var uint32_index = Math.floor( index / 32 );
        var uint32_value = this._array[uint32_index];
        var uint32_mask  = 1 << (index % 32);

        this._array[uint32_index] = value ? (uint32_value | uint32_mask) : (uint32_value & ~uint32_mask);
    }


    /**
     * @summary ビットを取得
     *
     * @param  {number}  index  インデックス
     * @return {boolean}        値
     */
    getBit( index )
    {
        var uint32_index = Math.floor( index / 32 );
        var uint32_value = this._array[uint32_index];
        var uint32_mask  = 1 << (index % 32);

        return (uint32_value & uint32_mask) != 0;
    }

}


export default BitVector;
