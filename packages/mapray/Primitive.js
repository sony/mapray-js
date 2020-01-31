import GeoMath from "./GeoMath";


/**
 * @summary 描画プリミティブ
 * @memberof mapray
 * @private
 * @see mapray.PropSet
 * @see mapray.Entity#getPrimitives
 */
class Primitive {

    /**
     * @param {mapray.GLEnv}          glenv      WebGL 環境
     * @param {mapray.Mesh}           mesh       メッシュ
     * @param {mapray.EntityMaterial} material   マテリアル
     * @param {mapray.Matrix}         transform  変換行列
     */
    constructor( glenv, mesh, material, transform )
    {
        this._glenv = glenv;

        /**
         * @summary 描画されるメッシュ
         * @desc
         * <p>構築子の mesh 引数が設定されている。</p>
         * @member mapray.Primitive#mesh
         * @type {mapray.Mesh}
         */
        this.mesh = mesh;

        /**
         * @summary 描画に使用するマテリアル
         * @desc
         * <p>構築子の material 引数が設定されている。</p>
         * @member mapray.Primitive#material
         * @type {mapray.EntityMaterial}
         */
        this.material = material;

        /**
         * @summary モデル座標系から GOCS への変換行列
         * @desc
         * <p>構築子の transform 引数が設定されている。</p>
         * @member mapray.Primitive#transform
         * @type {mapray.Matrix}
         */
        this.transform = transform;

        /**
         * @summary 中心点 (モデル座標系)
         * @desc
         * <p>null のときは零ベクトルと見なす。</p>
         * @member mapray.Primitive#pivot
         * @type {?mapray.Vector3}
         * @default null
         */
        this.pivot = null;

        /**
         * @summary 境界箱 (モデル座標系)
         * @desc
         * <p>bbox[0] は座標の最小値、bbox[1] は座標の最大値とする。</p>
         * <p>null のときは無限大の境界箱と見なす。</p>
         * @member mapray.Primitive#bbox
         * @type {?Array.<mapray.Vector3>}
         * @default null
         */
        this.bbox = null;

        /**
         * @summary プロパティ集合
         * @desc
         * <p>null のときは空集合と見なす。</p>
         * @member mapray.Primitive#properties
         * @type {?mapray.PropSet}
         * @default null
         */
        this.properties = null;

        /**
         * @summary ソート深度
         * @member mapray.Primitive#sort_z
         * @type {number}
         * @readonly
         * @package
         */
        this.sort_z = undefined;
    }


    /**
     * @summary インスタンスの複製を返す
     *
     * @desc
     * <p>公開プロパティが this と同じインスタンスを生成して返す。</p>
     * <p>ただしプロパティ mesh, material, properties は参照コピーで、それ以外は深いコピーとなる。</p>
     *
     * @return {mapray.Primitive}  インスタンスの複製
     */
    fastClone()
    {
        var clone = new Primitive( this._glenv, this.mesh, this.material, GeoMath.createMatrix( this.transform ) );

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
     * @summary プリミティブが見えるか？
     * @desc
     * <p>true を返したときはソート深度 this.sort_z が設定される。</p>
     * @param  {mapray.RenderStage} stage  レンダリングステージ
     * @return {boolean}                   プリミティブの一部が視体積に含まれるとき true, それ以外のとき false
     * @package
     */
    isVisible( stage )
    {
        // obj_to_view = stage._gocs_to_view * this.transform
        var matrix = Primitive._obj_to_view;
        GeoMath.mul_AA( stage._gocs_to_view, this.transform, matrix );

        var bbox = this.bbox;
        if ( bbox ) {
            // 境界箱の頂点座標を変換 (視点空間) -> bbox_points
            Primitive._transformBBox( bbox, matrix );

            // 視体積平面と比較
            var planes = stage._volume_planes;
            for ( var i = 0; i < planes.length; ++i ) {
                if ( Primitive._isBBoxBackSide( planes[i] ) ) {
                    // 完全に視体積に含まれない
                    return false;
                }
            }
        }

        // ソート深度を設定
        var pivot = this.pivot;
        if ( pivot ) {
            this.sort_z = matrix[2]*pivot[0] + matrix[6]*pivot[1] + matrix[10]*pivot[2] + matrix[14];
        }
        else {
            this.sort_z = matrix[14];
        }

        return true;
    }


    /**
     * @summary 背景との混合が必要か？
     * @param  {mapray.RenderStage} stage  レンダリングステージ
     * @return {boolean}                   背景との混合が必要なとき true, それ以外のとき false
     * @package
     */
    isTranslucent( stage )
    {
        return this.material.isTranslucent( stage, this );
    }


    /**
     * @summary プリミティブを描画
     * @param {mapray.RenderStage} stage  レンダリングステージ
     */
    draw( stage )
    {
        var material = this.material;
        material.bindProgram();
        material.setParameters( stage, this );
        this.mesh.draw( material );
    }


    /**
     * 境界箱の頂点座標を変換 (視点空間) -> bbox_points
     * @private
     */
    static _transformBBox( bbox, matrix )
    {
        for ( var iz = 0; iz < 2; ++iz ) {
            var zm = bbox[iz][2];
            for ( var iy = 0; iy < 2; ++iy ) {
                var ym = bbox[iy][1];
                for ( var ix = 0; ix < 2; ++ix ) {
                    var xm = bbox[ix][0];
                    var bbox_point = Primitive._bbox_points[ix + 2*iy + 4*iz];
                    bbox_point[0] = matrix[0]*xm + matrix[4]*ym + matrix[ 8]*zm + matrix[12];
                    bbox_point[1] = matrix[1]*xm + matrix[5]*ym + matrix[ 9]*zm + matrix[13];
                    bbox_point[2] = matrix[2]*xm + matrix[6]*ym + matrix[10]*zm + matrix[14];
                }
            }
        }
    }


    /**
     * bbox_points はすべて plane の裏側か？
     * @private
     */
    static _isBBoxBackSide( plane )
    {
        var bbox_points = Primitive._bbox_points;

        for ( var i = 0; i < bbox_points.length; ++i ) {
            var point = bbox_points[i];
            var  dist = point[0]*plane[0] + point[1]*plane[1] + point[2]*plane[2] + plane[3];
            if ( dist >= 0 ) {
                // 表側に頂点が存在
                return false;
            }
        }

        return true;  // すべての頂点が裏側
    }

}


// クラス定数の定義
{
    // 一時領域
    Primitive._obj_to_view = GeoMath.createMatrix();  // モデル空間から視点空間への変換行列
    Primitive._bbox_points = [];                      // 境界箱の頂点座標 (視点空間)
    for ( var i = 0; i < 8; ++i ) {
        Primitive._bbox_points.push( GeoMath.createVector3() );
    }
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
