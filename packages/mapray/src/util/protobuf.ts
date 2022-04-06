/**
 * プロトコルバッファ関連の機能を提供する。
 *
 * {@link ProtoParser} クラスによりプロトコルバッファのデータを読み込
 * むことができる。
 *
 * @see {@link https://developers.google.com/protocol-buffers
 *       Protocol Buffers}
 *
 * @module
 */


/**
 * ワイヤー型
 *
 * @see {@link https://developers.google.com/protocol-buffers/docs/encoding#structure
 *       Message Structure}
 */
const enum WireType {

    /** int32, int64, uint32, uint64, sint32, sint64, bool, enum
     */
    Variant = 0,

    /** fixed64, sfixed64, double
     */
    Bit_64 = 1,

    /** string, bytes, embedded messages, packed repeated fields
     */
    LengthDelimited = 2,

    /** fixed32, sfixed32, float
     */
    Bit_32 = 5,

    /**
     * どれにも当てはまらない特殊値
     */
    Unknown = 999

}


/**
 * 2 の累乗の定数
 *
 * @remarks
 *
 * 最適化のため整数の即値に置き換えたいので、便宜上 const enum で定義している。
 * 実験の結果、ちょうど 2^n でも 2^54 を超えると誤差が生じた。
 */
const enum Pot {

    _29 = 2**29,
    _32 = 2**32,
    _35 = 2**35,

}


/**
 * フィールド番号の型
 *
 * フィールドを識別するための整数値 (1 〜 2^29 - 1) を表現する型である。
 *
 * @see {@link https://developers.google.com/protocol-buffers/docs/proto#assigning_field_numbers
 *       Assigning Field Numbers}
 */
export type FieldNumber = number;


/**
 * UTF-8 デコーダ
 */
const utf8_decoder = new TextDecoder();


/**
 * プロトコルバッファの読み込みを補助する。
 *
 * {@link constructor} に与えたプロトコルバッファ形式のデータの読み込
 * みを補助する。
 *
 * 一般的なプロトコルバッファのライブラリとは違い、.proto スキーマファ
 * イルを使用しない。
 *
 * ## 基本的な使い方
 *
 * 基本的に {@link readKey} と `read*Value()` または {@link skipValue}
 * の呼び出しを繰り返してメッセージを解析する。
 *
 * ただし現行メセージの終端では {@link readKey} を呼び出すことはできな
 * いので、現行メッセージに次のフィールドがない可能性があるとき、
 * {@link isEndOfMessage} を呼び出して、現在の位置がメッセージの終端か
 * どうかを確かめる必要がある。
 *
 * {@link readKey} でフィールド番号を取得した後、そのフィールドの値を
 * 取得する場合、そのフィールドの型に合った `read*Value()` を呼び出さ
 * なければならない。
 *
 * ただし `packed repeated` フィールドの値を取得するときは {@link
 * readPackedRepeatedValue} を呼び出す。このとき引数には、要素型に対応
 * する `read*Value` 関数を与える。
 *
 * 埋め込みメッセージ (embedded message) を読み込むときは
 * `read*Value()` の代わりに {@link enterEmbeddedMessage} を呼び出す。
 * そうすると現行メッセージがその埋め込みメッセージに移行する。
 *
 * その後は通常の方法でフィールドのキーと値を読み込む。
 *
 * 埋め込みメッセージ上で {@link leaveEmbeddedMessage} を呼び出すと親
 * メッセージに戻り、埋め込みメッセージの直後の位置から読み込めるよう
 * になる。
 *
 * ## 64 ビット整数の制限
 *
 * 絶対値の大きい 64 ビット整数は number で正確に表現できないため、以
 * 下のメソッドが直接、または {@link readPackedRepeatedValue} を通して
 * 返す値は誤差を生じる可能性がある。
 *
 * - {@link readInt64Value}
 * - {@link readUint64Value}
 * - {@link readSint64Value}
 * - {@link readFixed64Value}
 * - {@link readSfixed64Value}
 *
 * 具体的には、`Number.MIN_SAFE_INTEGER` から
 * `Number.MAX_SAFE_INTEGER` の間にない値は誤差を生じ、整数にならない
 * 可能性もある。
 */
export class ProtoParser {

    /**
     * インスタンスを初期化
     *
     * `buffer` に含まれるプロトコルバッファデータを解析するためのイン
     * スタンスを生成する。
     *
     * `byteOffset` を省略したときは 0 として解釈され、`length` を省略
     * したときは `byteOffset` から `buffer` の最後までのバイト数と解
     * 釈される。
     *
     * @param buffer      プロトコルバッファ形式のバイト列
     * @param byteOffset  データの先頭の位置 (バイト単位)
     * @param length      データのサイズ (バイト単位)
     *
     * @remarks 読み込み処理中に `buffer` の内容が変更されないことを想
     * 定している。
     */
    constructor( buffer:      ArrayBuffer,
                 byteOffset?: number,
                 length?:     number )
    {
        this._byte_array = new Uint8Array( buffer, byteOffset, length );
        this._data_view  = new DataView( buffer, byteOffset, length );
        this._wire_type  = WireType.Unknown;
        this._cursor     = 0;
        this._end_of_msg = this._byte_array.byteLength;
        this._eom_stack  = [];
    }


    /**
     * 現行メッセージの終端に達しているか？
     *
     * このメソッドはいつでも呼び出すことができ、`this` の状態を変化さ
     * せることはない。
     *
     * @returns  メッセージの終端のとき `true`, それ以外のとき `false`
     *
     * @see {@link enterEmbeddedMessage},
     *      {@link leaveEmbeddedMessage}
     *
     * @category Message
     */
    isEndOfMessage(): boolean
    {
        return this._cursor >= this._end_of_msg;
    }


    /**
     * フィールドのキーを読み込む。
     *
     * フィールドのキーを読み込み、そのフィールドの値を読み込める、
     * または読み飛ばせる状態にする。
     *
     * @returns  フィールド番号
     *
     * @category
     */
    readKey(): FieldNumber
    {
        console.assert( !this.isEndOfMessage() );

        const key = this.read_uint_variant();
        console.assert( key < 4294967296 /* 2^32 */ );

        // 最後のワイヤー型を記録
        this._wire_type = key & 0b111;

        // フィールド番号
        const field_id = key >>> 3;
        console.assert( field_id >= 1 );

        return field_id;
    }


    /**
     * フィールドの値を読み飛ばす。
     *
     * @category
     */
    skipValue(): void
    {
        switch ( this._wire_type ) {
        case WireType.Variant:
            while ( this._byte_array[this._cursor++] >= 0x80 ) {}
            break;

        case WireType.Bit_64:
            this._cursor += 8;
            break;

        case WireType.LengthDelimited:
            this._cursor += this.read_uint_variant();
            break;

        case WireType.Bit_32:
            this._cursor += 4;
            break;

        default:
            throw new Error( "unrecognized wire type: " + this._wire_type );
        }
    }


    /**
     * 埋め込みメッセージ (embedded message) の読み込みを開始する。
     *
     * 現行メッセージを次のフィールドの埋め込みメッセージに移行し、読
     * み込み位置をその埋め込みメッセージの最初に移動する。
     *
     * @see {@link leaveEmbeddedMessage},
     *      {@link isEndOfMessage}
     *
     * @category Message
     */
    enterEmbeddedMessage(): void
    {
        console.assert( this._wire_type == WireType.LengthDelimited );

        const  length = this.read_uint_variant();
        const new_eom = this._cursor + length;
        const old_eom = this._end_of_msg;

        // EOM を埋め込みメッセージの EOM に変更
        this._end_of_msg = new_eom;

        // 親メッセージの EOM を記憶
        this._eom_stack.push( old_eom );
    }


    /**
     * 埋め込みメッセージ (embedded message) の読み込みを終了する。
     *
     * 現行メッセージを親メッセージに戻し、読み込み位置を元の埋め込み
     * メッセージの直後に移動する。
     *
     * このメソッドは、埋め込みメッセージの中でいつでも呼び出すことが
     * できる。例えばフィールドのキーを読み込んだがフィールドの値は読
     * み込んでいない状態や、メッセージの終端に達している状態でも呼び
     * 出すことができる。
     *
     * @see {@link enterEmbeddedMessage},
     *      {@link isEndOfMessage}
     *
     * @category Message
     */
    leaveEmbeddedMessage(): void
    {
        if ( this._eom_stack.length > 0 ) {
            // 位置を埋め込みメッセージの次に移動
            this._cursor = this._end_of_msg;

            // EOM を親メッセージの EOM に戻す
            // ※ ここで _eom_stack は空ではないので number 型の値
            //    しか返さないことを想定
            this._end_of_msg = this._eom_stack.pop() as number;
        }
        else {
            throw new Error( "not in the embedded message" );
        }
    }


    /**
     * `bool` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readBoolValue(): boolean
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        return this.read_uint_variant() != 0;
    }


    /**
     * `enum` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readEnumValue(): number
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        // enum の範囲は int32 と同じで Variant 形式 (ZigZag ではない)
        return this.readInt32Value();
    }


    /**
     * `uint32` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readUint32Value(): number
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        return this.read_uint_variant();
    }


    /**
     * `uint64` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readUint64Value(): number
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        return this.read_uint_variant();
    }


    /**
     * `sint32` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readSint32Value(): number
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        return this.read_sint_variant_zigzag();
    }


    /**
     * `sint64` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readSint64Value(): number
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        return this.read_sint_variant_zigzag();
    }


    /**
     * `int32` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readInt32Value(): number
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        const [lo,] = this.read_uint_variant_pair();

        // 符号付き 32 ビット整数に変換
        return lo | 0;
    }


    /**
     * `int64` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readInt64Value(): number
    {
        console.assert( this._wire_type == WireType.Variant ||
                        this._wire_type == WireType.LengthDelimited );

        const pot64 = Pot._29 * Pot._35;  // 2^64

        const [lo, hi] = this.read_uint_variant_pair();

        if ( hi < Pot._29 / 2 ) {
            // 正数 (>= 0)
            return Pot._35 * hi + lo;
        }
        else {
            // 負数 (< 0)
            return Pot._35 * hi - pot64 + lo;
        }
    }


    /**
     * `fixed32` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readFixed32Value(): number
    {
        console.assert( this._wire_type == WireType.Bit_32 ||
                        this._wire_type == WireType.LengthDelimited );

        const value = this._data_view.getUint32( this._cursor, true );
        this._cursor += 4;

        return value;
    }


    /**
     * `fixed64` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readFixed64Value(): number
    {
        console.assert( this._wire_type == WireType.Bit_64 ||
                        this._wire_type == WireType.LengthDelimited );

        const lo = this._data_view.getUint32( this._cursor, true );
        this._cursor += 4;

        const hi = this._data_view.getUint32( this._cursor, true );
        this._cursor += 4;

        return lo + Pot._32 * hi;
    }


    /**
     * `sfixed32` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readSfixed32Value(): number
    {
        console.assert( this._wire_type == WireType.Bit_32 ||
                        this._wire_type == WireType.LengthDelimited );

        const value = this._data_view.getInt32( this._cursor, true );
        this._cursor += 4;

        return value;
    }


    /**
     * `sfixed64` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readSfixed64Value(): number
    {
        console.assert( this._wire_type == WireType.Bit_64 ||
                        this._wire_type == WireType.LengthDelimited );

        const pot64 = Pot._32 * Pot._32;  // 2^64

        const lo = this._data_view.getUint32( this._cursor, true );
        this._cursor += 4;

        const hi = this._data_view.getUint32( this._cursor, true );
        this._cursor += 4;

        if ( hi < Pot._32 / 2 ) {
            // 正数 (>= 0)
            return Pot._32 * hi + lo;
        }
        else {
            // 負数 (< 0)
            return Pot._32 * hi - pot64 + lo;
        }
    }


    /**
     * `float` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readFloatValue(): number
    {
        console.assert( this._wire_type == WireType.Bit_32 ||
                        this._wire_type == WireType.LengthDelimited );

        const value = this._data_view.getFloat32( this._cursor, true );
        this._cursor += 4;

        return value;
    }


    /**
     * `double` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readDoubleValue(): number
    {
        console.assert( this._wire_type == WireType.Bit_64 ||
                        this._wire_type == WireType.LengthDelimited );

        const value = this._data_view.getFloat64( this._cursor, true );
        this._cursor += 8;

        return value;
    }


    /**
     * `string` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readStringValue(): string
    {
        console.assert( this._wire_type == WireType.LengthDelimited );

        const length = this.read_uint_variant();

        const value = this._byte_array.slice( this._cursor, this._cursor + length );
        this._cursor += length;

        return utf8_decoder.decode( value );
    }


    /**
     * `bytes` 型のフィールド値を取得する。
     *
     * @category Scalar Value
     */
    readBytesValue(): ArrayBuffer
    {
        console.assert( this._wire_type == WireType.LengthDelimited );

        const length = this.read_uint_variant();

        const value = this._byte_array.slice( this._cursor, this._cursor + length );
        this._cursor += length;

        return value.buffer;
    }


    /**
     * packed repeated 型のフィールド値を取得する。
     *
     * `func` パラメータに与えた関数に対応する型 (スカラー数値型) の値
     * の配列を取得する。
     *
     * `func` には次の関数の何れか 1 つを指定することができる。
     *
     * - {@link readBoolValue}
     * - {@link readEnumValue}
     * - {@link readUint32Value}
     * - {@link readUint64Value}
     * - {@link readSint32Value}
     * - {@link readSint64Value}
     * - {@link readInt32Value}
     * - {@link readInt64Value}
     * - {@link readFixed32Value}
     * - {@link readFixed64Value}
     * - {@link readSfixed32Value}
     * - {@link readSfixed64Value}
     * - {@link readFloatValue}
     * - {@link readDoubleValue}
     *
     * @typeParam T  取得する配列の要素の型
     *
     * @param func  ベースとなる取得関数
     *
     * @returns  スカラー数値の配列
     *
     * @example

     * ```ts
     * a = parser.readPackedRepeatedValue( ProtoParser.prototype.readUint32value );
     * ```
     *
     * @see {@link https://developers.google.com/protocol-buffers/docs/encoding#packed
     *       Packed Repeated Fields}
     *
     * @category Packed Repeated Value
     */
    readPackedRepeatedValue<T>( func: (this: ProtoParser) => T ): Array<T>
    {
        console.assert( this._wire_type == WireType.LengthDelimited );

        const packed = new Array<T>();

        const  length = this.read_uint_variant();
        const end_pos = this._cursor + length;

        while ( this._cursor < end_pos ) {
            packed.push( func.call( this ) );
        }

        if ( this._cursor != end_pos ) {
            throw new Error( "invalid packed repeated data" );
        }

        return packed;
    }


    /**
     * 符号なし Variant 値を読み込む。
     *
     * 0 から `Number.MAX_SAFE_INTEGER` の範囲は厳密な値を返すが、それ
     * 以外は近似値を返す可能性がある。
     *
     * @see {@link https://developers.google.com/protocol-buffers/docs/encoding#varints
     *       Base 128 Varints}
     */
    private read_uint_variant(): number
    {
        let value = 0;

        for ( let power = 1 ;; power *= 128 ) {
            const byte = this._byte_array[this._cursor++];

            value += (byte & 0x7f) * power;

            if ( (byte & 0x80) == 0 ) {
                return value;
            }
        }
    }


    /**
     * 符号付き Variant 値を読み込む (ZigZag エンコーディング)。
     *
     * 絶対値が `Number.MAX_SAFE_INTEGER` より大きいときは、近似値を返
     * す可能性がある。
     *
     * @see {@link https://developers.google.com/protocol-buffers/docs/encoding#signed_integers
     *       Signed Integers}
     */
    private read_sint_variant_zigzag(): number
    {
        // ZigZag エンコーディング

        // 整数 x のエンコード方法
        //
        // f(x) = { 2x       if x >= 0
        //        { -2x - 1  if x < 0
        //
        // 負の整数 x をエンコードすると f(x) は奇数になり、非負の整数
        // x をエンコードすると f(x) は偶数になる。
        //
        // つまり奇数は負の整数にデコードされ、偶数は非負の整数にデコー
        // ドされる。

        // デコード方法
        //
        // y=f(x) とすると、
        // y が偶数のとき x = y / 2
        // y が奇数のとき x = -(y + 1) / 2

        // 最初の 1 バイト
        const b0 = this._byte_array[this._cursor++];

        const sign = (b0 & 0x01) ? -1 : 1;
        let  value = ((b0 & 0x7e) >>> 1) + (b0 & 0x01);

        if ( (b0 & 0x80) == 0 ) {
            return sign * value;
        }

        // 残りのバイト列
        for ( let power = 64 ;; power *= 128 ) {
            const byte = this._byte_array[this._cursor++];

            value += (byte & 0x7f) * power;

            if ( (byte & 0x80) == 0 ) {
                return sign * value;
            }
        }
    }


    /**
     * 符号なし Variant 値を number の対として読み込む。
     *
     * 戻り値は、符号なし整数のペアで、第 0 要素が下位 35 ビット、第 1
     * 要素が上位 29 ビットを符号なし整数に変換した値である。
     */
    private read_uint_variant_pair(): [number, number]  // [lo: uint35, hi: uint29]
    {
        let lo_N = 0;  // 下位 35 ビット

        for ( let power = 1; power != Pot._35; power *= 128 ) {
            const byte = this._byte_array[this._cursor++];

            lo_N += (byte & 0x7f) * power;

            if ( (byte & 0x80) == 0 ) {
                return [lo_N, 0];
            }
        }

        let hi_N = 0;  // 上位 29 ビット

        for ( let power = 1 ;; power *= 128 ) {
            const byte = this._byte_array[this._cursor++];

            hi_N += (byte & 0x7f) * power;

            if ( (byte & 0x80) == 0 ) {
                return [lo_N, hi_N];
            }
        }
    }


    private readonly _byte_array: Uint8Array;
    private readonly  _data_view: DataView;
    private           _wire_type: WireType;  // 最後の取得したキーのワイヤー型
    private              _cursor: number;    // 次に読み込む位置
    private          _end_of_msg: number;    // 現行メッセージの最後の位置 + 1 (EOM)
    private readonly  _eom_stack: number[];  // EOM 回復用

}
