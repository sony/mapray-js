/**
 * @summary 3 次元の領域を表現
 *
 * @memberof mapray
 */
class Area3D
{

    constructor()
    {
        /**
         *  @summary 分割レベル (整数)
         *  @member mapray.Area3D#level
         *  @type {number}
         *  @default 0
         */
        this.level = 0;


        /**
         *  @summary 領域座標 (整数)
         *  @member mapray.Area3D#coords
         *  @type {number[]}
         *  @default [0, 0, 0]
         */
        this.coords = [0, 0, 0];
    }


    /**
     * @summary 複製を取得
     *
     * @return {mapray.Area3D}
     */
    clone()
    {
        let area = new Area3D();

        area.level = this.level;

        for ( let i = 0; i < 3; ++i ) {
            area.coords[i] = this.coords[i];
        }

        return area;
    }


    /**
     * @summary area を代入
     *
     * @param {mapray.Area3D} area  代入元
     *
     * @return {mapray.Area3D}  this
     */
    assign( area )
    {
        this.level = area.level;

        for ( let i = 0; i < 3; ++i ) {
            this.coords[i] = area.coords[i];
        }

        return this;
    }


    /**
     * @summary 子領域を取得
     *
     * @param {number} which  子インデックス (u + 2*v + 4*w)
     *
     * @return {mapray.Area3D}
     */
    getChild( which )
    {
        let area = new Area3D();

        area.level = this.level + 1;

        for ( let i = 0; i < 3; ++i ) {
            area.coords[i] = 2 * this.coords[i] + ((which >> i) & 1);
        }

        return area;
    }


    /**
     * @summary area の子領域を取得
     *
     * @param {mapray.Area3D} area   親領域
     * @param {number}        which  子インデックス (u + 2*v + 4*w)
     * @param {mapray.Area3D} dst    子領域の代入先
     *
     * @return {mapray.Area3D}  dst
     */
    static
    getChild( area, which, dst )
    {
        dst.level = area.level + 1;

        for ( let i = 0; i < 3; ++i ) {
            dst.coords[i] = 2 * area.coords[i] + ((which >> i) & 1);
        }

        return dst;
    }

}


export default Area3D;
