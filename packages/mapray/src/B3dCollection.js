import B3dScene from "./B3dScene";
import WasmTool from "./WasmTool";
import b3dtile_base64 from "./wasm/b3dtile.wasm";


/**
 * @summary B3dScene インスタンスを管理
 *
 * @classdesc
 *
 * <p>{@link mapray.Viewer Viewer} で表示する複数の {@link mapray.B3dScene B3dScene}
 *    インスタンスを管理する。</p>
 *
 * @see {@link mapray.Viewer#b3d_collection}
 * @see {@link mapray.B3dScene}
 * @see {@link mapray.B3dProvider}
 *
 * @memberof mapray
 * @hideconstructor
 * @public
 */
class B3dCollection {

    /**
     * @param {mapray.Viewer} viewer  this を所有する Viewer インスタンス
     */
    constructor( viewer )
    {
        this._viewer = viewer;  // 未完成インスタンスなので構築子から出てから使用

        this._b3d_scenes = new Set();  // Set<B3dScene>

        this.$debug = {  // B3D デバッグ用の非公開プロパティ
            render_mode:   0,     // 0: 通常, 1: 立方体空間も表示
            clip_coloring: false  // クリップされたタイルを着色 (途中変更不可)
        };

        this._wa_module = null;

        this._shader_cache = {};

        this._loadWasmModule();
    }


    /**
     * @summary this を所有するオブジェクト
     *
     * @type {mapray.Viewer}
     * @readonly
     */
    get viewer() { return this._viewer; }


    /**
     * @summary B3dScene インスタンスの数
     *
     * @type {number}
     * @readonly
     */
    get num_scenes() { return this._b3d_scenes.size; }


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
     * B3dScene が必要とする wasm モジュールを返す。まだモジュールがロードされていない
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
     * その後、各 B3dScene インスタンスに通知する。
     *
     * @private
     */
    _loadWasmModule()
    {
        WasmTool.createModuleByBese64( b3dtile_base64 )
            .then( wa_module => {
                // this に本来のオブジェクトを設定
                this._wa_module = wa_module;

                // wasm ロード中に追加された B3dScene インスタンスに wasm が
                // ロードされたことを通知
                for ( let scene of this._b3d_scenes ) {
                    scene.onLoadWasmModule();
                }
            } )
            .catch( e => {
                // エラーは想定していない
            } );
    }


    /**
     * @summary B3dScene インスタンスを作成して追加
     *
     * @desc
     * <p>provider に対応する B3dScene インスタンスを生成して this に追加する。</p>
     *
     * @param {mapray.B3dProvider} provider  B3dScene に対応する B3D プロバイダ
     *
     * @return {mapray.B3dScene}  this に追加された B3dScene インスタンス
     */
    createScene( provider )
    {
        const scene = new B3dScene( this, provider );

        this._b3d_scenes.add( scene );

        return scene;
    }


    /**
     * @summary B3dScene インスタンスを削除
     *
     * @desc
     * <p>this に含まれる scene を this から削除する。</p>
     *
     * <p>このメソッドを呼び出した後は scene にアクセスすることはできない。</p>
     *
     * @param {mapray.B3dScene} scene  削除する B3dScene インスタンス
     */
    removeScene( scene )
    {
        console.assert( this._b3d_scenes.has( scene ) );

        // 削除する前に後処理
        scene.cancel();

        // コンテナから削除
        this._b3d_scenes.delete( scene );
    }


    /**
     * @summary すべての B3dScene インスタンスを削除
     *
     * @desc
     * <p>this に含まれるすべての B3dScene インスタンスを削除する。</p>
     *
     * <p>このメソッドを呼び出した後は、以前に this から取得した B3dScene インスタンスに
     *    アクセスすることができない。</p>
     */
    clearScenes()
    {
        for ( let scene of Array.from( this._b3d_scenes ) ) {
            this.removeScene( scene );
        }
    }


    /**
     * @summary B3dScene インスタンスの反復子を取得
     *
     * @desc
     * <p>このメソッドが返したオブジェクトを it とするとき、example の (A)
     *    のコメント位置で、個々の B3dScene インスタンスを取得することができる。</p>
     *
     * <p>このとき B3dScene インスタンスの反復順序は決まっていない。<p>
     *
     * <p>また、反復中に B3dScene インスタンスを追加または削除したときの動作は未定義である。<p>
     *
     * @example
     * while ( it.value !== null ) {
     *     // (A): ここで it.value の値が B3dScene インスタンス
     *     it.next();
     * }
     *
     * @return {object}  反復子
     */
    getIterator()
    {
        const it_raw = this._b3d_scenes.values();  // ES6 のイテレータプロトコルに準拠

        const it_wrap = {
            next: function() {
                let ito = it_raw.next();
                this.value = ito.done ? null : ito.value;
            },

            value: null
        };

        // 先頭の値に設定
        it_wrap.next();

        return it_wrap;
    }


    /**
     * @summary すべての B3D タイルの描画
     *
     * @param {mapray.RenderStage} stage
     *
     * @package
     */
    draw( stage )
    {
        for ( let scene of this._b3d_scenes ) {
            scene.draw( stage );
        }
    }


    /**
     * @summary フレーム終了処理
     *
     * @package
     */
    endFrame()
    {
        for ( let scene of this._b3d_scenes ) {
            scene.endFrame();
        }
    }


    /**
     * @summary すべての B3D シーンとレイとの交点を探す
     *
     * @desc
     * <p>線分 (ray.position を始点とし、そこから ray.direction 方向に limit 距離
     * 未満にある点) と this 全体の三角形との交点の中で、始点から最も近い交点の情
     * 報を返す。ただし線分と交差する三角形が見つからないときは null を返す。</p>
     *
     * <p>戻り値のオブジェクト形式は次のようになる。ここで uint32 は 0 から
     *    2^32 - 1 の整数値である。</p>
     *
     * <pre>
     * {
     *     b3d_scene:  B3dScene,
     *     distance:   number,
     *     feature_id: [uint32, uint32]
     * }
     * </pre>
     *
     * <p>戻り値のオブジェクトと、そこから参照できるオブジェクトは変更しても問
     *    題ない。</p>
     *
     * @param {mapray.Ray} ray  半直線を表すレイ (GOCS)
     * @param {number}   limit  制限距離 (ray.direction の長さを単位)
     *
     * @return {?object}  交点の情報
     *
     * @package
     */
    getRayIntersection( ray, limit )
    {
        let distance = limit;
        let   result = null;

        for ( let b3d_scene of this._b3d_scenes ) {

            const info = b3d_scene.getRayIntersection( ray, distance );
            if ( info === null ) continue;

            // scene が交差したので更新
            distance = info.distance;
            result   = {
                b3d_scene,
                distance,
                feature_id: info.feature_id  // 複製の必要はない
            };
        }

        return result;
    }

}


export default B3dCollection;
