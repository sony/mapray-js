import MeshBuffer from "./MeshBuffer";


/**
 * @summary モデルメッシュ
 * @memberof mapray
 * @package
 */
class Mesh {

    /**
     * @param {mapray.GLEnv}       glenv
     * @param {mapray.Mesh.Initializer|ArrayBuffer|object} data   メッシュデータ
     */
    constructor( glenv, data )
    {
        this._glenv        = glenv;

        this._draw_mode    = undefined;
        this._num_vertices = 0;
        this._attrib_data  = {};
        this._index_data   = null;

        if ( data instanceof Initializer ) {
            // Mesh.Initializer
            this._initByInitializer( data );
        }
        else if ( data instanceof ArrayBuffer ) {
            // メッシュバイナリ
            this._initByInitializer( (new BinaryInit( glenv, data )).initializer );
        }
        else {
            // JSON オブジェクト
            this._initByInitializer( (new JsonInit( glenv, data )).initializer );
        }
    }


    /**
     * @summary Initializer による初期化
     *
     * @param {mapray.Mesh.Initializer} init  初期化データ
     * @private
     */
    _initByInitializer( init )
    {
        this._draw_mode    = this._convertDrawMode( init.draw_mode );
        this._num_vertices = init.num_vertices;

        // this._attrib_data
        var src_attrib_data = init.attribute_data;  // Mesh.Initializer#addAttribute() を参照
        for ( var i = 0; i < src_attrib_data.length; ++i ) {
            var sad = src_attrib_data[i];
            this._attrib_data[sad.id] = {
                mesh_buffer:    sad.buffer,
                buffer:         sad.buffer.handle,
                num_components: sad.num_components,
                component_type: this._convertComponentType( sad.component_type ),
                normalized:     sad.normalized,
                byte_stride:    sad.byte_stride,
                byte_offset:    sad.byte_offset
            };
        }

        // this._index_data
        if ( init.index_data ) {
            var src_index_data = init.index_data;  // Mesh.Initializer#addIndex() を参照
            this._index_data = {
                mesh_buffer: src_index_data.buffer,
                buffer:      src_index_data.buffer.handle,
                num_indices: src_index_data.num_indices,
                type:        this._convertComponentType( src_index_data.type ),
                byte_offset: src_index_data.byte_offset
            };
        }
    }


    /**
     * @summary DrawMode 型から GL 描画モードへ変換
     *
     * @param  {mapray.Mesh.DrawMode} mode  描画モード
     * @return {number}                     GL 描画モード
     * @private
     */
    _convertDrawMode( mode )
    {
        var gl = this._glenv.context;

        switch ( mode ) {
        case DrawMode.POINTS:         return gl.POINTS;
        case DrawMode.LINES:          return gl.LINES;
        case DrawMode.TRIANGLES:      return gl.TRIANGLES;
        case DrawMode.LINE_LOOP:      return gl.LINE_LOOP;
        case DrawMode.LINE_STRIP:     return gl.LINE_STRIP;
        case DrawMode.TRIANGLE_STRIP: return gl.TRIANGLE_STRIP;
        case DrawMode.TRIANGLE_FAN:   return gl.TRIANGLE_FAN;
        default: throw new Error( "mapray: invalid Mesh.DrawMode: " + mode );
        }
    }


    /**
     * @summary ComponentType 型から GL 要素型へ変換
     *
     * @param  {mapray.Mesh.ComponentType} type  要素型
     * @return {number}                          GL 要素型
     * @private
     */
    _convertComponentType( type )
    {
        var gl = this._glenv.context;

        switch ( type ) {
        case ComponentType.BYTE:           return gl.BYTE;
        case ComponentType.UNSIGNED_BYTE:  return gl.UNSIGNED_BYTE;
        case ComponentType.SHORT:          return gl.SHORT;
        case ComponentType.UNSIGNED_SHORT: return gl.UNSIGNED_SHORT;
        case ComponentType.UNSIGNED_INT:   return gl.UNSIGNED_INT;
        case ComponentType.FLOAT:          return gl.FLOAT;
        default: throw new Error( "mapray: invalid Mesh.ComponentType: " + type );
        }
    }


    /**
     * @summary リソースを破棄
     */
    dispose()
    {
        this._attrib_data = {};
        this._index_data = null;
    }


    /**
     * @summary メッシュを描画
     *
     * @desc
     * <p>事前に material.bindProgram(), material.setParameters() すること。</p>
     *
     * @param {mapray.EntityMaterial} material  マテリアル
     */
    draw( material )
    {
        var gl = this._glenv.context;

        // 頂点属性のバインド
        material.bindVertexAttribs( this._attrib_data );

        var index_data = this._index_data;
        if ( index_data !== null ) {
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, index_data.buffer );
            gl.drawElements( this._draw_mode, index_data.num_indices, index_data.type, index_data.byte_offset );
        }
        else {
            gl.drawArrays( this._draw_mode, 0, this._num_vertices );
        }
    }

}


/**
 * @summary メッシュの初期化オブジェクト
 *
 * @memberof mapray.Mesh
 * @package
*/
class Initializer {

    /**
     * @param {mapray.Mesh.DrawMode} draw_mode     描画モード
     * @param {number}               num_vertices  頂点数
     */
    constructor( draw_mode, num_vertices )
    {
        this.draw_mode      = draw_mode;
        this.num_vertices   = num_vertices;
        this.index_data     = null;
        this.attribute_data = [];
    }


    /**
     * @summary インデックスデータを追加
     *
     * @param {mapray.MeshBuffer}         buffer       バッファ
     * @param {number}                    num_indices  インデックス数
     * @param {mapray.Mesh.ComponentType} type         インデックス型 (UNSIGNED_BYTE | UNSIGNED_SHORT | UNSIGNED_INT)
     * @param {object}                    [options]                オプション
     * @param {number}                    [options.byte_offset=0]  バッファ先頭からのバイトオフセット
     */
    addIndex( buffer, num_indices, type, options )
    {
        var opts = options || {};

        this.index_data = {
            buffer:      buffer,
            num_indices: num_indices,
            type:        type,
            byte_offset: (opts.byte_offset !== undefined) ? opts.byte_offset : 0
        };
    }


    /**
     * @summary 頂点属性データを追加
     *
     * @param {string}                    id              属性名
     * @param {mapray.MeshBuffer}         buffer          バッファ
     * @param {number}                    num_components  要素数
     * @param {mapray.Mesh.ComponentType} component_type  要素型
     * @param {object}                    [options]                   オプション
     * @param {boolean}                   [options.normalized=false]  正規化するか？
     * @param {number}                    [options.byte_stride=0]     頂点間のバイトストライド
     * @param {number}                    [options.byte_offset=0]     バッファ先頭からのバイトオフセット
     */
    addAttribute( id, buffer, num_components, component_type, options )
    {
        var opts = options || {};

        var data = {
            id:             id,
            buffer:         buffer,
            num_components: num_components,
            component_type: component_type,
            normalized:     (opts.normalized  !== undefined) ? opts.normalized  : false,
            byte_stride:    (opts.byte_stride !== undefined) ? opts.byte_stride : 0,
            byte_offset:    (opts.byte_offset !== undefined) ? opts.byte_offset : 0
        };

        this.attribute_data.push( data );
    }

}


/**
 * @summary 描画モードの列挙型
 * @enum {object}
 * @memberof mapray.Mesh
 * @constant
 */
var DrawMode = {

    /**
     * 点リスト
     */
    POINTS: { id: "POINTS" },

    /**
     * 線分リスト
     */
    LINES: { id: "LINES" },

    /**
     * 三角形リスト
     */
    TRIANGLES: { id: "TRIANGLES" },

    /**
     * 線分ループ
     */
    LINE_LOOP: { id: "LINE_LOOP" },

    /**
     * 線分ストリップ
     */
    LINE_STRIP: { id: "LINE_STRIP" },

    /**
     * 三角形ストリップ
     */
    TRIANGLE_STRIP: { id: "TRIANGLE_STRIP" },

    /**
     * 三角形ファン
     */
    TRIANGLE_FAN: { id: "TRIANGLE_FAN" }

};


/**
 * @summary 要素型の列挙型
 * @enum {object}
 * @memberof mapray.Mesh
 * @constant
 */
var ComponentType = {

    /**
     * 符号付き 8 ビット整数型
     */
    BYTE: { id: "BYTE" },

    /**
     * 符号なし 8 ビット整数型
     */
    UNSIGNED_BYTE: { id: "UNSIGNED_BYTE" },

    /**
     * 符号付き 16 ビット整数型
     */
    SHORT: { id: "SHORT" },

    /**
     * 符号なし 16 ビット整数型
     */
    UNSIGNED_SHORT: { id: "UNSIGNED_SHORT" },

    /**
     * 符号なし 32 ビット整数型
     */
    UNSIGNED_INT: { id: "UNSIGNED_INT" },

    /**
     * 32 ビット浮動小数点数型
     */
    FLOAT: { id: "FLOAT" }

};


/**
 * @summary JSON オブジェクトを Mesh.Initializer に変換
 *
 * @memberof mapray.Mesh
 * @private
 */
class JsonInit
{

    /**
     * @param {mapray.GLEnv} glenv
     * @param {object}       data   メッシュデータ
     */
    constructor( glenv, data )
    {
        var        vinfo = InitHelper.createVertexInfo( data.vtype );
        var  num_vcompos = InitHelper.numVertexComponents( vinfo );
        var num_vertices = data.vertices.length / num_vcompos;

        this._initializer = new Initializer( JsonInit._toDrawMode( data ), num_vertices );

        this._addIndex( glenv, data.indices, num_vertices );

        var  FLT_BYTES = 4;
        var     buffer = new MeshBuffer( glenv, InitHelper.toTypedArray( data.vertices, ComponentType.FLOAT ) );
        var byteStride = num_vcompos * FLT_BYTES;
        var byteOffset = 0;

        for ( var i = 0; i < vinfo.length; ++i ) {
            var num_compos = vinfo[i].size;
            this._initializer.addAttribute( vinfo[i].name, buffer, num_compos, ComponentType.FLOAT,
                                            { byte_stride: byteStride, byte_offset: byteOffset } );
            byteOffset += num_compos * FLT_BYTES;
        }
    }


    /**
     * @summary Mesh.Initializer インスタンスを取得
     * @type {Mesh.Initializer}
     * @readonly
     */
    get initializer() { return this._initializer; }


    /**
     * @summary インデックスデータを追加
     *
     * @param {mapray.GLEnv} glenv
     * @param {object}       indices       インデックス配列
     * @param {number}       num_vertices  頂点数
     */
    _addIndex( glenv, indices, num_vertices )
    {
        // インデックスの型は頂点数により自動的に決める
        var type = (num_vertices < 65536) ? ComponentType.UNSIGNED_SHORT : ComponentType.UNSIGNED_INT;

        var buffer = new MeshBuffer( glenv, InitHelper.toTypedArray( indices, type ),
                                     { target: MeshBuffer.Target.INDEX } );

        this._initializer.addIndex( buffer, indices.length, type );
    }


    /**
     * @summary Mesh.DrawMode に変換
     *
     * @param  {object} data           メッシュデータ
     * @return {mapray.Mesh.DrawMode}  描画モード
     * @private
     */
    static
    _toDrawMode( data )
    {
        // ptype?: ("triangles" | "lines") = "triangles"
        switch ( data.ptype ) {
        case "triangles": return DrawMode.TRIANGLES;
        case "lines":     return DrawMode.LINES;
        default:          return DrawMode.TRIANGLES;
        }
    }


}


/**
 * @summary メッシュバイナリを Mesh.Initializer に変換
 *
 * @memberof mapray.Mesh
 * @private
 */
class BinaryInit
{

    /**
     * @param {mapray.GLEnv} glenv
     * @param {ArrayBuffer}  data   メッシュデータ
     */
    constructor( glenv, data )
    {
        var header = new DataView( data, 0 );

        var vtype        = header.getUint8( BinaryInit.OFFSET_VTYPE );
        var itype        = header.getUint8( BinaryInit.OFFSET_ITYPE );
        var ptype        = header.getUint8( BinaryInit.OFFSET_PTYPE );
        var num_vertices = header.getUint32( BinaryInit.OFFSET_NUM_VERTICES, true );
        var num_indices  = header.getUint32( BinaryInit.OFFSET_NUM_INDICES,  true );

        this._initializer = new Initializer( BinaryInit._toDrawMode( ptype ), num_vertices );

        var vinfo = InitHelper.createVertexInfo( vtype );

        var indices = this._createIndexArray( glenv, data, itype, num_indices, vinfo, num_vertices );
        this._addIndex( glenv, itype, indices );

        var  FLT_BYTES = 4;
        var     buffer = new MeshBuffer( glenv, this._createVertexArray( data, vinfo, num_vertices ) );
        var byteStride = InitHelper.numVertexComponents( vinfo ) * FLT_BYTES;
        var byteOffset = 0;

        for ( var i = 0; i < vinfo.length; ++i ) {
            var num_compos = vinfo[i].size;
            this._initializer.addAttribute( vinfo[i].name, buffer, num_compos, ComponentType.FLOAT,
                                            { byte_stride: byteStride, byte_offset: byteOffset } );
            byteOffset += num_compos * FLT_BYTES;
        }
    }


    /**
     * @summary Mesh.Initializer インスタンスを取得
     * @type {Mesh.Initializer}
     * @readonly
     */
    get initializer() { return this._initializer; }


    /**
     * @summary インデックスバッファを作成 (バイナリデータから)
     *
     * @param  {mapray.GLEnv} glenv
     * @param  {ArrayBuffer}  src_buffer   バイナリデータ
     * @param  {number}       itype        インデックス型 (ENUM_ITYPE_UINT16 | ENUM_ITYPE_UINT32)
     * @param  {number}       num_indices  インデックス数
     * @param  {array}        vinfo        頂点情報
     * @param  {number}       num_vertices 頂点数
     * @return {Uint16Array|Uint32Array}   インデックス配列
     * @private
     */
    _createIndexArray( glenv, src_buffer, itype, num_indices, vinfo, num_vertices )
    {
        // 入力配列を作成
        var      FLT_BYTES = 4;
        var vertices_bytes = InitHelper.numVertexComponents( vinfo ) * num_vertices * FLT_BYTES;
        var       src_view = new DataView( src_buffer, BinaryInit.OFFSET_BODY + vertices_bytes );

        var i;
        var dst_array;
        var index_bytes;

        switch ( itype ) {
        case BinaryInit.ENUM_ITYPE_UINT16:
            dst_array   = new Uint16Array( num_indices );
            index_bytes = 2;
            for ( i = 0; i < num_indices; ++i ) {
                dst_array[i] = src_view.getUint16( index_bytes * i, true );
            }
            break;
        case BinaryInit.ENUM_ITYPE_UINT32:
            dst_array   = new Uint32Array( num_indices );
            index_bytes = 4;
            for ( i = 0; i < num_indices; ++i ) {
                dst_array[i] = src_view.getUint32( index_bytes * i, true );
            }
            break;
        default:
            throw new Error( "mapray: unknown itype: " + itype );
        }

        return dst_array;
    }


    /**
     * @summary 頂点バッファを作成 (バイナリデータから)
     *
     * @param  {ArrayBuffer} src_buffer    バイナリデータ
     * @param  {array}       vinfo         頂点情報
     * @param  {number}      num_vertices  頂点数
     * @return {Float32Array}              頂点データを格納した配列
     * @private
     */
    _createVertexArray( src_buffer, vinfo, num_vertices )
    {
        var FLT_BYTES = 4;

        // 入力配列を作成
        var num_elements = InitHelper.numVertexComponents( vinfo ) * num_vertices;
        var src_view     = new DataView( src_buffer, BinaryInit.OFFSET_BODY );
        var dst_array    = new Float32Array( num_elements );
        for ( var i = 0; i < num_elements; ++i ) {
            dst_array[i] = src_view.getFloat32( i * FLT_BYTES, true );
        }

        return dst_array;
    }


    /**
     * @summary インデックスデータを追加
     *
     * @param {mapray.GLEnv}            glenv
     * @param {number}                  itype    インデックス型 (ENUM_ITYPE_UINT16 | ENUM_ITYPE_UINT32)
     * @param {Uint16Array|Uint32Array} indices  インデックス配列
     * @private
     */
    _addIndex( glenv, itype, indices )
    {
        var buffer = new MeshBuffer( glenv, indices, { target: MeshBuffer.Target.INDEX } );
        var   type = BinaryInit._indexTypeToComponentType( itype );

        this._initializer.addIndex( buffer, indices.length, type );
    }


    /**
     * @summary Mesh.DrawMode に変換
     *
     * @param  {number} ptype          プリミティブタイプ
     * @return {mapray.Mesh.DrawMode}  描画モード
     * @private
     */
    static
    _toDrawMode( ptype )
    {
        switch ( ptype ) {
        case BinaryInit.ENUM_PTYPE_TRIANGLES: return DrawMode.TRIANGLES;
        case BinaryInit.ENUM_PTYPE_LINES:     return DrawMode.LINES;
        default: throw new Error( "mapray: invalid ptype: " + ptype );
        }
    }


    /**
     * @summary インデックス型から要素型へ変換
     *
     * @param  {number} itype               インデックス型 (ENUM_ITYPE_UINT16 | ENUM_ITYPE_UINT32)
     * @return {mapray.Mesh.ComponentType}  要素型 (UNSIGNED_SHORT | UNSIGNED_INT)
     * @private
     */
    static
    _indexTypeToComponentType( itype )
    {
        switch ( itype ) {
        case BinaryInit.ENUM_ITYPE_UINT16:
            return ComponentType.UNSIGNED_SHORT;
        case BinaryInit.ENUM_ITYPE_UINT32:
        default:
            return ComponentType.UNSIGNED_INT;
        }
    }

}

{
    // バイナリデータのオフセット
    BinaryInit.OFFSET_VTYPE = 0;
    BinaryInit.OFFSET_ITYPE = 1;
    BinaryInit.OFFSET_PTYPE = 2;
    BinaryInit.OFFSET_NUM_VERTICES = 4;
    BinaryInit.OFFSET_NUM_INDICES  = 8;
    BinaryInit.OFFSET_BODY  = 12;

    // ITYPE 列挙値
    BinaryInit.ENUM_ITYPE_UINT16 = 0;
    BinaryInit.ENUM_ITYPE_UINT32 = 1;

    // PTYPE 列挙値
    BinaryInit.ENUM_PTYPE_TRIANGLES = 0;
    BinaryInit.ENUM_PTYPE_LINES     = 1;
}


/**
 * @summary 初期化ヘルパー
 *
 * @memberof mapray.Mesh
 * @private
 */
class InitHelper
{

    /**
     * @summary 頂点情報を生成
     * @desc
     * <p>vtype を以下の形式に変換して返す。ただし vtype が配列なら vtype を返す。</p>
     * <pre>
     *   [ { name: 頂点属性名, size: 要素数 }, ... ]
     * </pre>
     * @param  {string|number|array} vtype  頂点タイプまたは頂点情報
     * @return {array}                      頂点情報
     */
    static
    createVertexInfo( vtype )
    {
        if ( Array.isArray( vtype ) ) {
            // vtype は最初から頂点情報
            return vtype;
        }

        var vinfo = null;

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
     * @summary 頂点データの要素数を取得
     *
     * @param  {object[]} vinfo  頂点情報
     * @return {number}          頂点データの要素数
     */
    static
    numVertexComponents( vinfo )
    {
        var     length = vinfo.length;
        var num_compos = 0;

        for ( var i = 0; i < length; ++i ) {
            num_compos += vinfo[i].size;
        }

        return num_compos;
    }


    /**
     * @summary 型配列に変換
     *
     * @param  {object}                    array  入力配列
     * @param  {mapray.Mesh.ComponentType} type   変換先の要素型
     * @return {TypedArray}                       変換された配列
     */
    static
    toTypedArray( array, type )
    {
        switch ( type ) {
        case ComponentType.UNSIGNED_SHORT:
            return (array instanceof Uint16Array) ? array : new Uint16Array( array );
        case ComponentType.UNSIGNED_INT:
            return (array instanceof Uint32Array) ? array : new Uint32Array( array );
        case ComponentType.FLOAT:
            return (array instanceof Float32Array) ? array : new Float32Array( array );
        default:
            throw new Error( "mapray: invalid component type: " + type );
        }
    }

}

{
    // VTYPE 列挙値
    InitHelper.ENUM_VTYPE_P   = 0;
    InitHelper.ENUM_VTYPE_PN  = 1;
    InitHelper.ENUM_VTYPE_PT  = 2;
    InitHelper.ENUM_VTYPE_PNT = 3;

    // 頂点属性名
    InitHelper.ANAME_P = "a_position";
    InitHelper.ANAME_N = "a_normal";
    InitHelper.ANAME_T = "a_texcoord";

    // 要素のサイズ (要素数)
    InitHelper.FSIZE_P = 3;
    InitHelper.FSIZE_N = 3;
    InitHelper.FSIZE_T = 2;
}


Mesh.Initializer = Initializer;
Mesh.DrawMode = DrawMode;
Mesh.ComponentType = ComponentType;


export default Mesh;
