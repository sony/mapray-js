import Loader from "./Loader"
import GeoMath from "./GeoMath";
import Orientation from "./Orientation";
import CredentialMode from "./CredentialMode";
import ModelContainer from "./ModelContainer";
import MarkerLineEntity from "./MarkerLineEntity";
import PathEntity from "./PathEntity";
import TextEntity from "./TextEntity";
import ModelEntity from "./ModelEntity";
import PolygonEntity from "./PolygonEntity";
import GltfTool from "./gltf/Tool";
import Resource, { URLResource, ResourceType } from "./Resource";

/**
 * @summary シーンの読み込み
 * @memberof mapray
 */
class SceneLoader extends Loader {

    /**
     * @desc
     * <p>url で指定したシーンデータの読み込みを開始し、scene にエンティティを構築する。</p>
     * <p>読み込みが終了したとき options.callback を呼び出す。</p>
     * @param {mapray.Scene} scene      読み込み先のシーン
     * @param {string}       resource        シーンリソース
     * @param {object}       [options]  オプション集合
     * @param {mapray.SceneLoader.TransformCallback} [options.transform]  リソース要求変換関数
     * @param {mapray.Loader.EntityCallback}         [options.onEntity]   エンティティコールバック
     * @param {mapray.SceneLoader.FinishCallback}    [options.callback]   終了コールバック関数
     */
    constructor( scene, resource, options={} )
    {
        if ( resource instanceof Resource ) {
            // OK
        }
        else if ( typeof resource === "string" ) {
            resource = new URLResource(resource, {
                    type: "json",
                    transform: options.transform
            });
        }
        else {
            throw new Error( "Unsupported Resource: " + resource );
        }

        super( scene, resource, {
                onEntity: options.onEntity,
                onLoad: options.callback
        } );

        this._glenv      = scene.glenv;
        this._references = {};
        this._finished   = false;
    }



    /**
     * @summary オブジェクト参照を取得
     * @desc
     * <p>注意: シーンの読み込みが終了したことを確認してからこのメソッドを呼び出すこと。</p>
     * @param  {string}                                   id  識別子
     * @return {?(mapray.ModelContainer|mapray.Entity)}  オブジェクト
     */
    getReference( id )
    {
        var ref = this._references[id];
        return (ref !== undefined) ? ref : null;
    }


    /**
     * @summary オブジェクト参照を設定
     * @desc
     * <p>オブジェクト item を識別子 id で参照できるように this に設定する。</p>
     * @param {string}                                   id    識別子
     * @param {mapray.ModelContainer|mapray.Entity} item  オブジェクト
     * @private
     */
    _setReference( id, item )
    {
        // 参照を設定
        this._references[id] = item;
    }


    /**
     * @summary 読み込み処理の実態。継承クラスによって実装される。
     * @private
     */
    _load()
    {
        return (
            this._resource.load( { type: ResourceType.JSON } )
            .then( oscene => {
                    // JSON データの取得に成功
                    this._check_cancel();
                    return this._load_object( oscene );
            } )
        );
    }


    /**
     * JSON シーンオブジェクトを解析
     * @private
     */
    _load_object( oscene )
    {
        return (
            Promise.resolve()
            .then( () => {
                    return this._load_model_register( oscene );
            } )
            .then( () => {
                    return this._postload_object( oscene );
            })
        );
    }


    /**
     * 残りのオブジェクトを読み込む
     * @private
     */
    _postload_object( oscene )
    {
        if ( this.status !== Loader.Status.LOADING ) return;
        this._load_entity_list( oscene );
    }


    /**
     * @private
     */
    _load_model_register( oscene )
    {
        var model_register = oscene["model_register"];
        if ( !model_register ) return;

        var keys = Object.keys( model_register );
        var asyncTasks = [];
        for ( var i = 0; i < keys.length; ++i ) {
            var    id = keys[i];
            var model = model_register[id];
            asyncTasks.push( this._load_model_container( oscene, id, model ) );
        }
        return Promise.all( asyncTasks );
    }


    /**
     * @private
     */
    _load_model_container( oscene, id, model )
    {
        var url = model.link;
        if ( !this._resource.resolveResourceSupported() ) return Promise.reject(new Error("Sub Resource is not supported"));
        const gltf_resource = this._resource.resolveResource( url );
        return (
            gltf_resource.load( { type: ResourceType.JSON } )
            .then( json => {
                    // モデルデータの取得に成功
                    this._check_cancel();
                    // データを解析して gltf.Content を構築
                    return GltfTool.load( json, {
                            base_resource: gltf_resource,
                              binary_type: ResourceType.BINARY,
                               image_type: ResourceType.IMAGE,
                     supported_extensions: ModelContainer.getSupportedExtensions_glTF()
                    } );
            } )
            .then( content => {
                    // モデルデータの構築に成功
                    var container = new ModelContainer( this._scene, content );
                    if ( model.offset_transform ) {
                        var matrix = SceneLoader.parseOffsetTransform( model.offset_transform );
                        container.setOffsetTransform( matrix );
                    }
                    this._setReference( id, container );
            } )
        );
    }


    /**
     * @private
     */
    _load_entity_list( oscene )
    {
        var entity_list = oscene["entity_list"];
        if ( !entity_list ) return;

        var scene = this._scene;

        for ( var i = 0; i < entity_list.length; ++i ) {
            var   item = entity_list[i];
            var   type = item.type;
            var entity = null;

            switch ( type ) {
            case "markerline":
                entity = new MarkerLineEntity( scene, { json: item, refs: this._references } );
                break;
            case "path":
                entity = new PathEntity( scene, { json: item, refs: this._references } );
                break;
            case "text":
                entity = new TextEntity( scene, { json: item, refs: this._references } );
                break;
            case "model":
                entity = new ModelEntity( scene, { json: item, refs: this._references } );
                break;
            case "polygon":
                entity = new PolygonEntity( scene, { json: item, refs: this._references } );
                break;
            default:
                console.error( "mapray: unknown entity type: " + type );
                break;
            }

            if ( entity ) {
                this._onEntity( this, entity, item );
                var id = item.id;
                if ( id ) {
                    this._setReference( id, entity );
                }
            }
        }
    }



    /**
     * スキーマ <OFFSET-TRANSFORM> のオブジェクトを解析
     *
     * @param  {object} offset_transform  <OFFSET-TRANSFORM> オブジェクト
     * @return {mapray.Matrix}            オフセット変換行列
     * @package
     */
    static
    parseOffsetTransform( offset_transform )
    {
        var ot = offset_transform;

        // <OFFSET-TRANSFORM-PARAMS>
        var   translate = ot.translate || [0, 0, 0];
        var orientation = new Orientation( ot.heading, ot.tilt, ot.roll );
        var       scale = (ot.scale !== undefined) ? ot.scale : [1, 1, 1];  // <PARAM-SCALE3>
        if ( typeof scale == 'number' ) {
            // スケールをベクトルに正規化
            scale = [scale, scale, scale];
        }

        // scale -> orientation -> translate 順の変換
        var matrix = GeoMath.createMatrix();

        orientation.getTransformMatrix( scale, matrix );
        matrix[12] = translate[0];
        matrix[13] = translate[1];
        matrix[14] = translate[2];

        return matrix;
    }

}


/**
 * @summary 終了コールバック
 * @callback FinishCallback
 * @desc
 * <p>シーンの読み込みが終了したときに呼び出される関数の型である。</p>
 * @param {mapray.SceneLoader} loader     読み込みを実行したローダー
 * @param {boolean}            isSuccess  成功したとき true, 失敗したとき false
 * @memberof mapray.SceneLoader
 */


/**
 * @summary リソース要求変換関数
 * @callback TransformCallback
 * @desc
 * <p>リソースのリクエスト時に URL などを変換する関数の型である。</p>
 *
 * @param  {string}                          url   変換前のリソース URL
 * @param  {ResourceType} type  リソースの種類
 * @return {mapray.SceneLoader.TransformResult}    変換結果を表すオブジェクト
 *
 * @example
 * function( url, type ) {
 *     return {
 *         url:         url,
 *         credentials: mapray.CredentialMode.SAME_ORIGIN,
 *         headers: {
 *             'Header-Name': 'Header-Value'
 *         }
 *     };
 * }
 *
 * @memberof mapray.SceneLoader
 */


/**
 * @summary リソース要求変換関数の変換結果
 * @typedef {object} TransformResult
 * @desc
 * <p>関数型 {@link mapray.SceneLoader.TransformCallback} の戻り値のオブジェクト構造である。</p>
 * <p>注意: 現在のところ、リソースの種類が {@link mapray.SceneLoader.ResourceType|ResourceType}.IMAGE のとき、headers プロパティの値は無視される。</p>
 * @property {string}                url                 変換後のリソース URL
 * @property {mapray.CredentialMode} [credentials=OMIT]  クレデンシャルモード
 * @property {object}                [headers={}]        リクエストに追加するヘッダーの辞書 (キーがヘッダー名、値がヘッダー値)
 * @memberof mapray.SceneLoader
 */



SceneLoader._defaultHeaders = {};



export default SceneLoader;
