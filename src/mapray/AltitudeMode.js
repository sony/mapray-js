/**
 * @summary 高度モード
 *
 * @desc
 * <p>{@link mapray.GeoPoint} などの高度値をどのように解釈するかを指定する列挙値の型である。<p>
 *
 * @enum {object}
 * @memberof mapray
 * @constant
 * @see mapray.Entity
 */
var AltitudeMode = {

    /**
     * 絶対値
     */
    ABSOLUTE: { id: "ABSOLUTE" },


    /**
     * 地表からの相対値
     */
    RELATIVE: { id: "RELATIVE" }

};


export default AltitudeMode;
