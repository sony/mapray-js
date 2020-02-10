import BufferView from "./BufferView";


/**
 * glTF の accessor に対応
 * @memberof mapray.gltf
 * @private
 */
class Accessor {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {number}              index  アクセサ索引
     */
    constructor( ctx, index )
    {
        // glTF の accessor オブジェクト (specification/2.0/schema/accessor.schema.json)
        var jaccessor = ctx.gjson.accessors[index];

        this._type          = jaccessor.type;  // 文字列: SCALAR, VEC2, VEC3, VEC4, MAT2, MAT3, MAT4
        this._componentType = jaccessor.componentType;  // GL_UNSIGNED_INT ...
        this._count         = jaccessor.count; // >= 1

        this._bufferView = new BufferView( ctx, jaccessor.bufferView );

        this._byteOffset = (jaccessor.byteOffset !== undefined) ? jaccessor.byteOffset : 0;
        this._normalized = jaccessor.normalized || false;

        this._min = jaccessor.min ? jaccessor.min.slice() : null;
        this._max = jaccessor.max ? jaccessor.max.slice() : null;

        this._index = index;
    }


    /**
     * 対応する glTF オブジェクトでの索引を取得
     * @type {number}
     * @readonly
     */
    get index() { return this._index; }


    /**
     * 参照する gltf.BufferView インスタンスを取得
     * @type {mapray.gltf.BufferView}
     * @readonly
     */
    get bufferView() { return this._bufferView; }


    /**
     * データの型を取得
     * @type {string}
     * @readonly
     */
    get type() { return this._type; }


    /**
     * データ要素の型を取得
     * @type {number}
     * @readonly
     */
    get componentType() { return this._componentType; }


    /**
     * データの個数を取得
     * @type {number}
     * @readonly
     */
    get count() { return this._count; }


    /**
     * バッファビュー先頭からのバイトオフセットを取得
     * @type {number}
     * @readonly
     */
    get byteOffset() { return this._byteOffset; }


    /**
     * 正規化するか？
     * @type {boolean}
     * @readonly
     */
    get normalized() { return this._normalized; }


    /**
     * 座標の最小値
     * @type {?number[]}
     * @readonly
     */
    get min() { return this._min; }


    /**
     * 座標の最大値
     * @type {?number[]}
     * @readonly
     */
    get max() { return this._max; }


    /**
     * バッファ内でのデータ範囲を取得
     *
     * @return {object}  データ範囲 = { first: 先頭オフセット, last: 末尾オフセット + 1 }
     */
    getRangeInBuffer()
    {
        var       view = this._bufferView;
        var compo_size = Accessor._ComponentData[this._componentType].bytes;

        var data_size = compo_size * Accessor._NumComponents[this._type];      // データのバイト数
        var    stride = (view.byteStride == 0) ? data_size : view.byteStride;  // ストライド

        var first_offset = this._byteOffset + view.byteOffset;            // バッファ内での先頭オフセット
        return {
            first: first_offset,
            last:  first_offset + stride * (this._count - 1) + data_size  // バッファ内での末尾オフセット + 1
        };
    }


    /**
     * バイトオーダーを修正
     *
     * @param  {mapray.BitVector} modmap  修正マップ
     */
    modifyByteOrder( modmap )
    {
        var compo_data = Accessor._ComponentData[this._componentType];

        var compo_bytes = compo_data.bytes;
        if ( compo_bytes == 1 ) {
            return;  // 1 バイト要素はバイトオーダーがないので処理しない
        }

        var   num_compos = Accessor._NumComponents[this._type];             // 属性の要素数
        var  byte_offset = this._byteOffset + this._bufferView.byteOffset;  // バッファ先頭からのバイト数
        var compo_stride = (this._bufferView.byteStride == 0) ?             // 要素単位のストライド
            num_compos : this._bufferView.byteStride / compo_bytes;

        var arraybuffer = this._bufferView.buffer.binary;
        var    dataview = new DataView( arraybuffer, byte_offset );
        var  typedarray = new compo_data.typedarray( arraybuffer, byte_offset );
        var    getCompo = compo_data.getcompo;  // DataView データ取得関数

        var compo_shorts = compo_bytes / 2;  // 1 要素の short 数
        var short_offset = byte_offset / 2;  // バッファ先頭からの short 数
        var short_stride = compo_stride * compo_shorts;  // short 単位のストライド

        for ( var i = 0; i < this._count; ++i ) {
            var short_base_index = short_offset + i * short_stride;
            var compo_base_index = i * compo_stride;
            for ( var c = 0; c < num_compos; ++c ) {
                var short_index = short_base_index + c * compo_shorts;
                if ( modmap.getBit( short_index ) ) {
                    continue;  // すでに修正済みの要素なのでスキップ
                }

                var compo_index = compo_base_index + c;
                // リトルエンディアン (glTF 仕様) を想定して要素を読み込む
                var value = getCompo.call( dataview, compo_index * compo_bytes, true );
                // ネイティブエンディアン (WebGL 仕様) で要素を書き戻す
                typedarray[compo_index] = value;

                modmap.setBit( short_index, true );
            }
        }
    }


    /**
     * 範囲チェック
     *
     * @param  {number} first  バッファに対する開始位置
     * @param  {number} last   バッファに対する終了位置 + 1
     * @return {boolean}       最初のバイトが範囲に含まれるか？
     */
    isIncluded( first, last )
    {
        var byte_offset = this._byteOffset + this._bufferView.byteOffset;
        return (first <= byte_offset) && (byte_offset < last);
    }


    /**
     * バッファ分割用の再構築処理
     *
     * @param {mapray.gltf.Buffer} buffer  部分バッファ
     * @param {number}             first   元バッファに対する buffer の開始位置
     */
    rebuildBySplitter( buffer, first )
    {
        this._index = -1;

        // 元バッファ先頭からのデータのバイト位置
        var old_byte_offset = this._byteOffset + this._bufferView.byteOffset;

        // 部分バッファ先頭からのデータのバイト位置
        this._byteOffset = old_byte_offset - first;

        // bufferView を部分バッファと一致するように更新
        this._bufferView.rebuildBySplitter( buffer );
    }

}


Accessor._NumComponents = {
    'SCALAR': 1,
    'VEC2':   2,
    'VEC3':   3,
    'VEC4':   4,
    'MAT2':   4,
    'MAT3':   9,
    'MAT4':  16
};


Accessor._ComponentData = {
    5120: { bytes: 1, getcompo: DataView.prototype.getInt8,    typedarray: Int8Array    },   // BYTE
    5121: { bytes: 1, getcompo: DataView.prototype.getUint8,   typedarray: Uint8Array   },   // UNSIGNED_BYTE
    5122: { bytes: 2, getcompo: DataView.prototype.getInt16,   typedarray: Int16Array   },   // SHORT
    5123: { bytes: 2, getcompo: DataView.prototype.getUint16,  typedarray: Uint16Array  },   // UNSIGNED_SHORT
    5125: { bytes: 4, getcompo: DataView.prototype.getUint32,  typedarray: Uint32Array  },   // UNSIGNED_INT
    5126: { bytes: 4, getcompo: DataView.prototype.getFloat32, typedarray: Float32Array }    // FLOAT
};


export default Accessor;
