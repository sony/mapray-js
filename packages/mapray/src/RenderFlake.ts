import Globe from "./Globe";
import FlakeRenderObject from "./FlakeRenderObject";


/**
 * 描画地表断片
 *
 * 地表断片とその LOD の情報を含み、LOD に適した `FlakeRenderObject`
 * インスタンスを得ることができる。
 *
 * `RenderFlake` インスタンスの生成と各 LOD プロパティの設定は
 * [[FlakeCollector]] クラスが行う。
 */
class RenderFlake {

    /**
     * 地表断片
     */
    readonly flake: Globe.Flake;


    /**
     * 地表詳細レベル (LOD)
     */
    lod!: number;


    /**
     * LOD (左下)
     */
    lod_00!: number;


    /**
     * LOD (右下)
     */
    lod_10!: number;


    /**
     * LOD (左上)
     */
    lod_01!: number;


    /**
     * LOD (右上)
     */
    lod_11!: number;


    /**
     * @param flake  地表断片
     */
    constructor( flake: Globe.Flake )
    {
        this.flake = flake;
    }


    /**
     * レンダリングオブジェクトを検索
     */
    getRenderObject(): FlakeRenderObject
    {
        return this.flake.getRenderObject( this.lod );
    }

}


export default RenderFlake;
