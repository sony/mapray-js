import Content from "./Content";
import Scene from "./Scene";
import BufferEntry from "./BufferEntry";
import ImageEntry from "./ImageEntry";
import Buffer from "./Buffer";
import Image from "./Image";



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

        this._gjson    = body;
        this._base_resource = opts.base_resource;
        this._binary_type = opts.binary_type;
        this._image_type = opts.image_type;
        this._supported_extensions = opts.supported_extensions || [];

        this._resolve  = null;  // Promise の resolve() 関数
        this._reject   = null;  // Promise の reject() 関数

        this._used_extensions     = new Set();  // コンテンツが使用する拡張機能名の集合
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
                reject( new Error( "glTF version error" ) );
                return;
            }

            // コンテンツに必須の拡張機能をサポートしているかを確認
            const supported_ext = this._getSupportedExtensionNames();
            for ( const required_ext of this._enumRequiredExtensionNames() ) {
                if ( !supported_ext.has( required_ext ) ) {
                    reject( new Error( "glTF extension error: " + required_ext ) );
                    return;
                }
            }

            this._loadExtensionsUsed();
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
     * @summary 必須の拡張機能の名前を列挙
     *
     * @desc
     * <p>glTF アセットから必須の拡張機能を解析して、
     *    その拡張機能の名前を列挙する。</p>
     *
     * @return {iterable.<string>}  拡張機能名の列挙
     *
     * @private
     */
    _enumRequiredExtensionNames()
    {
        return this._gjson.extensionsRequired || [];
    }


    /**
     * @summary 対応可能な拡張機能の名前の集合を取得
     *
     * @desc
     * <p>glTF のローダーとクライアントが対応できる拡張機能の
     *    名前の集合を取得する。</p>
     *
     * @return {Set.<string>}  拡張機能名の集合
     *
     * @private
     */
    _getSupportedExtensionNames()
    {
        // ローダー自身が対応できる拡張機能
        // ※ 今のところサポートできる拡張機能はない
        const supported_extensions_by_loader = [];

        // ローダーを呼び出す側が対応できる拡張機能
        const supported_extensions_by_client = this._supported_extensions;

        return new Set( supported_extensions_by_loader.concat( supported_extensions_by_client ) );
    }


    /**
     * @summary コンテンツが使用する拡張機能を読み込む
     *
     * @desc
     * <p>extensionsUsed プロパティを読み込み this._used_extensions を設定する。</p>
     *
     * @private
     */
    _loadExtensionsUsed()
    {
        this._used_extensions = new Set( this._gjson.extensionsUsed || [] );
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
     * @summary 拡張機能の抽出
     *
     * @desc
     * <p>拡張機能固有オブジェクト extensions から extensionsUsed
     *    に存在するものだけを抽出する。</p>
     *
     * @param {object} extensions
     *
     * @return {object}
     */
    extractUsedExtensions( extensions )
    {
        let dict = {};

        for ( let key in extensions ) {
            if ( this._used_extensions.has( key ) ) {
                dict[key] = extensions[key];
            }
        }

        return dict;
    }


    /**
     * バッファデータの読み込みを開始
     * @param {mapray.gltf.Context} ctx  読み込みコンテキスト
     * @param {string}              url  バッファデータの URL
     * @private
     */
    loadBinary( path )
    {
        return this._base_resource.loadSubResource( path, this._binary_type );
    }


    loadImage( path )
    {
        return this._base_resource.loadSubResource( path, this._image_type );
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
            this._resolve( new Content( this, this._scenes, this._default_scene_index ) );
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



export default Context;
