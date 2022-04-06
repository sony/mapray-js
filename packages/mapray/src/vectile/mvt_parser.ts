/**
 * mvt データを解析する機能を提供する。
 *
 * {@link parseTile} を呼び出して、バイナリベクトルデータ (mvt) の解析
 * 結果を取得する。
 *
 * @see
 *
 * - {@link https://github.com/mapbox/vector-tile-spec/tree/master/2.1
 *    Vector Tile Specification}
 *
 * - {@link https://github.com/mapbox/vector-tile-spec/blob/master/2.1/vector_tile.proto
 *    vector_tile.proto スキーマ}
 *
 * - {@link https://docs.mapbox.com/vector-tiles/specification/
 *    Vector tiles / Specification}
 *
 * @module
 */

import { ProtoParser } from "../util/protobuf";


/**
 * `vector_tile.Tile.Value` メッセージ
 */
export type Value = boolean | number | string;


/**
 * `vector_tile.Tile.GeomType` 列挙子
 */
export const enum GeomType {

    UNKNOWN = 0,

    POINT = 1,

    LINESTRING = 2,

    POLYGON = 3,

}


/**
 * `vector_tile.Tile` メッセージ
 */
export interface Tile {

    layers: Layer[];

}


/**
 * `vector_tile.Tile` のフィールド番号
 */
const enum Tile_FID {

    layers = 3,

}


/**
 * `vector_tile.Tile.Layer` メッセージ
 */
export interface Layer {

    version: number;

    name: string;

    features: Feature[];

    keys: string[];

    values: Value[];

    extent: number;

}


/**
 * `vector_tile.Tile.Layer` のフィールド番号
 */
const enum Layer_FID {

    version = 15,

    name = 1,

    features = 2,

    keys = 3,

    values = 4,

    extent = 5,

}


/**
 * `vector_tile.Tile.Value` のフィールド番号
 */
const enum Value_FID {

    string_value = 1,  // string

    float_value = 2,   // float

    double_value = 3,  // double

    int_value = 4,     // int64

    uint_value = 5,    // uint64

    sint_value = 6,    // sint64

    bool_value = 7,    // bool

}


/**
 * `vector_tile.Tile.Feature` メッセージ
 */
export interface Feature {

    id: number;

    tags: Uint32Array;

    type: GeomType;

    geometry: Uint32Array;

}


/**
 * `vector_tile.Tile.Feature` のフィールド番号
 */
const enum Feature_FID {

    id = 1,

    tags = 2,

    type = 3,

    geometry = 4,

}


/**
 * レイヤーフィルタ判定関数の型を表現する。
 *
 * レイヤー名が `name` のレイヤーを読み込むときは `true` を返し、
 * 読み込まないとき `false` を返す。
 *
 * この型の関数は [[parseTile]] 関数の `layer_filter` オプションに指定
 * することができる。
 *
 * @param name - レイヤー名
 *
 * @returns レイヤー読み込むとき `true`, それ以外のとき `false`
 */
export interface LayerFilter {

    ( name: string ): boolean;

}


/**
 * メッセージを読み飛ばすための特殊な例外
 */
class SkipMessage {}


/**
 * `vector_tile.Tile` メッセージを解析
 */
class TileParser implements Tile {

    // from interface Tile
    layers;


    /**
     * インスタンスを初期化
     *
     * パラメータは `parseTile` を参照
     */
    constructor( buffer: ArrayBuffer,
                 opts: {
                     byteOffset?:   number,
                     length?:       number,
                     layer_filter?: LayerFilter,
                 } = {} )
    {
        const layer_filter = opts.layer_filter || (() => true);

        // フィールドのデフォルト値を設定
        this.layers = [];

        // 解析処理
        TileParser.check_header( new Uint8Array( buffer, opts.byteOffset, opts.length ) );

        const parser = new ProtoParser( buffer, opts.byteOffset, opts.length );

        while ( !parser.isEndOfMessage() ) {
            const fid = parser.readKey();

            switch ( fid ) {
            case Tile_FID.layers:
                parser.enterEmbeddedMessage();
                try {
                    this.layers.push( new LayerParser( parser, layer_filter ) );
                }
                catch ( e ) {
                    if ( e instanceof SkipMessage ) {
                        // このレイヤーはフィルタにより弾かれた
                    }
                    else {
                        // 本当の例外を再スロー
                        throw e;
                    }
                }
                parser.leaveEmbeddedMessage();
                break;

            default:
                parser.skipValue();
                break;
            }
        }
    }


    /**
     * ヘッダー部分を検査
     *
     * @throws Error  未対応の形式のとき
     */
    private static check_header( data: Uint8Array ): void
    {
        // https://github.com/mapbox/mapnik-vector-tile/blob/master/src/vector_tile_compression.hpp

        if ( data.byteLength >= 2 ) {
            if ( data[0] == 0x1f && data[1] == 0x8b ) {
                throw new Error( "Does not support gzip compression" );
            }
        }
    }

}


/**
 * `vector_tile.Tile.Layer` メッセージを解析
 */
class LayerParser implements Layer {

    // from interface Layer
    version; name; features; keys; values; extent;


    constructor( parser:       ProtoParser,
                 layer_filter: LayerFilter )
    {
        // フィールドのデフォルト値を設定
        this.version  = 1;
        this.name     = "";
        this.features = [];
        this.keys     = [];
        this.values   = [];
        this.extent   = 4096;

        // 解析処理
        while ( !parser.isEndOfMessage() ) {
            const fid = parser.readKey();

            switch ( fid ) {
            case Layer_FID.version:
                this.version = parser.readUint32Value();
                break;

            case Layer_FID.name:
                this.name = parser.readStringValue();
                if ( !layer_filter( this.name ) ) {
                    // このレイヤーはフィルタにより弾く
                    throw new SkipMessage();
                }
                break;

            case Layer_FID.features:
                parser.enterEmbeddedMessage();
                this.features.push( new FeatureParser( parser ) );
                parser.leaveEmbeddedMessage();
                break;

            case Layer_FID.keys:
                this.keys.push( parser.readStringValue() );
                break;

            case Layer_FID.values:
                parser.enterEmbeddedMessage();
                this.values.push( parseValue( parser ) );
                parser.leaveEmbeddedMessage();
                break;

            case Layer_FID.extent:
                this.extent = parser.readUint32Value();
                break;

            default:
                parser.skipValue();
                break;
            }
        }
    }

}


/**
 * `vector_tile.Tile.Feature` メッセージを解析
 */
class FeatureParser implements Feature {

    // from interface Feature
    id; tags; type; geometry;


    constructor( parser: ProtoParser )
    {
        // フィールドのデフォルト値を設定
        this.id   = 0;
        this.type = GeomType.UNKNOWN;
        let tags:     number[] = [];
        let geometry: number[] = [];

        // 解析処理
        while ( !parser.isEndOfMessage() ) {
            const fid = parser.readKey();

            switch ( fid ) {
            case Feature_FID.id:
                this.id = parser.readUint64Value();
                break;

            case Feature_FID.tags: {
                const value = parser.readPackedRepeatedValue( ProtoParser.prototype.readUint32Value );
                tags = tags.concat( value );
            } break;

            case Feature_FID.type:
                this.type = parser.readEnumValue();
                break;

            case Feature_FID.geometry: {
                const value = parser.readPackedRepeatedValue( ProtoParser.prototype.readUint32Value );
                geometry = geometry.concat( value );
            } break;

            default:
                parser.skipValue();
                break;
            }
        }

        // プロパティを設定
        this.tags     = Uint32Array.from( tags );
        this.geometry = Uint32Array.from( geometry );
    }

}


/**
 * `vector_tile.Tile.Value` メッセージを解析
 */
function
parseValue( parser: ProtoParser ): Value
{
    // Value はちょうど 1 つの既知フィールドが存在することが前提

    const fid = parser.readKey();

    switch ( fid ) {
    case Value_FID.string_value:  // string
        return parser.readStringValue();

    case Value_FID.float_value:   // float
        return parser.readFloatValue();

    case Value_FID.double_value:  // double
        return parser.readDoubleValue();

    case Value_FID.int_value:     // int64
        return parser.readInt64Value();

    case Value_FID.uint_value:    // uint64
        return parser.readUint64Value();

    case Value_FID.sint_value:    // sint64
        return parser.readSint64Value();

    case Value_FID.bool_value:    // bool
        return parser.readBoolValue();

    default:
        throw new Error( "unknown field id=" + fid + " in vector_tile.Tile.Value" );
    }
}


/**
 * `buffer` に含まれる mvt データを解析する。
 *
 * `options` の `byteOffset` を省略したときは 0 として解釈され、
 * `length` を省略したときは `byteOffset` から `buffer` の最後までのバ
 * イト数と解釈される。
 *
 * `options` の `layer_filter` は一部のレイヤーのみを読み込みたい場合
 * に指定する。これにより読み込み時間とメモリー使用量を抑えることがで
 * きる可能性がある。
 *
 * @param buffer  mvt 形式のバイト列
 * @param options.byteOffset    データの先頭の位置 (バイト単位)
 * @param options.length        データのサイズ (バイト単位)
 * @param options.layer_filter  レイヤーフィルタ関数
 */
export function
parseTile( buffer: ArrayBuffer,
           options?: {
               byteOffset?:   number,
               length?:       number,
               layer_filter?: LayerFilter,
           } ): Tile
{
    return new TileParser( buffer, options );
}


/**
 * タイル内のレイヤーを検索する。
 *
 * `tile` から名前が `name` のレイヤーを検索して返す。存在しない場合は
 * `undefined` を返す。
 */
export function
findLayer( tile: Tile,
           name: string ): Layer | undefined
{
    return tile.layers.find( layer => layer.name === name );
}
