/**
 * @summary 描画地表断片
 * @memberof mapray
 * @private
 */
class RenderFlake {

    /**
     * @param {mapray.Globe.Flake} flake  地表断片
     */
    constructor( flake )
    {
        /**
         *  @summary 地表断片
         *  @member mapray.RenderFlake#flake
         *  @type {mapray.Globe.Flake}
         */
        this.flake = flake;

        /**
         *  @summary 地表詳細レベル (LOD)
         *  @member mapray.RenderFlake#lod
         *  @type {number}
         */

        /**
         *  @summary LOD (左下)
         *  @member mapray.RenderFlake#lod_00
         *  @type {number}
         */

        /**
         *  @summary LOD (右下)
         *  @member mapray.RenderFlake#lod_10
         *  @type {number}
         */

        /**
         *  @summary LOD (左上)
         *  @member mapray.RenderFlake#lod_01
         *  @type {number}
         */

        /**
         *  @summary LOD (右上)
         *  @member mapray.RenderFlake#lod_11
         *  @type {number}
         */
    }

    /**
     * @summary 地表断片メッシュを検索
     * @return {mapray.FlakeMesh}  地表断片メッシュ
     */
    findMesh()
    {
        return this.flake.findMesh( this.lod );
    }

}


export default RenderFlake;
