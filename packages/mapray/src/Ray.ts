import GeoMath, { Matrix, Vector3 } from "./GeoMath";
import Viewer from "./Viewer";
import Camera from "./Camera";


/**
 * 始点と方向
 *
 * 始点と方向で表現される半直線である。
 * @see [[Viewer.getRayIntersection]]
 * @see [[Camera.getCanvasRay]]
 */
class Ray {

    /**
     * レイの始点
     */
    position: Vector3;

    /**
     * レイの方向
     *
     * 非零ベクトルでなければならない。
     */
    direction: Vector3;


    /**
     * pos の参照を [[position]], dir の参照を [[direction]] に代入する。
     *
     * ただし引数を省略したとき、対応するメンバーには新たに生成されたベクトルが代入される。
     * @param pos レイの始点（default[0, 0, 0]）
     * @param dir レイの方向（default [0, 0, -1]）
     */
    constructor( pos?: Vector3, dir?: Vector3 )
    {
        this.position = pos || GeoMath.createVector3();

        this.direction = dir || GeoMath.createVector3( [0, 0, -1] );
    }


    /**
     * インスタンスを複製
     *
     * @return this の複製
     */
    clone(): Ray
    {
        return new Ray( GeoMath.createVector3( this.position ),
                        GeoMath.createVector3( this.direction ) );
    }


    /**
     * 座標変換
     *
     * ray を変換行列 mat により座標変換して dst に代入する。
     *
     * mat は ray が想定する座標系から、ある座標系へ位置ベクトルと方向ベクトル
     * を変換するための行列である。
     *
     * @param  mat  変換行列
     * @param  ray  変換するレイ
     * @param  dst  結果を格納するオブジェクト
     *
     * @return dst
     */
    static transform_A( mat: Matrix, ray: Ray, dst: Ray ): Ray
    {
        GeoMath.transformPosition_A( mat, ray.position, dst.position );
        GeoMath.transformDirection_A( mat, ray.direction, dst.direction );

        return dst;
    }

}


export default Ray;
