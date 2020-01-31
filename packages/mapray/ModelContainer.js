import Content from "./gltf/Content";
import GeoMath from "./GeoMath";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import MeshBuffer from "./MeshBuffer";
import Texture from "./Texture";
import ModelMaterial from "./ModelMaterial";
import NormalTextureInfo from "./gltf/NormalTextureInfo";
import OcclusionTextureInfo from "./gltf/OcclusionTextureInfo";


/**
 * @summary エンティティ用のモデルデータを格納
 *
 * @classdesc
 * <p>エンティティが使用するモデルデータを格納するクラスである。</p>
 *
 * @memberof mapray
 * @private
 * @see mapray.ModelEntity
 */
class ModelContainer {

    /**
     * @param {mapray.Scene}        scene    エンティティが所属するシーン
     * @param {mapray.gltf.Content} content  入力モデルデータ
     */
    constructor( scene, content )
    {
        this._entries  = [];    // 辞書: 整数 -> Entry
        this._name_map = {};    // 辞書: 名前 -> Entry
        this._default  = null;  // 既定モデルの Entry
        this._offset_transform = GeoMath.setIdentity( GeoMath.createMatrix() );

        const share = {};

        for ( const gltf_scene of content.scenes ) {
            const entry = new Entry( scene, gltf_scene, share );

            this._entries.push( entry );

            if ( gltf_scene.name !== null ) {
                this._name_map[gltf_scene.name] = entry;
            }
        }

        if ( content.default_scene_index >= 0 ) {
            if ( content.default_scene_index < this._entries.length ) {
                this._default = this._entries[content.default_scene_index];
            }
            else {
                throw new Error( "default_scene_index is out of range" );
            }
        }
        else {
            if ( this._entries.length >= 1 ) {
                this._default = this._entries[0];
            }
        }
    }


    /**
     * @summary オフセット用の変換行列を設定
     *
     * @param {mapray.Matrix} matrix  モデルの頂点座標を変換する変換行列
     */
    setOffsetTransform( matrix )
    {
        GeoMath.copyMatrix( matrix, this._offset_transform );
    }


    /**
     * @summary モデルデータを生成
     *
     * @desc
     * <p>id で指定したモデルのプリミティブを生成する。ただし id を省略したときは既定のモデルが選択される。</p>
     * <p>id で指定したモデルが存在しないとき、または id を省略したがモデルがまったく存在しないとき null を返す。</p>
     *
     * @param  {number|string} [id]   モデル ID
     * @return {?mapray.Primitive[]}  モデルのプリミティブ配列
     */
    createPrimitives( id )
    {
        const entry = this._getEntry( id );
        if ( entry === null ) return null;

        const primitives = [];

        for ( const prim of entry.primitives ) {
            const cloned_prim = prim.fastClone();
            GeoMath.mul_AA( this._offset_transform, cloned_prim.transform, cloned_prim.transform );  // オフセット変換行列を適用
            cloned_prim.properties = Builder.fastCloneProperties( cloned_prim.properties );
            primitives.push( cloned_prim );
        }

        return primitives;
    }


    /**
     * @summary エントリーを取得
     *
     * @param  {number|string} [id]            モデル ID
     * @return {?mapray.ModelContainer.Entry}  モデルエントリー
     * @private
     */
    _getEntry( id )
    {
        if ( typeof id == 'number' ) {
            // id を整数で指定
            if ( 0 <= id && id < this._entries.length ) {
                return this._entries[id];
            }
        }
        else if ( typeof id == 'string' ) {
            // id を名前で指定
            if ( this._name_map.hasOwnProperty( id ) ) {
                return this._name_map[id];
            }
        }
        else {
            // id 指定なし
            if ( this._entries.length > 0 ) {
                return this._entries[0];
            }
        }

        return null;
    }

}


/**
 * @summary モデルエントリー
 *
 * @memberof mapray.ModelContainer
 * @private
 */
class Entry {

    /**
     * @param {mapray.Scene}      mr_scene    Mapray シーン
     * @param {mapray.gltf.Scene} gltf_scene  glTF シーン
     * @param {object}            share       Builder インスタンス間の共有情報
     */
    constructor( mr_scene, gltf_scene, share )
    {
        var builer = new Builder( mr_scene, gltf_scene, share );

        this._primitives = builer.primitives;
    }


    /**
     * @summary mapray.Primitive の配列を取得
     * @desc
     * <p>transform プロパティはプリミティブ座標系からエンティティ座標系への変換になっている。</p>
     * @type {mapray.Primitive[]}
     * @readonly
     */
    get primitives() { return this._primitives; }

}


/**
 * @summary glTF シーンから mapray.Primitive の配列を構築
 *
 * @memberof mapray.ModelContainer
 * @private
 */
class Builder {

    /**
     * @param {mapray.Scene}      mr_scene    Mapray シーン
     * @param {mapray.gltf.Scene} gltf_scene  glTF シーン
     * @param {object}            share       Builder インスタンス間の共有情報
     */
    constructor( mr_scene, gltf_scene, share )
    {
        // share を初期化
        if ( !share.buffer_map ) {
            share.buffer_map  = new Map();  // gltf.Buffer  -> MeshBuffer
            share.texture_map = new Map();  // gltf.Texture -> Texture
        }

        this._mr_scene   = mr_scene;
        this._glenv      = mr_scene.glenv;
        this._primitives = [];

        this._buffer_map  = share.buffer_map;
        this._texture_map = share.texture_map;

        var identity = GeoMath.setIdentity( GeoMath.createMatrix() );  // シーンからシーンへの変換 (恒等行列)

        for ( var node of gltf_scene.root_nodes ) {
            this._addNode( node, identity );
        }
    }


    /**
     * @summary mapray.Primitive の配列を取得
     * @desc
     * <p>transform プロパティはプリミティブ座標系からエンティティ座標系への変換になっている。</p>
     * @type {mapray.Primitive[]}
     * @readonly
     */
    get primitives() { return this._primitives; }


    /**
     * ノードを追加
     *
     * @param {mapray.gltf.Node} node  追加対象のノード
     * @param {mapray.Matrix}    ptos  親ノード座標系からシーン座標系への変換
     * @private
     */
    _addNode( node, ptos )
    {
        var ntos = Builder._getNodeToScene( node, ptos );

        if ( node.mesh !== null ) {
            for ( var primitive of node.mesh.primitives ) {
                // プリミティブを追加
                this._primitives.push( this._createPrimitive( primitive, ntos ) );
            }
        }

        // 子孫の処理
        for ( var child of node.children ) {
            this._addNode( child, ntos );
        }
    }


    /**
     * node 座標系からシーン座標系の変換行列を取得
     *
     * @param  {mapray.gltf.Node} node  追加対象のノード
     * @param  {mapray.Matrix}    ptos  親ノード座標系からシーン座標系への変換行列
     * @return {mapray.Matrix}          node 座標系からシーン座標系の変換行列
     * @private
     */
    static
    _getNodeToScene( node, ptos )
    {
        var ntos = ptos;  // node 座標系からシーン座標系の変換

        var ntop = node.matrix;  // node 座標系から親ノード座標系の変換
        if ( ntop !== null ) {
            ntos = GeoMath.createMatrix();
            GeoMath.mul_AA( ptos, ntop, ntos );
        }

        return ntos;
    }


    /**
     * プリミティブを生成
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @param {mapray.Matrix}          ntos   ノード座標系からシーン座標系への変換
     * @return {mapray.Primitive}             出力プリミティブ
     * @private
     */
    _createPrimitive( iprim, ntos )
    {
        var     mesh = this._createMesh( iprim );
        var material = this._createMaterial( iprim );
        var    oprim = new Primitive( this._glenv, mesh, material, GeoMath.createMatrix( ntos ) );

        oprim.pivot      = this._createMeshPivot( iprim );
        oprim.bbox       = this._createBoundingBox( iprim );
        oprim.properties = this._createProperties( iprim );

        return oprim;
    }


    /**
     * メッシュを生成
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @return {mapray.Mesh}                  メッシュ
     * @private
     */
    _createMesh( iprim )
    {
        var init = new Mesh.Initializer( Builder._convertPrimitiveMode( iprim ), Builder._calcNumVertices( iprim ) );

        var attributes = iprim.attributes;
        for ( var name in attributes ) {
            this._addAttribToInit( init, name, attributes[name] );
        }

        var indices = iprim.indices;
        if ( indices !== null ) {
            this._addIndexToInit( init, indices );
        }

        return new Mesh( this._glenv, init );
    }


    /**
     * 描画モードに変換
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @return {mapray.Mesh.DrawMode}         描画モード
     * @private
     */
    static
    _convertPrimitiveMode( iprim )
    {
        return Builder._DrawMode[iprim.mode];
    }


    /**
     * 頂点数を計算
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @return {number}                       頂点数
     * @private
     */
    static
    _calcNumVertices( iprim )
    {
        var attributes = iprim.attributes;

        var counts = [];

        for ( var name in attributes ) {
            var accessor = attributes[name];
            counts.push( accessor.count );
        }

        return Math.min.apply( null, counts );
    }


    /**
     * 頂点属性をイニシャライザに追加
     *
     * @param {mapray.Mesh.Initializer} init      追加先
     * @param {string}                  name      属性名
     * @param {mapray.gltf.Accessor}    accessor  アクセサ
     * @private
     */
    _addAttribToInit( init, name, accessor )
    {
        var buffer = this._findMeshBuffer( accessor.bufferView.buffer, MeshBuffer.Target.ATTRIBUTE );

        var num_components = Builder._NumComponents[accessor.type];
        var component_type = Builder._ComponentType[accessor.componentType];

        var options = {
            normalized:  accessor.normalized,
            byte_stride: accessor.bufferView.byteStride,
            byte_offset: accessor.bufferView.byteOffset + accessor.byteOffset
        };

        var id = Builder._VertexAttribId[name] || name;

        init.addAttribute( id, buffer, num_components, component_type, options );
    }


    /**
     * インデックスをイニシャライザに追加
     *
     * @param {mapray.Mesh.Initializer} init      追加先
     * @param {mapray.gltf.Accessor}    accessor  アクセサ
     * @private
     */
    _addIndexToInit( init, accessor )
    {
        var buffer = this._findMeshBuffer( accessor.bufferView.buffer, MeshBuffer.Target.INDEX );

        var num_indices = accessor.count;
        var        type = Builder._ComponentType[accessor.componentType];

        var options = {
            byte_offset: accessor.bufferView.byteOffset + accessor.byteOffset
        };

        init.addIndex( buffer, num_indices, type, options );
    }


    /**
     * MeshBuffer インスタンスを検索
     *
     * @param  {mapray.gltf.Buffer}       buffer  入力バッファ
     * @param  {mapray.MeshBuffer.Target} target  使用目的
     * @return {mapray.MeshBuffer}
     * @private
     */
    _findMeshBuffer( buffer, target )
    {
        var meshBuffer = this._buffer_map.get( buffer );
        if ( meshBuffer === undefined ) {
            meshBuffer = new MeshBuffer( this._glenv, buffer.binary, { target: target } );
            this._buffer_map.set( buffer, meshBuffer );
        }

        return meshBuffer;
    }


    /**
     * マテリアルを生成
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @return {mapray.EntityMaterial}        マテリアル
     * @private
     */
    _createMaterial( iprim )
    {
        var scene = this._mr_scene;

        if ( !scene._ModelEntity_model_material ) {
            // scene にマテリアルをキャッシュ
            scene._ModelEntity_model_material = new ModelMaterial( scene.glenv );
        }

        return scene._ModelEntity_model_material;
    }


    /**
     * メッシュ基点を生成
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @return {?mapray.Vector3}              メッシュ基点
     * @private
     */
    _createMeshPivot( iprim )
    {
        var pivot = null;
        var  bbox = this._createBoundingBox( iprim );

        if ( bbox !== null ) {
            pivot = GeoMath.createVector3();
            // 境界箱の中点
            for ( var i = 0; i < 3; ++i ) {
                pivot[i] = (bbox[0][i] + bbox[1][i]) / 2;
            }
        }

        return pivot;
    }


    /**
     * 境界箱を生成
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @return {?mapray.Vector3[]}            境界箱
     * @private
     */
    _createBoundingBox( iprim )
    {
        var bbox = null;

        var attrib = iprim.attributes['POSITION'];
        if ( attrib !== undefined ) {
            var min = attrib.min;
            var max = attrib.max;
            if ( min !== null && max !== null ) {
                bbox = [GeoMath.createVector3( min ), GeoMath.createVector3( max )];
            }
        }

        return bbox;
    }


    /**
     * プロパティを生成
     *
     * @param  {mapray.gltf.Primitive} iprim  入力プリミティブ
     * @return {object}                       プロパティ
     * @private
     */
    _createProperties( iprim )
    {
        var material = iprim.material;

        if ( material === null ) {
            // 既定のマテリアル
            return {
                pbrMetallicRoughness: {
                    baseColorFactor:          GeoMath.createVector4f( [1.0, 1.0, 1.0, 1.0] ),
                    baseColorTexture:         null,
                    metallicFactor:           1.0,
                    roughnessFactor:          1.0,
                    metallicRoughnessTexture: null
                },
                doubleSided:      false,
                alphaMode:        "OPAQUE",
                alphaCutoff:      0.5,
                emissiveFactor:   GeoMath.createVector3f( [0.0, 0.0, 0.0] ),
                emissiveTexture:  null,
                normalTexture:    null,
                occlusionTexture: null
            };
        }
        else {
            const pbrMR = material.pbrMetallicRoughness;

            return {
                pbrMetallicRoughness: {
                    baseColorFactor:          GeoMath.createVector4f( pbrMR.baseColorFactor ),
                    baseColorTexture:         this._createTextureParam( pbrMR.baseColorTexture ),
                    metallicFactor:           pbrMR.metallicFactor,
                    roughnessFactor:          pbrMR.roughnessFactor,
                    metallicRoughnessTexture: this._createTextureParam( pbrMR.metallicRoughnessTexture )
                },
                doubleSided:      material.doubleSided,
                alphaMode:        material.alphaMode,
                alphaCutoff:      material.alphaCutoff,
                emissiveFactor:   GeoMath.createVector3f( material.emissiveFactor ),
                emissiveTexture:  this._createTextureParam( material.emissiveTexture ),
                normalTexture:    this._createTextureParam( material.normalTexture ),
                occlusionTexture: this._createTextureParam( material.occlusionTexture )
            };
        }
    }


    /**
     * テクスチャパラメータを生成
     *
     * @param  {mapray.gltf.TextureInfo} texinfo  TextureInfo インスタンス
     * @return {object}  テクスチャパラメータ
     * @private
     */
    _createTextureParam( texinfo )
    {
        if ( texinfo === null ) {
            return null;
        }

        var param = {
            texture:  this._findTexture( texinfo.texture ),
            texCoord: texinfo.texCoord
        };

        if ( texinfo instanceof NormalTextureInfo ) {
            param.scale = texinfo.scale;
        }
        else if ( texinfo instanceof OcclusionTextureInfo ) {
            param.strength = texinfo.strength;
        }

        return param;
    }


    /**
     * モデル用のプロパティを複製
     *
     * @param  {mapray.PropSet} props
     * @return {mapray.PropSet}
     *
     * @see _createProperties()
     */
    static
    fastCloneProperties( props )
    {
        const src_pbr = props.pbrMetallicRoughness;

        return {
            pbrMetallicRoughness: {
                baseColorFactor:          GeoMath.createVector3f( src_pbr.baseColorFactor ),
                baseColorTexture:         Builder._fastCloneTextureParam( src_pbr.baseColorTexture ),
                metallicFactor:           src_pbr.metallicFactor,
                roughnessFactor:          src_pbr.roughnessFactor,
                metallicRoughnessTexture: Builder._fastCloneTextureParam( src_pbr.metallicRoughnessTexture )
            },
            doubleSided:      props.doubleSided,
            alphaMode:        props.alphaMode,
            alphaCutoff:      props.alphaCutoff,
            emissiveFactor:   GeoMath.createVector3f( props.emissiveFactor ),
            emissiveTexture:  Builder._fastCloneTextureParam( props.emissiveTexture ),
            normalTexture:    Builder._fastCloneTextureParam( props.normalTexture ),
            occlusionTexture: Builder._fastCloneTextureParam( props.occlusionTexture )
        };
    }


    /**
     * テクスチャパラメータを複製
     *
     * @param  {object} param
     * @return {!object}
     *
     * @private
     * @see _createTextureParam()
     */
    static
    _fastCloneTextureParam( iparam )
    {
        if ( iparam === null ) return null;

        var oparam = {
            texture:  iparam.texture,
            texCoord: iparam.texCoord
        };

        if ( 'scale' in iparam ) {
            oparam.scale = iparam.scale;
        }
        else if ( 'strength' in iparam ) {
            oparam.strength = iparam.strength;
        }

        return oparam;
    }


    /**
     * テクスチャパラメータを生成
     *
     * @param  {mapray.gltf.Texture} itexture  glTF テクスチャ
     * @return {mapray.Texture}                テクスチャ
     * @private
     */
    _findTexture( itexture )
    {
        var otexture = this._texture_map.get( itexture );

        if ( otexture === undefined ) {
            var  sampler = itexture.sampler;
            var       gl = this._glenv.context;
            var tex_opts = {
                mag_filter: (sampler.magFilter !== undefined) ? sampler.magFilter : gl.LINEAR,
                min_filter: (sampler.minFilter !== undefined) ? sampler.minFilter : gl.LINEAR_MIPMAP_LINEAR,
                wrap_s:     sampler.wrapS,
                wrap_t:     sampler.wrapT,
                flip_y:     false  // glTF のテクスチャ座標は左上が原点なので画像を反転しない
            };
            otexture = new Texture( this._glenv, itexture.source.image, tex_opts );
            this._texture_map.set( itexture, otexture );
        }

        return otexture;
    }

}


// gltf.Primitive.mode -> mapray.Mesh.DrawMode
Builder._DrawMode = {
    0: Mesh.DrawMode.POINTS,
    1: Mesh.DrawMode.LINES,
    2: Mesh.DrawMode.LINE_LOOP,
    3: Mesh.DrawMode.LINE_STRIP,
    4: Mesh.DrawMode.TRIANGLES,
    5: Mesh.DrawMode.TRIANGLE_STRIP,
    6: Mesh.DrawMode.TRIANGLE_FAN
};


// gltf.Accessor.type -> 要素数
Builder._NumComponents = {
    'SCALAR': 1,
    'VEC2':   2,
    'VEC3':   3,
    'VEC4':   4
};


// gltf.Accessor.componentType -> mapray.Mesh.ComponentType
Builder._ComponentType = {
    5120: Mesh.ComponentType.BYTE,
    5121: Mesh.ComponentType.UNSIGNED_BYTE,
    5122: Mesh.ComponentType.SHORT,
    5123: Mesh.ComponentType.UNSIGNED_SHORT,
    5125: Mesh.ComponentType.UNSIGNED_INT,
    5126: Mesh.ComponentType.FLOAT
};


// gltf.Primitive.attributes のキー -> 頂点属性 ID
Builder._VertexAttribId = {
    'POSITION':   "a_position",
    'NORMAL':     "a_normal",
    'TANGENT':    "a_tangent",
    'TEXCOORD_0': "a_texcoord",
    'TEXCOORD_1': "a_texcoord1",
    'COLOR_0':    "a_color"
};


export default ModelContainer;
