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
        this._vertices     = null;
        this._attrib_data  = {};
        this._index_data   = null;

        if ( data instanceof Initializer ) {
            this._initByInitializer( data );
        }
        else if ( data instanceof ArrayBuffer ) {
            this._initByBinary( data );
        }
        else {
            this._initByObject( data );
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
     * @summary メッシュバイナリによる初期化
     * @desc
     * <p>buffer は Scene-Schema.txt のメッシュファイルと同じ構造である。</p>
     * @param {ArrayBuffer} buffer  バイナリデータ
     * @private
     */
    _initByBinary( buffer )
    {
        var header = new DataView( buffer, 0 );

        var vtype          = header.getUint8( Mesh.OFFSET_VTYPE );
        var itype          = header.getUint8( Mesh.OFFSET_ITYPE );
        var ptype          = header.getUint8( Mesh.OFFSET_PTYPE );
        this._num_vertices = header.getUint32( Mesh.OFFSET_NUM_VERTICES, true );
        var   num_indices  = header.getUint32( Mesh.OFFSET_NUM_INDICES,  true );

        var vinfo      = Mesh._createVertexInfo( vtype );
        this._vertices = this._createVerticesByBinary( buffer, vinfo );

        this._index_data = {
            buffer:      this._createIndicesByBinary( buffer, vinfo, itype, num_indices ),
            num_indices: num_indices,
            type:        this._indexTypeToComponentType( itype ),
            byte_offset: 0
        };

        this._initCommon( vinfo, ptype );
    }


    /**
     * @summary JSON オブジェクトによる初期化
     * @desc
     * <p>data は Scene-Schema.txt の <MESH-DATA> と同じ構造である。</p>
     * @param {object} data  メッシュデータ
     * @private
     */
    _initByObject( data )
    {
        var vinfo = Mesh._createVertexInfo( data.vtype );

        this._num_vertices = data.vertices.length / Mesh._numVertexElements( vinfo );
        var   num_indices  = data.indices.length;
        this._vertices     = this._createVerticesByObject( data.vertices, vinfo );   // vertices: [Number+]

        // インデックスの型は頂点数により自動的に決める
        var itype = (this._num_vertices < 65536) ? Mesh.ENUM_ITYPE_UINT16 : Mesh.ENUM_ITYPE_UINT32;

        this._index_data = {
            buffer:      this._createIndicesByObject( data.indices, itype, num_indices ),  // indices: [Number+]
            num_indices: num_indices,
            type:        this._indexTypeToComponentType( itype ),
            byte_offset: 0
        };

        this._initCommon( vinfo, data.ptype );
    }


    /**
     * @summary 初期化共通部分
     * @private
     */
    _initCommon( vinfo, ptype )
    {
        var gl = this._glenv.context;

        // _attrib_data
        this._attrib_data = this._createAttribDataMap( vinfo );

        // _draw_mode
        // ptype?: ("triangles" | "lines") = "triangles"
        this._draw_mode = gl.TRIANGLES;
        switch ( ptype ) {
        case "triangles":
        case Mesh.ENUM_PTYPE_TRIANGLES:
            this._draw_mode = gl.TRIANGLES;
            break;
        case "lines":
        case Mesh.ENUM_PTYPE_LINES:
            this._draw_mode = gl.LINES;
            break;
        }
    }


    /**
     * @summary インデックス型から要素型へ変換
     *
     * @param  {number} itype  インデックス型 (ENUM_ITYPE_UINT16 | ENUM_ITYPE_UINT32)
     * @return {number}        GL 要素型 (gl.UNSIGNED_SHORT | gl.UNSIGNED_INT)
     * @private
     */
    _indexTypeToComponentType( itype )
    {
        var gl = this._glenv.context;

        switch ( itype ) {
        case Mesh.ENUM_ITYPE_UINT16:
            return gl.UNSIGNED_SHORT;
        case Mesh.ENUM_ITYPE_UINT32:
        default:
            return gl.UNSIGNED_INT;
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
        default: throw new Error( "invalid Mesh.DrawMode: " + mode );
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
        default: throw new Error( "invalid Mesh.ComponentType: " + type );
        }
    }


    /**
     * @summary リソースを破棄
     */
    dispose()
    {
        var gl = this._glenv.context;

        gl.deleteBuffer( this._vertices );
        this._vertices = null;
        this._attrib_data = {};

        gl.deleteBuffer( this._index_data.buffer );
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


    /**
     * @summary 頂点バッファを作成 (バイナリデータから)
     *
     * @param  {ArrayBuffer} src_buffer  バイナリデータ
     * @param  {array}       vinfo       頂点情報
     * @return {WebGLBuffer}             頂点データを格納した WebGL バッファ
     * @private
     */
    _createVerticesByBinary( src_buffer, vinfo )
    {
        var FLT_BYTES = 4;

        // 入力配列を作成
        var num_elements = Mesh._numVertexElements( vinfo ) * this._num_vertices;
        var src_view     = new DataView( src_buffer, Mesh.OFFSET_BODY );
        var dst_array    = new Float32Array( num_elements );
        for ( var i = 0; i < num_elements; ++i ) {
            dst_array[i] = src_view.getFloat32( i * FLT_BYTES, true );
        }

        // VBO を生成
        var     gl = this._glenv.context;
        var target = gl.ARRAY_BUFFER;
        var    vbo = gl.createBuffer();
        gl.bindBuffer( target, vbo );
        gl.bufferData( target, dst_array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        return vbo;
    }


    /**
     * @summary インデックスバッファを作成 (バイナリデータから)
     *
     * @param  {ArrayBuffer} src_buffer   バイナリデータ
     * @param  {array}       vinfo        頂点情報
     * @param  {number}      itype        インデックス型 (ENUM_ITYPE_UINT16 | ENUM_ITYPE_UINT32)
     * @param  {number}      num_indices  インデックス数
     * @return {WebGLBuffer}              インデックスを格納した WebGL バッファ
     * @private
     */
    _createIndicesByBinary( src_buffer, vinfo, itype, num_indices )
    {
        // 入力配列を作成
        var vertices_bytes = Mesh._numVertexBytes( vinfo ) * this._num_vertices;
        var       src_view = new DataView( src_buffer, Mesh.OFFSET_BODY + vertices_bytes );

        var i;
        var dst_array;
        var index_bytes;

        switch ( itype ) {
        case Mesh.ENUM_ITYPE_UINT16:
            dst_array   = new Uint16Array( num_indices );
            index_bytes = 2;
            for ( i = 0; i < num_indices; ++i ) {
                dst_array[i] = src_view.getUint16( index_bytes * i, true );
            }
            break;
        case Mesh.ENUM_ITYPE_UINT32:
            dst_array   = new Uint32Array( num_indices );
            index_bytes = 4;
            for ( i = 0; i < num_indices; ++i ) {
                dst_array[i] = src_view.getUint32( index_bytes * i, true );
            }
            break;
        default:
            dst_array = null;
            console.error( "mapray: unknown itype: " + itype );
        }

        // VBO を生成
        var     gl = this._glenv.context;
        var target = gl.ELEMENT_ARRAY_BUFFER;
        var    vbo = gl.createBuffer();
        gl.bindBuffer( target, vbo );
        gl.bufferData( target, dst_array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        return vbo;
    }


    /**
     * @summary 頂点バッファを作成 (頂点配列から)
     *
     * @param  {array} src_array  頂点配列
     * @param  {array} vinfo      頂点情報
     * @return {WebGLBuffer}      頂点データを格納した WebGL バッファ
     * @private
     */
    _createVerticesByObject( src_array, vinfo )
    {
        // 入力配列を作成
        var num_vertices = this._num_vertices;
        var num_elements = Mesh._numVertexElements( vinfo ) * num_vertices;
        var dst_array    = new Float32Array( num_elements );
        for ( var i = 0; i < num_elements; ++i ) {
            dst_array[i] = src_array[i];
        }

        // VBO を生成
        var     gl = this._glenv.context;
        var target = gl.ARRAY_BUFFER;
        var    vbo = gl.createBuffer();
        gl.bindBuffer( target, vbo );
        gl.bufferData( target, dst_array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        return vbo;
    }


    /**
     * @summary インデックスバッファを作成 (インデックス配列から)
     *
     * @param  {array}  src_array    インデックス配列
     * @param  {number} itype        インデックス型 (ENUM_ITYPE_UINT16 | ENUM_ITYPE_UINT32)
     * @param  {number} num_indices  インデックス数
     * @return {WebGLBuffer}         インデックスを格納した WebGL バッファ
     * @private
     */
    _createIndicesByObject( src_array, itype, num_indices )
    {
        var i;
        var dst_array;

        switch ( itype ) {
        case Mesh.ENUM_ITYPE_UINT16:
            dst_array = new Uint16Array( num_indices );
            for ( i = 0; i < num_indices; ++i ) {
                dst_array[i] = src_array[i];
            }
            break;
        case Mesh.ENUM_ITYPE_UINT32:
            dst_array = new Uint32Array( num_indices );
            for ( i = 0; i < num_indices; ++i ) {
                dst_array[i] = src_array[i];
            }
            break;
        default:
            dst_array = null;
            console.error( "mapray: unknown itype: " + itype );
        }

        // VBO を生成
        var     gl = this._glenv.context;
        var target = gl.ELEMENT_ARRAY_BUFFER;
        var    vbo = gl.createBuffer();
        gl.bindBuffer( target, vbo );
        gl.bufferData( target, dst_array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        return vbo;
    }


    /**
     * @summary 頂点情報を生成
     * @desc
     * <p>vtype を以下の形式に変換して返す。ただし vtype が配列なら vtype を返す。</p>
     * <pre>
     *   [ { name: 頂点属性名, size: 要素数 }, ... ]
     * </pre>
     * @param  {string|number|array} vtype  頂点タイプまたは頂点情報
     * @return {array}                      頂点情報
     *
     * @private
     */
    static _createVertexInfo( vtype )
    {
        if ( Array.isArray( vtype ) ) {
            // vtype は最初から頂点情報
            return vtype;
        }

        var vinfo = null;

        // vtype: ("P" | "PN" | "PT" | "PNT")
        switch ( vtype ) {
        case "P":
        case Mesh.ENUM_VTYPE_P:
            vinfo = [
                { name: Mesh.ANAME_P, size: Mesh.FSIZE_P }
            ];
            break;
        case "PN":
        case Mesh.ENUM_VTYPE_PN:
            vinfo = [
                { name: Mesh.ANAME_P, size: Mesh.FSIZE_P },
                { name: Mesh.ANAME_N, size: Mesh.FSIZE_N }
            ];
            break;
        case "PT":
        case Mesh.ENUM_VTYPE_PT:
            vinfo = [
                { name: Mesh.ANAME_P, size: Mesh.FSIZE_P },
                { name: Mesh.ANAME_T, size: Mesh.FSIZE_T }
            ];
            break;
        case "PNT":
        case Mesh.ENUM_VTYPE_PNT:
            vinfo = [
                { name: Mesh.ANAME_P, size: Mesh.FSIZE_P },
                { name: Mesh.ANAME_N, size: Mesh.FSIZE_N },
                { name: Mesh.ANAME_T, size: Mesh.FSIZE_T }
            ];
            break;
        default:
            console.error( "mapray: unknown vtype: " + vtype );
            break;
        }

        return vinfo;
    }


    /**
     * 頂点属性データの辞書を作成
     *
     * Input:
     *   this._glenv
     *   this._vertices
     *
     * @param  {array} vinfo  オブジェクト {name: String, size: Number} の配列
     * @return {object}       頂点属性データの辞書
     *
     * @private
     */
    _createAttribDataMap( vinfo )
    {
        var FLT_BYTES = 4;
        var gl = this._glenv.context;
        var length = vinfo.length;
        var offset = 0;

        var dict  = {};
        var table = [];

        for ( var i = 0; i < length; ++i ) {

            var data = {
                buffer:          this._vertices,
                num_components:  vinfo[i].size,
                component_type:  gl.FLOAT,
                normalized:      false,
                byte_stride:     0,  // 仮の値
                byte_offset:     offset
            };

            dict[ vinfo[i].name ] = data;
            table.push( data );

            offset += vinfo[i].size * FLT_BYTES;
        }

        // byte_stride に正式の値を設定
        for ( i = 0; i < length; ++i ) {
            table[i].byte_stride = offset;
        }

        return dict;
    }

    /**
     * 頂点データの要素数を取得
     * @private
     */
    static _numVertexElements( vinfo )
    {
        var length = vinfo.length;
        var num_elements = 0;
        for ( var i = 0; i < length; ++i ) {
            num_elements += vinfo[i].size;
        }
        return num_elements;
    }


    /**
     * 頂点データのバイト数を取得
     * @private
     */
    static _numVertexBytes( vinfo )
    {
        var FLT_BYTES = 4;
        var length = vinfo.length;
        var num_bytes = 0;
        for ( var i = 0; i < length; ++i ) {
            num_bytes += vinfo[i].size * FLT_BYTES;
        }
        return num_bytes;
    }

}


/**
 * @summary メッシュの初期化オブジェクト
 *
 * @memberof mapray.Mesh
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


// クラス定数の定義
{
    // バイナリデータのオフセット
    Mesh.OFFSET_VTYPE = 0;
    Mesh.OFFSET_ITYPE = 1;
    Mesh.OFFSET_PTYPE = 2;
    Mesh.OFFSET_NUM_VERTICES = 4;
    Mesh.OFFSET_NUM_INDICES  = 8;
    Mesh.OFFSET_BODY  = 12;

    // VTYPE 列挙値
    Mesh.ENUM_VTYPE_P   = 0;
    Mesh.ENUM_VTYPE_PN  = 1;
    Mesh.ENUM_VTYPE_PT  = 2;
    Mesh.ENUM_VTYPE_PNT = 3;

    // ITYPE 列挙値
    Mesh.ENUM_ITYPE_UINT16 = 0;
    Mesh.ENUM_ITYPE_UINT32 = 1;

    // PTYPE 列挙値
    Mesh.ENUM_PTYPE_TRIANGLES = 0;
    Mesh.ENUM_PTYPE_LINES     = 1;

    // 頂点属性名
    Mesh.ANAME_P = "a_position";
    Mesh.ANAME_N = "a_normal";
    Mesh.ANAME_T = "a_texcoord";

    // 要素のサイズ (要素数)
    Mesh.FSIZE_P = 3;
    Mesh.FSIZE_N = 3;
    Mesh.FSIZE_T = 2;
}


Mesh.Initializer = Initializer;
Mesh.DrawMode = DrawMode;
Mesh.ComponentType = ComponentType;


export default Mesh;
