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


    /**
     * @summary インスタンスを複製
     *
     * @return {mapray.Ray}  this の複製
     */
    clone()
    {
        return new Ray( GeoMath.createVector3( this.position ),
                        GeoMath.createVector3( this.direction ) );
    }


    /**
     * @summary 座標変換
     *
     * @desc
     * <p>ray を変換行列 mat により座標変換して dst に代入する。</p>
     *
     * <p>mat は ray が想定する座標系から、ある座標系へ位置ベクトルと方向ベクトル
     * を変換するための行列である。</p>
     *
     * @param {mapray.Matrix} mat  変換行列
     * @param {mapray.Ray}    ray  変換するレイ
     * @param {mapray.Ray}    dst  結果を格納するオブジェクト
     *
     * @return {mapray.Ray}  dst
     */
    static
    transform_A( mat, ray, dst )
    {
        GeoMath.transformPosition_A( mat, ray.position, dst.position );
        GeoMath.transformDirection_A( mat, ray.direction, dst.direction );

        return dst;
    }

}


export default Ray;
