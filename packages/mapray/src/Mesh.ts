import GLEnv from "./GLEnv";
import MeshBuffer from "./MeshBuffer";
import type Material from "./Material";


/**
 * モデルメッシュ
 */
class Mesh {

    /**
     * @param glenv - WebGL 環境
     * @param data  - メッシュデータ
     */
    constructor( glenv: GLEnv,
                 data:  Mesh.Initializer | MeshData )
    {
        this._glenv = glenv;

        let init: Mesh.Initializer;

        if ( data instanceof Mesh.Initializer ) {
            init = data;
        }
        else {
            init = (new JsonInit( glenv, data )).initializer;
        }

        const {
            draw_mode,
            num_vertices,
            attrib_data,
            index_data,
        } = this._initByInitializer( init );

        this._draw_mode    = draw_mode;
        this._num_vertices = num_vertices;
        this._attrib_data  = attrib_data;
        this._index_data   = index_data;
    }


    /**
     * Initializer による初期化
     *
     * @param init - 初期化データ
     */
    private _initByInitializer( init: Mesh.Initializer )
    {
        const draw_mode    = this._convertDrawMode( init.draw_mode );
        const num_vertices = init.num_vertices;

        const attrib_data: AttribData = {};

        const src_attrib_data = init.attribute_data;  // Mesh.Initializer#addAttribute() を参照
        for ( const sad of src_attrib_data ) {
            attrib_data[sad.id] = {
                mesh_buffer:    sad.buffer,
                buffer:         sad.buffer.handle,
                num_components: sad.num_components,
                component_type: this._convertComponentType( sad.component_type ),
                normalized:     sad.normalized,
                byte_stride:    sad.byte_stride,
                byte_offset:    sad.byte_offset
            };
        }

        let index_data = null;

        if ( init.index_data ) {
            const src_index_data = init.index_data;  // Mesh.Initializer#addIndex() を参照
            index_data = {
                mesh_buffer: src_index_data.buffer,
                buffer:      src_index_data.buffer.handle,
                num_indices: src_index_data.num_indices,
                type:        this._convertComponentType( src_index_data.type ),
                byte_offset: src_index_data.byte_offset
            };
        }

        return {
            draw_mode,
            num_vertices,
            attrib_data,
            index_data,
        };
    }


    /**
     * DrawMode 型から GL 描画モードへ変換
     *
     * @param mode - 描画モード
     *
     * @return GL 描画モード
     */
    private _convertDrawMode( mode: Mesh.DrawMode ): GLenum
    {
        const gl = this._glenv.context;

        switch ( mode ) {
        case Mesh.DrawMode.POINTS:         return gl.POINTS;
        case Mesh.DrawMode.LINES:          return gl.LINES;
        case Mesh.DrawMode.TRIANGLES:      return gl.TRIANGLES;
        case Mesh.DrawMode.LINE_LOOP:      return gl.LINE_LOOP;
        case Mesh.DrawMode.LINE_STRIP:     return gl.LINE_STRIP;
        case Mesh.DrawMode.TRIANGLE_STRIP: return gl.TRIANGLE_STRIP;
        case Mesh.DrawMode.TRIANGLE_FAN:   return gl.TRIANGLE_FAN;
        default: throw new Error( "mapray: invalid Mesh.DrawMode: " + mode );
        }
    }


    /**
     * ComponentType 型から GL 要素型へ変換
     *
     * @param ctype - 要素型
     *
     * @return GL 要素型
     */
    private _convertComponentType( ctype: Mesh.ComponentType ): GLenum
    {
        const gl = this._glenv.context;

        switch ( ctype ) {
        case Mesh.ComponentType.BYTE:           return gl.BYTE;
        case Mesh.ComponentType.UNSIGNED_BYTE:  return gl.UNSIGNED_BYTE;
        case Mesh.ComponentType.SHORT:          return gl.SHORT;
        case Mesh.ComponentType.UNSIGNED_SHORT: return gl.UNSIGNED_SHORT;
        case Mesh.ComponentType.UNSIGNED_INT:   return gl.UNSIGNED_INT;
        case Mesh.ComponentType.FLOAT:          return gl.FLOAT;
        default: throw new Error( "mapray: invalid Mesh.ComponentType: " + ctype );
        }
    }


    /**
     * リソースを破棄
     */
    dispose(): void
    {
        // @ts-ignore
        this._attrib_data = {};
        // @ts-ignore
        this._index_data = null;
    }


    /**
     * メッシュを描画
     *
     * 事前に `material.bindProgram()`, `material.setFloat()` 等のパラ
     * メータ設定、`material.bindTexture2D()` によるテクスチャのバイン
     * ドを実行すること。
     *
     * @param material  マテリアル
     */
    draw( material: Material )
    {
        const gl = this._glenv.context;

        // 頂点属性のバインド
        material.bindVertexAttribs( this._attrib_data );

        const index_data = this._index_data;
        if ( index_data !== null ) {
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, index_data.buffer );
            gl.drawElements( this._draw_mode, index_data.num_indices, index_data.type, index_data.byte_offset );
        }
        else {
            gl.drawArrays( this._draw_mode, 0, this._num_vertices );
        }
    }


    /**
     * WebGL の描画モードを取得
     *
     * @deprecated
     * 既存のコードの変更を最小限にするために追加したメソッド
     */
    get gl_draw_mode(): GLenum
    {
        return this._draw_mode;
    }


    private readonly _glenv:        GLEnv;
    private readonly _draw_mode:    GLenum;
    private readonly _num_vertices: number;
    private readonly _attrib_data:  AttribData;
    private readonly _index_data:   IndexData | null;

}


interface AttribDataEntry {

    mesh_buffer:    MeshBuffer;
    buffer:         WebGLBuffer;
    num_components: number;
    component_type: GLenum;
    normalized:     boolean;
    byte_stride:    number;
    byte_offset:    number;

}


interface AttribData {

    [id: string]: AttribDataEntry | undefined;

}


interface IndexData {

    mesh_buffer: MeshBuffer;
    buffer:      WebGLBuffer;
    num_indices: number;
    type:        GLenum;
    byte_offset: number;

}


/**
 * [[Mesh.Initializer.addIndex]] のオプション型
 */
export interface IndexOption {

    /**
     * バッファ先頭からのバイトオフセット
     *
     * @defaultValue 0
     */
    byte_offset?: number;

}


/**
 * [[Mesh.Initializer.addAttribute]] のオプション型
 */
export interface AttributeOption {

    /**
     * 正規化整数座標か？
     *
     * @defaultValue `false`
     */
    normalized?: boolean;


    /**
     * 頂点間のバイトストライド
     *
     * @defaultValue 0
     */
    byte_stride?: number;


    /**
     * バッファ先頭からのバイトオフセット
     *
     * @defaultValue 0
     */
    byte_offset?: number;

}


interface IndexInitData {

    buffer:      MeshBuffer;
    num_indices: number;
    type:        Mesh.ComponentType;
    byte_offset: number;

}


interface AttribInitEntry {

    id:             string;
    buffer:         MeshBuffer;
    num_components: number;
    component_type: Mesh.ComponentType;
    normalized:     boolean;
    byte_stride:    number;
    byte_offset:    number;

}


namespace Mesh {

/**
 * メッシュの初期化オブジェクト
*/
export class Initializer {

    readonly draw_mode:      Mesh.DrawMode;
    readonly num_vertices:   number;
    readonly attribute_data: AttribInitEntry[];
    get index_data():        IndexInitData | null { return this._index_data; };


    /**
     * @param draw_mode    - 描画モード
     * @param num_vertices - 頂点数
     */
    constructor( draw_mode:    Mesh.DrawMode,
                 num_vertices: number )
    {
        this.draw_mode      = draw_mode;
        this.num_vertices   = num_vertices;
        this.attribute_data = [];
        this._index_data    = null;
    }


    /**
     * インデックスデータを追加
     *
     * @param buffer      - バッファ
     * @param num_indices - インデックス数
     * @param type        - インデックス型 (UNSIGNED_BYTE | UNSIGNED_SHORT | UNSIGNED_INT)
     * @param options     - オプション
     */
    addIndex( buffer:      MeshBuffer,
              num_indices: number,
              type:        Mesh.ComponentType,
              options?:    IndexOption )
    {
        this._index_data = {
            buffer:      buffer,
            num_indices: num_indices,
            type:        type,
            byte_offset: options?.byte_offset ?? 0,
        };
    }


    /**
     * 頂点属性データを追加
     *
     * @param id             - 属性名
     * @param buffer         - バッファ
     * @param num_components - 要素数
     * @param component_type - 要素型
     * @param options        - オプション
     */
    addAttribute( id:             string,
                  buffer:         MeshBuffer,
                  num_components: number,
                  component_type: Mesh.ComponentType,
                  options?:       AttributeOption )
    {
        const entry: AttribInitEntry = {
            id:             id,
            buffer:         buffer,
            num_components: num_components,
            component_type: component_type,
            normalized:     options?.normalized ?? false,
            byte_stride:    options?.byte_stride ?? 0,
            byte_offset:    options?.byte_offset ?? 0,
        };

        this.attribute_data.push( entry );
    }


    private _index_data: IndexInitData | null;

}


/**
 * 描画モードの列挙型
 */
export const enum DrawMode {

    /**
     * 点リスト
     */
    POINTS = "@@_POINTS",

    /**
     * 線分リスト
     */
    LINES = "@@_LINES",

    /**
     * 三角形リスト
     */
    TRIANGLES = "@@_TRIANGLES",

    /**
     * 線分ループ
     */
    LINE_LOOP = "@@_LINE_LOOP",

    /**
     * 線分ストリップ
     */
    LINE_STRIP = "@@_LINE_STRIP",

    /**
     * 三角形ストリップ
     */
    TRIANGLE_STRIP = "@@_TRIANGLE_STRIP",

    /**
     * 三角形ファン
     */
    TRIANGLE_FAN = "@@_TRIANGLE_FAN",

}


/**
 * 要素型の列挙型
 */
export const enum ComponentType {

    /**
     * 符号付き 8 ビット整数型
     */
    BYTE = "@@_BYTE",

    /**
     * 符号なし 8 ビット整数型
     */
    UNSIGNED_BYTE = "@@_UNSIGNED_BYTE",

    /**
     * 符号付き 16 ビット整数型
     */
    SHORT = "@@_SHORT",

    /**
     * 符号なし 16 ビット整数型
     */
    UNSIGNED_SHORT = "@@_UNSIGNED_SHORT",

    /**
     * 符号なし 32 ビット整数型
     */
    UNSIGNED_INT = "@@_UNSIGNED_INT",

    /**
     * 32 ビット浮動小数点数型
     */
    FLOAT = "@@_FLOAT",

}

} // namespace Mesh


/**
 * メッシュの頂点情報の型
 */
export interface VertexInfo {

    /**
     * 頂点属性名
     */
    name: string;


    /**
     * 要素数
     */
    size: number;

}


/**
 * 簡易的なメッシュ生成のためのデータ型
 *
 * より細かい指定をするためには [[Mesh.Initializer]] を使用する。
 */
export interface MeshData {

    /**
     * 頂点情報
     */
    vtype: VertexInfo[] | "P" | "PN" | "PT" | "PNT" | number;


    /**
     * プリミティブ型
     *
     * @defaultValue "triangles"
     */
    ptype?: "triangles" | "lines" | "points";


    /**
     * 頂点データ
     */
    vertices: ArrayLike<number>;


    /**
     * インデックスデータ
     */
    indices?: ArrayLike<number>;

}


/**
 * JSON オブジェクトを [[Mesh.Initializer]] インスタンスに変換
 */
class JsonInit {

    /**
     * @param glenv - WebGL 環境
     * @param data  - メッシュデータ
     */
    constructor( glenv: GLEnv,
                 data:  MeshData )
    {
        const        vinfo = InitHelper.createVertexInfo( data.vtype );
        const  num_vcompos = InitHelper.numVertexComponents( vinfo );
        const num_vertices = data.vertices.length / num_vcompos;

        this._initializer = new Mesh.Initializer( JsonInit._toDrawMode( data ), num_vertices );

        if ( data.indices ) {
            this._addIndex( glenv, data.indices, num_vertices );
        }

        const  FLT_BYTES = 4;
        const     buffer = new MeshBuffer( glenv, InitHelper.toTypedArray( data.vertices, Mesh.ComponentType.FLOAT ) );
        const byteStride = num_vcompos * FLT_BYTES;
        let   byteOffset = 0;

        for ( let i = 0; i < vinfo.length; ++i ) {
            const num_compos = vinfo[i].size;
            this._initializer.addAttribute( vinfo[i].name, buffer, num_compos, Mesh.ComponentType.FLOAT,
                                            { byte_stride: byteStride, byte_offset: byteOffset } );
            byteOffset += num_compos * FLT_BYTES;
        }
    }


    /**
     * Mesh.Initializer インスタンスを取得
     */
    get initializer(): Mesh.Initializer { return this._initializer; }


    /**
     * インデックスデータを追加
     *
     * @param glenv        - WebGL 環境
     * @param indices      - インデックス配列
     * @param num_vertices - 頂点数
     */
    private _addIndex( glenv:   GLEnv,
                       indices: ArrayLike<number>,
                       num_vertices: number )
    {
        // インデックスの型は頂点数により自動的に決める
        const ctype = (num_vertices < 65536) ? Mesh.ComponentType.UNSIGNED_SHORT : Mesh.ComponentType.UNSIGNED_INT;

        const buffer = new MeshBuffer( glenv, InitHelper.toTypedArray( indices, ctype ),
                                       { target: MeshBuffer.Target.INDEX } );

        this._initializer.addIndex( buffer, indices.length, ctype );
    }


    /**
     * Mesh.DrawMode に変換
     *
     * @param data - メッシュデータ
     *
     * @return 描画モード
     */
    private static _toDrawMode( data: MeshData ): Mesh.DrawMode
    {
        switch ( data.ptype ) {
        case "triangles": return Mesh.DrawMode.TRIANGLES;
        case "lines":     return Mesh.DrawMode.LINES;
        case "points":    return Mesh.DrawMode.POINTS;
        default:          return Mesh.DrawMode.TRIANGLES;
        }
    }


    private readonly _initializer: Mesh.Initializer;

}


/**
 * 初期化ヘルパー
 *
 * [[JsonInit]] で使用される。
 */
class InitHelper {

    // インスタンスは生成できない
    private constructor() {}


    /**
     * 頂点情報を生成
     *
     * `vtype` を頂点情報の配列に変換して返す。ただし `vtype` が頂点情
     * 報の配列なら `vtype` を返す。
     *
     * @param vtype - 頂点タイプまたは頂点情報
     *
     * @return 頂点情報
     */
    static createVertexInfo( vtype: string | number | VertexInfo[] ): VertexInfo[]
    {
        if ( Array.isArray( vtype ) ) {
            // vtype は最初から頂点情報
            return vtype;
        }

        let vinfo = null;

        // vtype: ("P" | "PN" | "PT" | "PNT")
        switch ( vtype ) {
        case "P":
        case InitHelper.ENUM_VTYPE_P:
            vinfo = [
                { name: InitHelper.ANAME_P, size: InitHelper.FSIZE_P }
            ];
            break;
        case "PN":
        case InitHelper.ENUM_VTYPE_PN:
            vinfo = [
                { name: InitHelper.ANAME_P, size: InitHelper.FSIZE_P },
                { name: InitHelper.ANAME_N, size: InitHelper.FSIZE_N }
            ];
            break;
        case "PT":
        case InitHelper.ENUM_VTYPE_PT:
            vinfo = [
                { name: InitHelper.ANAME_P, size: InitHelper.FSIZE_P },
                { name: InitHelper.ANAME_T, size: InitHelper.FSIZE_T }
            ];
            break;
        case "PNT":
        case InitHelper.ENUM_VTYPE_PNT:
            vinfo = [
                { name: InitHelper.ANAME_P, size: InitHelper.FSIZE_P },
                { name: InitHelper.ANAME_N, size: InitHelper.FSIZE_N },
                { name: InitHelper.ANAME_T, size: InitHelper.FSIZE_T }
            ];
            break;
        default:
            throw new Error( "mapray: unknown vtype: " + vtype );
        }

        return vinfo;
    }


    /**
     * 頂点データの要素数を取得
     *
     * @param vinfo - 頂点情報
     *
     * @return 頂点データの要素数
     */
    static numVertexComponents( vinfo: VertexInfo[] ): number
    {
        let num_compos = 0;

        for ( const item of vinfo ) {
            num_compos += item.size;
        }

        return num_compos;
    }


    /**
     * 型配列に変換
     *
     * @param array - 入力配列
     * @param type  - 変換先の要素型
     *
     * @return 変換された配列
     */
    static toTypedArray( array: ArrayLike<number>,
                         ctype: Mesh.ComponentType ): Uint16Array | Uint32Array | Float32Array
    {
        switch ( ctype ) {
        case Mesh.ComponentType.UNSIGNED_SHORT:
            return (array instanceof Uint16Array) ? array : new Uint16Array( array );
        case Mesh.ComponentType.UNSIGNED_INT:
            return (array instanceof Uint32Array) ? array : new Uint32Array( array );
        case Mesh.ComponentType.FLOAT:
            return (array instanceof Float32Array) ? array : new Float32Array( array );
        default:
            throw new Error( "mapray: invalid component type: " + ctype );
        }
    }


    // VTYPE 列挙値
    private static readonly ENUM_VTYPE_P   = 0;
    private static readonly ENUM_VTYPE_PN  = 1;
    private static readonly ENUM_VTYPE_PT  = 2;
    private static readonly ENUM_VTYPE_PNT = 3;

    // 頂点属性名
    private static readonly ANAME_P = "a_position";
    private static readonly ANAME_N = "a_normal";
    private static readonly ANAME_T = "a_texcoord";

    // 要素のサイズ (要素数)
    private static readonly FSIZE_P = 3;
    private static readonly FSIZE_N = 3;
    private static readonly FSIZE_T = 2;

}


export default Mesh;
