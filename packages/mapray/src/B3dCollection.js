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

        this._wa_module = this._loadWasmModule();

        // シェーダをキャッシュするための特殊なプロパティ
        this.shader_cache = {};
    }


    /**
     * @summary b3dtile wasm モジュールの生成
     *
     * b3dtile wasm モジュールの生成を開始して null を返す。
     *
     * モジュールの生成が完了したとき、各 B3dTree インスタンスの
     * load_wasm_instance() よ呼び出す。そして this._wa_module に設定する。
     *
     * @return null
     *
     * @private
     */
    _loadWasmModule()
    {
        WasmTool.createModuleByBese64( b3dtile_base64 )
            .then( wa_module => {
                // コンパイル中に追加されたツリーを処理
                for ( let tree of this._tree_map.values() ) {
                    tree.__requestNativeInstance( wa_module );
                }

                // this に本来のオブジェクトを設定
                this._wa_module = wa_module;
            } )
            .catch( e => {
                // エラーは想定していない
            } );

        return null;
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
