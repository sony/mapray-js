import Content from "./Content";
import Scene from "./Scene";
import BufferEntry from "./BufferEntry";
import ImageEntry from "./ImageEntry";
import Buffer from "./Buffer";
import Image from "./Image";
import CredentialMode from "../CredentialMode";


/**
 * glTF 読込みコンテキスト
 *
 * @memberof mapray.gltf
 * @private
 */
class Context {

    /**
     * @param  {object} body       Tool.load() の同名パラメータを参照
     * @param  {object} [options]  Tool.load() の同名パラメータを参照
     */
    constructor( body, options )
    {
        var opts = options || {};

        this._transform_binary = opts.transform_binary || defaultTransformCallback;
        this._transform_image  = opts.transform_image  || defaultTransformCallback;

        this._gjson    = body;
        this._base_uri = (opts.base_uri !== undefined) ? opts.base_uri : "";

        this._resolve  = null;  // Promise の resolve() 関数
        this._reject   = null;  // Promise の reject() 関数

        this._scenes              = [];
        this._default_scene_index = -1;

        this._buffer_entries = [];  // 共有用バッファの管理 (疎配列)
        this._image_entries  = [];  // 共有用イメージの管理 (疎配列)

        this._body_finished = false;  // body の解析を終えたか？
        this._load_count    = 0;      // 現在リクエスト中のオブジェクト数
        this._load_error    = null;   // エラーが発生したときのエラーオブジェクト
        this._settled       = false;  // Promise の状態が Fulfilled または Rejected か？
    }


    /**
     * @summary glTF の読込みと解析
     *
     * @return {Promise}  読込み Promise (mapray.gltf.Content)
     */
    load()
    {
        return new Promise( (resolve, reject) => {
            this._resolve = resolve;
            this._reject  = reject;

            // glTF バージョンを確認
            var version = this._loadVersion();
            if ( version.major < 2 ) {
                this._reject( new Error( "glTF version error" ) );
            }

            this._loadScenes();
            this._loadDefaultSceneIndex();
            this._onFinishLoadBody();
        } );
    }


    /**
     * glTF バージョンを解析
     *
     * @return {object}  { major: major_version, minor: minor_version }
     * @private
     */
    _loadVersion()
    {
        // asset.schema

        var   asset = this._gjson.asset;  // 必須
        var version = asset.version;      // 必須

        var version_array = /^(\d+)\.(\d+)/.exec( version );
        var major_version = Number( version_array[1] );
        var minor_version = Number( version_array[2] );

        return { major: major_version,
                 minor: minor_version };
    }


    /**
     * @summary すべてのシーンを読み込む
     *
     * <p>シーンを読み込み、オブジェクトを this._scenes の配列に設定する。</p>
     *
     * @private
     */
    _loadScenes()
    {
        const num_scenes = (this._gjson.scenes || []).length;
        const     scenes = [];

        for ( let index = 0; index < num_scenes; ++index ) {
            scenes.push( new Scene( this, index ) );
        }

        this._scenes = scenes;
    }


    /**
     * @summary 既定シーンの索引を読み込む
     *
     * <p>既定のシーン索引を解析し、this._default_scene_index に設定する。</p>
     *
     * @private
     */
    _loadDefaultSceneIndex()
    {
        if ( typeof this._gjson.scene == 'number' ) {
            this._default_scene_index = this._gjson.scene;
        }
    }


    /**
     * glTF 最上位オブジェクト
     * @type {object}
     * @readonly
     */
    get gjson() { return this._gjson; }


    /**
     * glTF でのリソース URI からリクエストする URI を解決
     *
     * @param  {string} uri  glTF でのリソース URI
     * @return {string}      リクエストする URI
     * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#uris
     */
    solveResourceUri( uri )
    {
        var re_dat = /^data:/;
        var re_abs = /^[a-z][-+.0-9a-z]*:\/\//;

        if ( re_dat.test( uri ) || re_abs.test( uri ) ) {
            // uri がデータ URI または絶対 URI のときは
            // そのまま uri をリクエスト
            return uri;
        }
        else {
            // それ以外のときは uri を相対 URI と解釈し
            // 基底 URI と結合した URI をリクエスト
            var     last = this._base_uri.lastIndexOf( '/' );
            var base_uri = (last >= 0) ? this._base_uri.substr( 0 , last + 1 ) : "";
            return base_uri + uri;
        }
    }


    /**
     * バイナリを取得するときの fetch 関数のパラメータを取得
     *
     * @param  {string} url  バイナリの URL
     * @return {object}      { url: URL, init: fetch() に与える init オブジェクト }
     */
    makeBinaryFetchParams( url )
    {
        const tr = this._transform_binary( url );

        var init = {
            credentials: (tr.credentials || CredentialMode.OMIT).credentials
        };
        if ( tr.headers ) {
            init.headers = tr.headers;
        }

        return {
            url:  tr.url,
            init: init
        };
    }


    /**
     * イメージを取得するときの Image のプロパティを取得
     *
     * @param  {string} url  バイナリの URL
     * @return {object}      { url: URL, crossOrigin: Image#crossOrigin }
     */
    makeImageLoadParams( url )
    {
        const tr = this._transform_image( url );

        const params = {
            url: tr.url
        };

        // crossorigin 属性の値
        if ( tr.credentials === CredentialMode.SAME_ORIGIN ) {
            params.crossOrigin = "anonymous";
        }
        else if ( tr.credentials === CredentialMode.INCLUDE ) {
            params.crossOrigin = "use-credentials";
        }

        return params;
    }


    /**
     * バッファを検索
     * @param  {number} index        バッファ索引
     * @return {mapray.gltf.Buffer}  gltf.Buffer オブジェクト
     */
    findBuffer( index )
    {
        if ( this._buffer_entries[index] === undefined ) {
            this._buffer_entries[index] = new BufferEntry( new Buffer( this, index ) );
        }

        return this._buffer_entries[index].buffer;
    }


    /**
     * イメージを検索
     * @param  {number} index       イメージ索引
     * @return {mapray.gltf.Image}  gltf.Image オブジェクト
     */
    findImage( index )
    {
        if ( this._image_entries[index] === undefined ) {
            this._image_entries[index] = new ImageEntry( new Image( this, index ) );
        }

        return this._image_entries[index].image;
    }


    /**
     * gltf.Accessor を追加
     *
     * @param {mapray.gltf.Accessor} accessor  アクセサオブジェクト
     * @param {string}               usage     用途 ("ATTRIBUTE" | "INDEX")
     */
    addAccessor( accessor, usage )
    {
        var entry = this._buffer_entries[accessor.bufferView.buffer.index];

        switch ( usage ) {
        case "ATTRIBUTE":
            entry.addAttributeAccessor( accessor );
            break;
        case "INDEX":
            entry.addIndexAccessor( accessor );
            break;
        }
    }


    /**
     * gltf.TextureInfo を追加
     *
     * @param {mapray.gltf.TextureInfo} info  テクスチャ情報
     */
    addTextureInfo( info )
    {
        var image = info.texture.source;
        var entry = this._image_entries[image.index];
        entry.addTextureInfo( info );
    }


    /**
     * バイナリを読み込み始めたときの処理
     */
    onStartLoadBuffer()
    {
        this._load_count += 1;
    }


    /**
     * バイナリを読み込み終わったときの処理
     *
     * @param {Error} [error]  失敗したときのエラーオブジェクト
     */
    onFinishLoadBuffer( error )
    {
        if ( error ) {
            this._load_error = error;
        }
        this._load_count -= 1;
        this._onFinishLoadSomething();
    }


    /**
     * 画像を読み込み始めたときの処理
     */
    onStartLoadImage()
    {
        this._load_count += 1;
    }


    /**
     * 画像を読み込み終わったときの処理
     *
     * @param {Error} [error]  失敗したときのエラーオブジェクト
     */
    onFinishLoadImage( error )
    {
        if ( error ) {
            this._load_error = error;
        }
        this._load_count -= 1;
        this._onFinishLoadSomething();
    }


    /**
     * glTF 本体を読み込み終わったときの処理
     * @private
     */
    _onFinishLoadBody()
    {
        this._body_finished = true;
        this._onFinishLoadSomething();
    }


    /**
     * 何かを読み込み終わったときの処理
     * @private
     */
    _onFinishLoadSomething()
    {
        if ( this._settled ) {
            // すでに Promise に結果を設定しているので何もしない
        }
        else if ( this._load_error !== null ) {
            // どこかで失敗した
            this._reject(  this._load_error );
            this._settled = true;
        }
        else if ( this._body_finished && (this._load_count == 0) ) {
            // 外部ファイルも含めて、すべて読み込み終わった
            this._rewriteBuffersForByteOrder();
            this._splitBuffersAndRebuildAccessors();
            this._rebuildTextureInfo();
            this._resolve( new Content( this._scenes, this._default_scene_index ) );
            this._settled = true;
        }
    }


    /**
     * すべてのバッファのバイトオーダーを書き換える
     * @private
     */
    _rewriteBuffersForByteOrder()
    {
        for ( const entry of this._buffer_entries ) {
            if ( entry !== undefined ) {
                entry.rewriteByteOrder();
            }
        }
    }


    /**
     * バッファを分割し、Accessor を再構築
     * @private
     */
    _splitBuffersAndRebuildAccessors()
    {
        for ( const entry of this._buffer_entries ) {
            if ( entry !== undefined ) {
                entry.splitBufferAndRebuildAccessors();
            }
        }
    }


    /**
     * テクスチャ情報を再構築
     * @private
     */
    _rebuildTextureInfo()
    {
        for ( const entry of this._image_entries ) {
            if ( entry !== undefined ) {
                entry.rebuildTextureInfo();
            }
        }
    }

}


function defaultTransformCallback( url )
{
    return { url: url };
}


export default Context;
