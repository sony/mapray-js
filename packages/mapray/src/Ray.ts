import GeoMath, { Vector3 } from "./GeoMath";
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

}


export default Ray;
