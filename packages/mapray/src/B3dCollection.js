import B3dTree from "./B3dTree";
import WasmTool from "./WasmTool";
import b3dtile_base64 from "./wasm/b3dtile.wasm";


/**
 * @summary B3dTree を管理
 *
 * @memberof mapray
 * @private
 */
class B3dCollection {

    constructor()
    {
        this._tree_map = new Map();  // 辞書: B3dProvider -> B3dTree

        this._wa_module = null;

        this._shader_cache = {};

        this._loadWasmModule();
    }


    /**
     * シェーダをキャッシュするための特殊なプロパティ
     *
     * @type {object}
     * @readonly
     *
     * @package
     */
    get shader_cache() { return this._shader_cache; }


    /**
     * @summary wasm モジュールを取得
     *
     * B3dTree が必要とする wasm モジュールを返す。まだモジュールがロードされていない
     * ときは null を返す。
     *
     * @return {?WebAssembly.Module}
     *
     * @package
     */
    getWasmModule() { return this._wa_module; }


    /**
     * @summary b3dtile wasm モジュールの生成
     *
     * b3dtile wasm モジュールの生成を開始する。
     *
     * モジュールの生成が完了したとき this._wa_module を設定する。
     *
     * その後、各 B3dTree インスタンスに通知する。
     *
     * @private
     */
    _loadWasmModule()
    {
        WasmTool.createModuleByBese64( b3dtile_base64 )
            .then( wa_module => {
                // this に本来のオブジェクトを設定
                this._wa_module = wa_module;

                // wasm ロード中に追加された B3dTree インスタンスに wasm が
                // ロードされたことを通知
                for ( let tree of this._tree_map.values() ) {
                    tree.onLoadWasmModule();
                }
            } )
            .catch( e => {
                // エラーは想定していない
            } );
    }


    /**
     * @summary すべての B3dTree インスタンスを削除
     */
    clear()
    {
        for ( let provider of Array.from( this._tree_map.keys() ) ) {
            this.remove( provider );
        }
    }


    /**
     * @summary B3dTree インスタンスを追加
     *
     * @param {mapray.B3dProvider} provider  B3dTree に対応するプロバイダ
     */
    add( provider )
    {
        if ( this._tree_map.has( provider ) ) {
            // すでに存在する場合は何もしない
            return;
        }

        this._tree_map.set( provider, new B3dTree( this, provider ) );
    }


    /**
     * @summary B3dTree インスタンスを削除
     *
     * provider に対応する B3dTree インスタンスを this からから削除する。
     * そのとき B3dTree インスタンスに対して cancel() を呼び出す。
     *
     * @param {mapray.B3dProvider} provider  B3dTree に対応するプロバイダ
     */
    remove( provider )
    {
        let tree = this._tree_map.get( provider );
        if ( tree === undefined ) {
            // 存在しない場合は何もしない
            return;
        }

        tree.cancel();

        this._tree_map.delete( provider );
    }


    /**
     * @summary すべての B3D タイルの描画
     *
     * @param {mapray.RenderStage} stage
     */
    draw( stage )
    {
        for ( let tree of this._tree_map.values() ) {
            tree.draw( stage );
        }
    }


    /**
     * @summary フレーム終了処理
     */
    endFrame()
    {
        for ( let tree of this._tree_map.values() ) {
            tree.endFrame();
        }
    }

}


export default B3dCollection;
