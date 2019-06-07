import GeoMath from "./GeoMath";


/**
 * @summary シーン・エンティティ
 * @classdesc
 * <p>シーン・エンティティの基底クラスである。</p>
 * @memberof mapray
 * @see mapray.Scene
 * @protected
 * @abstract
 */
class Entity {

    /**
     * @desc
     * <p>インスタンス生成後に、それを scene に追加することができる。</p>
     * @param {mapray.Scene} scene  所属可能シーン
     */
    constructor( scene )
    {
        /**
         * @summary 所属可能シーン
         * @member mapray.Entity#scene
         * @type {mapray.Scene}
         * @readonly
         */
        this.scene = scene;
    }


    /**
     * @summary プリミティブ配列を取得
     * @desc
     * <p>レンダリング時にこのエンティティを描画するための 0 個以上のプリミティブを含む配列を返す。</p>
     * <p>このメソッドが呼び出されたフレームのレンダリングが終了するまで、返した配列とそれに含まれるプリミティブは変更してはならない。</p>
     *
     * @param  {mapray.RenderStage} stage  レンダリングステージ
     * @return {Array.<mapray.Primitive>}  プリミティブ配列
     * @abstract
     * @package
     */
    getPrimitives( stage )
    {
        throw new Error( "mapray.Entity#getPrimitives() method has not been overridden." );
    }


    /**
     * @summary スキーマ <TRANSFORM> のオブジェクトを解析
     *
     * @param  {object} transform  <TRANSFORM> オブジェクト
     * @return {mapray.Matrix}     GOCS への変換行列
     * @package
     */
    parseTransform( transform )
    {
        var result = GeoMath.createMatrix();

        if ( transform.matrix ) {
            // <TRANSFORM-MATRIX>
            return GeoMath.copyMatrix( transform.matrix, result );
        }
        else {
            // <TRANSFORM-CARTOGRAPHIC>
            // cartographic 局所直交座標系から GOCS への変換
            var iscs = { longitude: transform.cartographic[0],
                         latitude:  transform.cartographic[1],
                         height:    transform.cartographic[2] };
            var carto_to_gocs = GeoMath.iscs_to_gocs_matrix( iscs, GeoMath.createMatrix() );

            // KML 互換のモデル変換行列
            var heading   = transform.heading || 0;
            var tilt      = transform.tilt    || 0;
            var roll      = transform.roll    || 0;
            var scale     = (transform.scale !== undefined) ? transform.scale : [1, 1, 1];  // <PARAM-SCALE3>
            if ( typeof scale == 'number' ) {
                // スケールをベクトルに正規化
                scale = [scale, scale, scale];
            }
            GeoMath.kml_model_matrix( heading, tilt, roll, scale, result );

            return GeoMath.mul_AA( carto_to_gocs, result, result );
        }
    }

}


export default Entity;
