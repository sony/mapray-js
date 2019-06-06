import GeoMath from "./GeoMath";
import Orientation from "./Orientation";
import CredentialMode from "./CredentialMode";
import ModelContainer from "./ModelContainer";
import MarkerLineEntity from "./MarkerLineEntity";
import TextEntity from "./TextEntity";
import ModelEntity from "./ModelEntity";
import GltfTool from "./gltf/Tool";


/**
 * @summary シーンの読み込み
 * @memberof mapray
 */
class SceneLoader {

    /**
     * @desc
     * <p>url で指定したシーンデータの読み込みを開始し、scene にエンティティを構築する。</p>
     * <p>読み込みが終了したとき options.callback を呼び出す。</p>
     * @param {mapray.Scene} scene      読み込み先のシーン
     * @param {string}       url        シーンファイルの URL
     * @param {object}       [options]  オプション集合
     * @param {mapray.SceneLoader.TransformCallback} [options.transform]  リソース要求変換関数
     * @param {mapray.SceneLoader.FinishCallback}    [options.callback]   終了コールバック関数
     */
    constructor( scene, url, options )
    {
        var opts = options || {};

        this._scene      = scene;
        this._url        = url;
        this._callback   = opts.callback  || defaultFinishCallback;
        this._transform  = opts.transform || defaultTransformCallback;
        this._glenv      = scene.glenv;
        this._references = {};
        this._cancelled  = false;
        this._finished   = false;
        this._abort_ctrl = new AbortController();
        this._loadFile();

        scene.addLoader( this );
    }


    /**
     * @summary 読み込み先のシーン
     * @type {mapray.Scene}
     * @readonly
     */
    get scene() { return this._scene; }


    /**
     * @summary シーンファイルの URL
     * @type {string}
     * @readonly
     */
    get url() { return this._url; }


    /**
     * @summary 読み込みの取り消し
     * @desc
     * <p>終了コールバック関数は isSuccess == false で呼び出される。</p>
     */
    cancel()
    {
        if ( this._cancelled ) return;

        this._abort_ctrl.abort();  // 取り消したので、すべての要求を中止
        this._cancelled = true;    // 取り消し中、または取り消しされた
        this._scene.removeLoader( this );
        Promise.resolve().then( () => { this._cancel_callback(); } );
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
     * @private
     */
    _loadFile()
    {
        var tr = this._transform( this._url, ResourceType.SCENE );

        fetch( tr.url, this._make_fetch_params( tr ) )
            .then( response => {
                this._check_cancel();
                return response.ok ?
                    response.json() : Promise.reject( Error( response.statusText ) );
            } )
            .then( oscene => {
                // JSON データの取得に成功
                this._check_cancel();
                this._load_object( oscene );
            } )
            .catch( ( e ) => {
                // JSON データの取得に失敗
                this._fail_callback( "mapray: failed to retrieve: " + tr.url );
            } );
    }


    /**
     * JSON シーンオブジェクトを解析
     * @private
     */
    _load_object( oscene )
    {
        oscene.req_count = 0;
        oscene.req_ended = false;

        this._load_model_register( oscene );

        if ( oscene.req_count == 0 ) {
            this._postload_object( oscene );
        }
        oscene.req_ended = true;
    }


    /**
     * 残りのオブジェクトを読み込む
     * @private
     */
    _postload_object( oscene )
    {
        if ( this._cancelled ) return;

        this._load_entity_list( oscene );
        this._success_callback();
    }


    /**
     * もうリクエストがないとき、残りのオブジェクトを読み込む
     * @private
     */
    _postload_object_ifNoReq( oscene )
    {
        --oscene.req_count;
        if ( (oscene.req_count == 0) && oscene.req_ended ) {
            this._postload_object( oscene );
        }
    }


    /**
     * @private
     */
    _load_model_register( oscene )
    {
        var model_register = oscene["model_register"];
        if ( !model_register ) return;

        var keys = Object.keys( model_register );
        for ( var i = 0; i < keys.length; ++i ) {
            var    id = keys[i];
            var model = model_register[id];
            this._load_model_container( oscene, id, model );
        }
    }


    /**
     * @private
     */
    _load_model_container( oscene, id, model )
    {
        var url = model.link;
        var  tr = this._transform( url, ResourceType.MODEL );

        fetch( tr.url, this._make_fetch_params( tr ) )
            .then( response => {
                this._check_cancel();
                return response.ok ?
                    response.json() : Promise.reject( Error( response.statusText ) );
            } )
            .then( json => {
                // モデルデータの取得に成功
                this._check_cancel();
                // データを解析して gltf.Content を構築
                return GltfTool.load( json, {
                    base_uri:         url,
                    transform_binary: uri => this._transform( uri, ResourceType.BINARY ),
                    transform_image:  uri => this._transform( uri, ResourceType.IMAGE )
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
            .catch( () => {
                // モデルデータの取得に失敗
                console.error( "mapray: failed to retrieve: " + tr.url );
            } )
            .then( () => {
                this._postload_object_ifNoReq( oscene );
            } );

        ++oscene.req_count;
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
            case "text":
                entity = new TextEntity( scene, { json: item, refs: this._references } );
                break;
            case "model":
                entity = new ModelEntity( scene, { json: item, refs: this._references } );
                break;
            default:
                console.error( "mapray: unknown entity type: " + type );
                break;
            }

            if ( entity ) {
                scene.addEntity( entity );
                var id = item.id;
                if ( id ) {
                    this._setReference( id, entity );
                }
            }
        }
    }

    /**
     * fetch() の init 引数に与えるオブジェクトを生成
     * @private
     */
    _make_fetch_params( tr )
    {
        var init = {
            signal:      this._abort_ctrl.signal,
            credentials: (tr.credentials || CredentialMode.OMIT).credentials
        };

        if ( tr.headers ) {
            init.headers = (tr.headers || SceneLoader._defaultHeaders);
        }

        return init;
    }


    /**
     * 取り消し状態のとき例外を投げる
     * @private
     */
    _check_cancel()
    {
        if ( this._cancelled ) {
            throw new Error( "canceled" );
        }
    }


    /**
     * @private
     */
    _cancel_callback()
    {
        if ( this._finished ) return;

        this._callback( this, false );
    }


    /**
     * @private
     */
    _success_callback()
    {
        if ( this._cancelled ) return;

        this._finished = true;
        this._scene.removeLoader( this );
        this._callback( this, true );
    }


    /**
     * @private
     */
    _fail_callback( msg )
    {
        if ( this._cancelled ) return;

        console.error( msg );
        this._finished = true;
        this._scene.removeLoader( this );
        this._callback( this, false );
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
 * @param  {mapray.SceneLoader.ResourceType} type  リソースの種類
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


/**
 * @summary リソースの種類
 * @enum {object}
 * @memberof mapray.SceneLoader
 * @constant
 * @see mapray.SceneLoader.TransformCallback
 */
var ResourceType = {

    /**
     * シーン JSON ファイル
     */
    SCENE: { id: "SCENE" },

    /**
     * モデルファイル
     */
    MODEL: { id: "MODEL" },

    /**
     * バイナリファイル
     */
    BINARY: { id: "BINARY" },

    /**
     * テクスチャ画像ファイル
     */
    IMAGE: { id: "IMAGE" }

};


SceneLoader.ResourceType = ResourceType;


SceneLoader._defaultHeaders = {};


function defaultFinishCallback( loader, isSuccess )
{
}


function defaultTransformCallback( url, type )
{
    return { url: url };
}


export default SceneLoader;
