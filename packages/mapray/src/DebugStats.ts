/**
 * @summary デバッグ統計
 * @classdesc
 * <p>エンジン開発用の統計オブジェクトである。<p>
 * <p>NOTE: オブジェクトの振舞いはエンジンの実装に依存するため、一般アプリの開発では使用できない。<p>
 * @memberof mapray
 */
class DebugStats {

    /**
     */
    constructor()
    {
        /**
         *  @summary リクエスト待ちの DEM 数
         *  @member mapray.DebugStats#num_wait_reqs_dem
         *  @type {number}
         */

        /**
         *  @summary リクエスト待ちの画像数
         *  @member mapray.DebugStats#num_wait_reqs_img
         *  @type {number}
         */

        /**
         *  @summary 描画地表断片数
         *  @member mapray.DebugStats#num_drawing_flakes
         *  @type {number}
         */

        /**
         *  @summary 描画地表断頂点数
         *  @member mapray.DebugStats#num_drawing_flake_vertices
         *  @type {number}
         */

        /**
         *  @summary 地表断片処理 A の数
         *  @member mapray.DebugStats#num_procA_flakes
         *  @type {number}
         */

        /**
         *  @summary 地表断片処理 B の数
         *  @member mapray.DebugStats#num_procB_flakes
         *  @type {number}
         */

        this.clearStats();
    }


    /**
     * 統計値をクリア
     * @package
     */
    clearStats()
    {
        this.num_wait_reqs_dem          = 0;
        this.num_wait_reqs_img          = 0;
        this.num_drawing_flakes         = 0;
        this.num_drawing_flake_vertices = 0;
        this.num_procA_flakes           = 0;
        this.num_procB_flakes           = 0;
    }


    /**
     * @summary 更新が完了したときに呼び出される
     * @abstract
     */
    onUpdate()
    {
    }

}


export default DebugStats;
