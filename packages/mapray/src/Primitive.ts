import GeoMath, { Vector3, Vector4, Matrix } from "./GeoMath";
import GLEnv from "./GLEnv";
import Mesh from "./Mesh";
import type EntityMaterial from "./EntityMaterial";
import type RenderStage from "./RenderStage";


/**
 * 描画プリミティブ
 *
 * @see mapray.PropSet
 * @see mapray.Entity#getPrimitives
 */
class Primitive {

    /**
     * 描画されるメッシュ
     *
     * 構築子の `mesh` 引数が設定される。
     */
    mesh: Mesh;


    /**
     * 描画に使用するマテリアル
     *
     * 構築子の `material` 引数が設定される。
     */
    material: EntityMaterial;


    /**
     * モデル座標系から GOCS への変換行列
     *
     * 構築子の `transform` 引数が設定される。
     */
    transform: Matrix;


    /**
     * 中心点 (モデル座標系)
     *
     * `null` のときは零ベクトルと見なす。
     *
     * @defaultValue `null`
     */
    pivot: Vector3 | null;


    /**
     * 境界箱 (モデル座標系)
     *
     * `bbox[0]` は座標の最小値、`bbox[1]` は座標の最大値とする。
     *
     * `null` のときは無限大の境界箱と見なす。
     *
     * @defaultValue `null`
     */
    bbox: Vector3[] | null;


    /**
     * プロパティ集合
     *
     * `null` のときは空集合と見なす。
     *
     * @defaultValue `null`
     */
    properties: object | null;


    /**
     * `RenderTarget.RID` のときだけ存在する
     */
    rid?: number;


    /**
     * ソート深度
     *
     * @internal
     */
    sort_z: number;


    /**
     * 引数に `null` を指定した場合は、`this` を使う前に対応するプロパ
     * ティに適切なオブジェクトを設定しなければならない。
     *
     * @param glenv     - WebGL 環境
     * @param mesh      - メッシュ
     * @param material  - マテリアル
     * @param transform - 変換行列
     */
    constructor( glenv:     GLEnv,
                 mesh:      Mesh | null,
                 material:  EntityMaterial | null,
                 transform: Matrix | null )
    {
        this._glenv = glenv;

        // 後で適切なオブジェクトが設定されることが約束されている
        // @ts-ignore
        this.mesh = mesh;

        // 後で適切なオブジェクトが設定されることが約束されている
        // @ts-ignore
        this.material = material;

        // 後で適切なオブジェクトが設定されることが約束されている
        // @ts-ignore
        this.transform = transform;

        this.pivot      = null;
        this.bbox       = null;
        this.properties = null;
        this.sort_z     = 0;
    }


    /**
     * インスタンスの複製を返す
     *
     * 公開プロパティが `this` と同じインスタンスを生成して返す。
     *
     * ただしプロパティ `mesh`, `material`, `properties` は参照コピー
     * で、それ以外は深いコピーとなる。
     *
     * @return インスタンスの複製
     */
    fastClone(): Primitive
    {
        const clone = new Primitive( this._glenv, this.mesh, this.material, GeoMath.createMatrix( this.transform ) );

        if ( this.pivot ) {
            clone.pivot = GeoMath.createVector3( this.pivot );
        }

        if ( this.bbox ) {
            clone.bbox = this.bbox.map( v => GeoMath.createVector3( v ) );
        }

        clone.properties = this.properties;

        return clone;
    }


    /**
     * プリミティブが見えるか？
     *
     * `true` を返したときはソート深度 `this.sort_z` が設定される。
     *
     * @param stage - レンダリングステージ
     *
     * @return プリミティブの一部が視体積に含まれるとき true, それ以外
     *         のとき false
     */
    isVisible( stage: RenderStage ): boolean
    {
        // obj_to_view = stage._gocs_to_view * this.transform
        const matrix = temp_obj_to_view;
        GeoMath.mul_AA( stage.gocs_to_view, this.transform, matrix );

        const bbox = this.bbox;
        if ( bbox ) {
            // 境界箱の頂点座標を変換 (視点空間) -> bbox_points
            transformBBox( bbox, matrix );

            // 視体積平面と比較
            for ( const plane of stage.getVolumePlanes() ) {
                if ( isBBoxBackSide( plane ) ) {
                    // 完全に視体積に含まれない
                    return false;
                }
            }
        }

        // ソート深度を設定
        const pivot = this.pivot;
        if ( pivot ) {
            this.sort_z = matrix[2]*pivot[0] + matrix[6]*pivot[1] + matrix[10]*pivot[2] + matrix[14];
        }
        else {
            this.sort_z = matrix[14];
        }

        return true;
    }


    /**
     * 背景との混合が必要か？
     *
     * @param stage - レンダリングステージ
     *
     * @return 背景との混合が必要なとき `true`, それ以外のとき `false`
     *
     */
    isTranslucent( stage: RenderStage ): boolean
    {
        return this.material.isTranslucent( stage, this );
    }


    /**
     * プリミティブを描画
     *
     * @param stage - レンダリングステージ
     */
    draw( stage: RenderStage ): void
    {
        const material = this.material;
        material.bindProgram();
        material.setParameters( stage, this );
        this.mesh.draw( material );
    }


    private readonly _glenv: GLEnv;

}


/**
 * 境界箱の頂点座標を変換 (視点空間) -> bbox_points
 */
function transformBBox( bbox:   Vector3[],
                        matrix: Matrix ): void
{
    for ( let iz = 0; iz < 2; ++iz ) {
        const zm = bbox[iz][2];
        for ( let iy = 0; iy < 2; ++iy ) {
            const ym = bbox[iy][1];
            for ( let ix = 0; ix < 2; ++ix ) {
                const xm = bbox[ix][0];
                const bbox_point = temp_bbox_points[ix + 2*iy + 4*iz];
                bbox_point[0] = matrix[0]*xm + matrix[4]*ym + matrix[ 8]*zm + matrix[12];
                bbox_point[1] = matrix[1]*xm + matrix[5]*ym + matrix[ 9]*zm + matrix[13];
                bbox_point[2] = matrix[2]*xm + matrix[6]*ym + matrix[10]*zm + matrix[14];
            }
        }
    }
}


/**
 * bbox_points はすべて plane の裏側か？
 */
function isBBoxBackSide( plane: Vector4 ): boolean
{
    for ( const point of temp_bbox_points ) {
        const dist = point[0]*plane[0] + point[1]*plane[1] + point[2]*plane[2] + plane[3];
        if ( dist >= 0 ) {
            // 表側に頂点が存在
            return false;
        }
    }

    return true;  // すべての頂点が裏側
}


// 一時領域
// モデル空間から視点空間への変換行列
const temp_obj_to_view = GeoMath.createMatrix();


// 一時領域
// 境界箱の頂点座標 (視点空間)
const temp_bbox_points: Vector3[] = [];

for ( let i = 0; i < 8; ++i ) {
    temp_bbox_points.push( GeoMath.createVector3() );
}


/**
 * @summary プロパティ集合
 * @desc
 * <p>プリミティブのプロパティ集合を表現する。</p>
 * <p>props を PropSet のインスタンス、name をプロパティ名とするとき、props.name または props["name"]
 * でプロパティ名からプロパティ値を取得することができる。</p>
 * <p>このクラスは実際には存在せず、一般的に Object で代用することができる。</p>
 * @class mapray.PropSet
 * @private
 * @see mapray.Primitive
 */


export default Primitive;
