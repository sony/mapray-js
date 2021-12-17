/**
 * デバッグ統計
 *
 * エンジン開発用の統計オブジェクトである。
 *
 * NOTE: オブジェクトの振舞いはエンジンの実装に依存するため、一般アプリの開発では使用できない。
 */
class DebugStats {

    /**
     *  リクエスト待ちの DEM 数
     */
    num_wait_reqs_dem: number;

    /**
     *  リクエスト待ちの画像数
     */
    num_wait_reqs_img: number;

    /**
     *  描画地表断片数
     */
    num_drawing_flakes: number;

    /**
     *  描画地表断頂点数
     */
    num_drawing_flake_vertices: number;

    /**
     *  地表断片処理 A の数
     */
    num_procA_flakes: number;

    /**
     *  地表断片処理 B の数
     */
    num_procB_flakes: number;


    /**
     * 
     */
    constructor()
    {
        this.num_wait_reqs_dem          = 0;
        this.num_wait_reqs_img          = 0;
        this.num_drawing_flakes         = 0;
        this.num_drawing_flake_vertices = 0;
        this.num_procA_flakes           = 0;
        this.num_procB_flakes           = 0;
    }


    /**
     * 統計値をクリア
     * @package
     */
    clearStats(): void
    {
        this.num_wait_reqs_dem          = 0;
        this.num_wait_reqs_img          = 0;
        this.num_drawing_flakes         = 0;
        this.num_drawing_flake_vertices = 0;
        this.num_procA_flakes           = 0;
        this.num_procB_flakes           = 0;
    }


    /**
     * 更新が完了したときに呼び出される
     */
    onUpdate(): void
    {
    }

}


export default DebugStats;
