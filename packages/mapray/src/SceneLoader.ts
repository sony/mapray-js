import Loader from "./Loader"
import GeoMath, { Matrix, Vector3 } from "./GeoMath";
import Scene from "./Scene";
import Orientation from "./Orientation";
import CredentialMode from "./CredentialMode";
import ModelContainer from "./ModelContainer";
import Entity from "./Entity";
import AltitudeMode from "./AltitudeMode";
import MarkerLineEntity from "./MarkerLineEntity";
import PathEntity from "./PathEntity";
import TextEntity from "./TextEntity";
import ModelEntity from "./ModelEntity";
import PolygonEntity from "./PolygonEntity";
import GLEnv from "./GLEnv";
import GltfTool from "./gltf/Tool";
import Resource, { URLResource } from "./Resource";

/**
 * シーンの読み込み
 */
class SceneLoader extends Loader {

    private _glenv: GLEnv;

    private _finished: boolean;

    private _references: Entity.ReferenceMap;

    /**
     * url で指定したシーンデータの読み込みを開始し、scene にエンティティを構築する。
     * 読み込みが終了したとき options.callback を呼び出す。
     * @param scene      読み込み先のシーン
     * @param resource   シーンリソース
     * @param options    オプション集合
     */
    constructor( scene: Scene, resource: string | Resource, options: SceneLoader.Option = {} )
    {
        let actualResource: Resource;
        if ( resource instanceof Resource ) {
            actualResource = resource;
        }
        else if ( typeof resource === "string" ) {
            // @ts-ignore
            actualResource = new URLResource(resource, {
                    type: Resource.Type.JSON,
                    transform: options.transform
            });
        }
        else {
            throw new Error( "Unsupported Resource: " + resource );
        }

        super( scene, actualResource, {
                onEntity: options.onEntity,
                onLoad: options.callback
        } );

        this._glenv      = scene.glenv;
        this._references = {};
        this._finished = false;
    }



    /**
     * オブジェクト参照を取得
     *
     * 注意: シーンの読み込みが終了したことを確認してからこのメソッドを呼び出すこと。
     * @param  id  識別子
     * @return オブジェクト
     */
    getReference( id: string ): ModelContainer | Entity | null
    {
        var ref = this._references[id];
        return (ref !== undefined) ? ref : null;
    }


    /**
     * オブジェクト参照を設定
     *
     * オブジェクト item を識別子 id で参照できるように this に設定する。
     * @param id    識別子
     * @param item  オブジェクト
     */
    private _setReference( id: string, item: ModelContainer | Entity )
    {
        // 参照を設定
        this._references[id] = item;
    }


    /**
     * 読み込み処理の実態。継承クラスによって実装される。
     */
    protected _load(): Promise<void>
    {
        return (
            this._resource.load( { type: Resource.Type.JSON } )
            .then( ( oscene: any ) => {
                    // JSON データの取得に成功
                    this._check_cancel();
                    // @ts-ignore
                    return this._load_object( oscene );
            } )
        );
    }


    /**
     * JSON シーンオブジェクトを解析
     */
    private _load_object( oscene: SceneLoader.SceneJson ): Promise<void>
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
     */
    private _postload_object( oscene: SceneLoader.SceneJson )
    {
        if ( this.status !== Loader.Status.LOADING ) return;
        this._load_entity_list( oscene );
    }


    /**
     *
     */
    private _load_model_register( oscene: SceneLoader.SceneJson )
    {
        var model_register = oscene.model_register;
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
     *
     */
    private _load_model_container( oscene: SceneLoader.SceneJson, id: string, model: ModelContainer )
    {
        // @ts-ignore
        var url = model.link;
        if ( !this._resource.resolveResourceSupported() ) return Promise.reject(new Error("Sub Resource is not supported"));
        const gltf_resource = this._resource.resolveResource( url );
        return (// @ts-ignore
            gltf_resource.load( { type: Resource.Type.JSON } )
            .then( ( json: any ) => {
                    // モデルデータの取得に成功
                    this._check_cancel();
                    // データを解析して gltf.Content を構築
                    // @ts-ignore
                    return GltfTool.load( json, {
                            base_resource: gltf_resource,
                              binary_type: Resource.Type.BINARY,
                               image_type: Resource.Type.IMAGE,
                     // @ts-ignore
                     supported_extensions: ModelContainer.getSupportedExtensions_glTF()
                    } );
            } )
            .then( ( content: any ) => {
                    // モデルデータの構築に成功
                    var container = new ModelContainer( this._scene, content );
                    // @ts-ignore
                    if ( model.offset_transform ) {
                        // @ts-ignore
                        var matrix = SceneLoader.parseOffsetTransform( model.offset_transform );
                        container.setOffsetTransform( matrix );
                    }
                    this._setReference( id, container );
            } )
        );
    }


    /**
     *
     */
    private _load_entity_list( oscene: SceneLoader.SceneJson )
    {
        var entity_list = oscene.entity_list;
        if ( !entity_list ) return;

        var scene = this._scene;

        for ( var i = 0; i < entity_list.length; ++i ) {
            var   item = entity_list[i];
            var   type = item.type;
            var entity = null;

            if ( TextEntity.isTextEntityJson( item ) ) {
                entity = new TextEntity( scene, { json: item, refs: this._references } );
            }
            else {
                switch ( type ) {
                case "markerline":
                    entity = new MarkerLineEntity( scene, { json: item, refs: this._references } as MarkerLineEntity.Option );
                    break;
                case "path":
                    entity = new PathEntity( scene, { json: item, refs: this._references } as PathEntity.Option );
                    break;
                /*
                case "text":
                    entity = new TextEntity( scene, { json: item, refs: this._references } );
                    break;
                */
                case "model":
                    // @ts-ignore
                    entity = new ModelEntity( scene, { json: item, refs: this._references } as ModelEntity.Option );
                    break;
                case "polygon":
                    entity = new PolygonEntity( scene, { json: item, refs: this._references } as PolygonEntity.Option);
                    break;
                default:
                    console.error( "mapray: unknown entity type: " + type );
                    break;
                }
            }

            if ( entity ) {
                // @ts-ignore
                this._onEntity( this, entity, item );
                var id = item.id;
                if ( id ) {
                    // @ts-ignore
                    this._setReference( id, entity );
                }
            }
        }
    }



    /**
     * スキーマ <OFFSET-TRANSFORM> のオブジェクトを解析
     *
     * @param   offset_transform  <OFFSET-TRANSFORM> オブジェクト
     * @return  オフセット変換行列
     * @internal
     */
    static parseOffsetTransform( offset_transform: SceneLoader.OffsetTransformJson ): Matrix
    {
        var ot = offset_transform;

        // <OFFSET-TRANSFORM-PARAMS>
        var   translate = ot.translate || [0, 0, 0];
        var orientation = new Orientation( ot.heading, ot.tilt, ot.roll );
        var           s = ot.scale; // <PARAM-SCALE3>
        const scale = (
            s === undefined ? [1, 1, 1]:
            typeof s == 'number' ? [s, s, s]: // スケールをベクトルに正規化
            s
        ) as Vector3;

        // scale -> orientation -> translate 順の変換
        var matrix = GeoMath.createMatrix();

        orientation.getTransformMatrix( scale, matrix );
        matrix[12] = translate[0];
        matrix[13] = translate[1];
        matrix[14] = translate[2];

        return matrix;
    }

}



namespace SceneLoader {



export interface Option {
    /** リソース要求変換関数 */
    transform?: Resource.TransformCallback;

    /** エンティティコールバック */
    onEntity?: Loader.EntityCallback;

    /** 終了コールバック関数 */
    callback?: Loader.FinishCallback;
}



export interface SceneJson {
    model_register: ModelRegisterJson;
    entity_list: Entity.Json[];
}



export interface ModelRegisterJson {
    [ id: string ]: ModelContainer;
}



export interface OffsetTransformJson {
    translate: [ x: number, y: number, z: number ];
    scale?: [ x: number, y: number, z: number ];
    heading: number;
    tilt: number;
    roll: number;
}




export const _defaultHeaders = {};



} // namespace SceneLoader



export default SceneLoader;
