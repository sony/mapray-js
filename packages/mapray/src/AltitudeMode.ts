/**
 * 高度モード
 *
 * {@link mapray.GeoPoint} などの高度値をどのように解釈するかを指定する列挙値の型である。
 *
 * @see mapray.Entity
 */
enum AltitudeMode {

    /**
     * 絶対値
     */
    ABSOLUTE,


    /**
     * 地表からの相対値
     */
    RELATIVE,


    /**
     * 地表と同じ高さ (高度値を無視)
     */
    CLAMP,

};


export default AltitudeMode;
