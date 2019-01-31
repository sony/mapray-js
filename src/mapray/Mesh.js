/**
 * @summary モデルメッシュ
 * @memberof mapray
 * @package
 */
class Mesh {

    /**
     * @param {mapray.GLEnv}       glenv
     * @param {ArrayBuffer|object} data   メッシュデータ
     */
    constructor( glenv, data )
    {
        this._glenv        = glenv;
        this._num_vertices = 0;
        this._num_indices  = 0;
        this._vertices     = null;
        this._indices      = null;

        this._vertex_bytes = 0;
        this._attrib_data  = {};
        this._draw_mode    = undefined;
        this._index_type   = undefined;

        if ( data instanceof ArrayBuffer ) {
            this._initByBuffer( data );
        }
        else {
            this._initByObject( data );
        }
    }


    /**
     * @param {ArrayBuffer} buffer  バイナリデータ
     * @private
     */
    _initByBuffer( buffer )
    {
        var header = new DataView( buffer, 0 );

        var vtype          = header.getUint8( Mesh.OFFSET_VTYPE );
        var itype          = header.getUint8( Mesh.OFFSET_ITYPE );
        var ptype          = header.getUint8( Mesh.OFFSET_PTYPE );
        this._num_vertices = header.getUint32( Mesh.OFFSET_NUM_VERTICES, true );
        this._num_indices  = header.getUint32( Mesh.OFFSET_NUM_INDICES,  true );

        var vinfo = Mesh._createVertexInfo( vtype );

        this._vertices = this._createVerticesByBuffer( buffer, vinfo );
        this._indices  = this._createIndicesByBuffer( buffer, vinfo, itype );

        this._initCommon( vinfo, itype, ptype );
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
        this._num_indices  = data.indices.length;

        // インデックスの型は頂点数により自動的に決める
        var itype = (this._num_vertices < 65536) ? Mesh.ENUM_ITYPE_UINT16 : Mesh.ENUM_ITYPE_UINT32;

        // vertices: [Number+]
        this._vertices = this._createVerticesByObject( data.vertices, vinfo );

        // indices: [Number+]
        this._indices  = this._createIndicesByObject( data.indices, itype );

        this._initCommon( vinfo, itype, data.ptype );
    }


    /**
     * @summary 初期化共通部分
     * @private
     */
    _initCommon( vinfo, itype, ptype )
    {
        var gl = this._glenv.context;

        this._vertex_bytes = Mesh._numVertexBytes( vinfo );

        // _attrib_data
        this._attrib_data = Mesh._createAttribData( vinfo );

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

        // _index_type
        this._index_type = gl.UNSIGNED_INT;
        switch ( itype ) {
        case Mesh.ENUM_ITYPE_UINT16:
            this._index_type = gl.UNSIGNED_SHORT;
            break;
        case Mesh.ENUM_ITYPE_UINT32:
            this._index_type = gl.UNSIGNED_INT;
            break;
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

        gl.deleteBuffer( this._indices );
        this._indices = null;
    }


    /**
     * @summary メッシュを描画
     * @desc
     * <p>事前に material.bindProgram(), material.setParameters() すること。</p>
     * @param {mapray.EntityMaterial} material  マテリアル
     */
    draw( material )
    {
        var gl = this._glenv.context;

        // 頂点属性のバインド
        this._bindVertexAttribs( material );

        // インデックスのバインド
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this._indices );

        // 描画処理
        gl.drawElements( this._draw_mode, this._num_indices, this._index_type, 0 );
    }


    /**
     * @summary 頂点属性のバインド
     * @private
     */
    _bindVertexAttribs( material )
    {
        var     gl = this._glenv.context;
        var  names = material.getAttribNames();
        var stride = this._vertex_bytes;

        gl.bindBuffer( gl.ARRAY_BUFFER, this._vertices );
        for ( var i = 0; i < names.length; ++i ) {
            var name = names[i];
            var data = this._attrib_data[name];
            if ( data ) {
                material.bindVertexAttrib( name, data.size, stride, data.offset );
            }
        }
        gl.bindBuffer( gl.ARRAY_BUFFER, null );
    }


    /**
     * 頂点データを作成
     * @private
     */
    _createVerticesByBuffer( src_buffer, vinfo )
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
     * インデックスデータを作成
     * @private
     */
    _createIndicesByBuffer( src_buffer, vinfo, itype )
    {
        // 入力配列を作成
        var vertices_bytes = Mesh._numVertexBytes( vinfo ) * this._num_vertices;
        var       src_view = new DataView( src_buffer, Mesh.OFFSET_BODY + vertices_bytes );

        var i;
        var num_indices = this._num_indices;
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
     * 頂点データを作成
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
     * インデックスデータを作成
     * @private
     */
    _createIndicesByObject( src_array, itype )
    {
        var i;
        var num_indices = this._num_indices;
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
     * vtype を以下の形式に変換して返す。ただし vtype が配列なら vtype を返す。
     *
     *   [ { name: 頂点属性名, size: 要素数 }, ... ]
     *
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
     * 頂点属性データを作成
     * @private
     */
    static _createAttribData( vinfo )
    {
        var FLT_BYTES = 4;
        var length = vinfo.length;
        var attrib_data = {};
        var offset = 0;

        for ( var i = 0; i < length; ++i ) {
            attrib_data[vinfo[i].name] = {
                size:   vinfo[i].size,
                offset: offset
            };
            offset += vinfo[i].size * FLT_BYTES;
        }

        return attrib_data;
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


export default Mesh;
