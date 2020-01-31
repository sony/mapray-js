import GeoMath from "./GeoMath";


/**
 * @summary 始点と方向
 * @classdesc
 * <p>始点と方向で表現される半直線である。</p>
 * @memberof mapray
 * @see mapray.Viewer#getRayIntersection
 * @see mapray.Camera#getCanvasRay
 */
class Ray {

    /**
     * @desc
     * <p>pos の参照を {@link mapray.Ray#position}, dir の参照を {@link mapray.Ray#direction} に代入する。</p>
     * <p>ただし引数を省略したとき、対応するメンバーには新たに生成されたベクトルが代入される。</p>
     * @param {mapray.Vector3} [pos]  レイの始点
     * @param {mapray.Vector3} [dir]  レイの方向
     */
    constructor( pos, dir )
    {
        /**
         *  @summary レイの始点
         *  @member mapray.Ray#position
         *  @type {mapray.Vector3}
         *  @default [0, 0, 0]
         */
        this.position = pos || GeoMath.createVector3();

        /**
         *  @summary レイの方向
         *  @desc
         *  <p>非零ベクトルでなければならない。</p>
         *  @member mapray.Ray#direction
         *  @type {mapray.Vector3}
         *  @default [0, 0, -1]
         */
        this.direction = dir || GeoMath.createVector3( [0, 0, -1] );
    }

}


export default Ray;
