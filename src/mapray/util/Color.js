/**
 * @summary Utility Class for Color
 * @memberof mapray
 */
class Color {
    /**
     * @param r {number}    The red (0.0 ~ 1.0)
     * @param g {number}    The green (0.0 ~ 1.0)
     * @param b {number}    The blue (0.0 ~ 1.0)
     * @param a {number}    The alpha (0.0 ~ 1.0)
     */
    constructor( r, g, b, a ) 
    {
        this._r = r;
        this._g = g;
        this._b = b;
        this._a = a;
    }

    /**
     * @summary 不透明色を生成
     * @param  {mapray.Vector3}
     * @return {mapray.Color}
     */
    static generateOpacityColor( rgb ) {
        return new Color(rgb[0], rgb[1], rgb[2], 1)
    }

    /**
     * @summary 色を代入
     * @desc
     * <p>src を dst に代入する。</p>
     * @param  {mapray.Color} src  代入元
     * @param  {mapray.Color} dst  代入先
     * @return {mapray.Color}      dst
     */
    static copyColor( src, dst )
    {
        dst._r = src._r;
        dst._g = src._g;
        dst._b = src._b;
        dst._a = src._a;

        return dst;
    }

    /**
     * @summary 不透明色を代入
     * @desc
     * <p>src を dst に代入する。</p>
     * @param  {mapray.Vector3} rgb  代入元
     * @param  {mapray.Color} dst  代入先
     * @return {mapray.Color}      dst
     */
    static setOpacityColor( rgb, dst )
    {
        dst._r = rgb[0];
        dst._g = rgb[1];
        dst._b = rgb[2];
        dst._a = 1;
    }

    /**
     * @summary 色配列に変換する
     * @desc
     * <p>0から255に正規化。 [R, G, B, A]の順番</p>
     *
     * @return {mapray.Vector4}      dst
     */
    toArray()
    {
        return [this.floatToByte(this._r), this.floatToByte(this._g), this.floatToByte(this._b), this._a]; 
    }

    /**
     * @summary RGBA文字列に変換する
     * @desc
     * <p>RGBA文字列に変換して文字列を返却</p>
     *
     * @return {mapray.string}
     */
    toRGBString()
    {
        const rgba = this.toArray();
        return `rgba(${Math.round(rgba[0])},${Math.round(rgba[1])},${Math.round(rgba[2])},${rgba[3]})`;
    }

    /**
     * @summary 0~1.0の色値を255までで正規化
     * @desc
     * <p>0から1で正規化された色値を255までに拡張する</p>
     *
     * @return {mapray.string}
     */
    floatToByte( value )
    {
        return value === 1.0 ? 255.0 : (value * 256.0) | 0;
    }

    /**
     * @summary Red
     * @type {number}
     * @readonly
     */
    get r() {
        return this._r;
    }

    /**
     * @summary Green
     * @type {number}
     * @readonly
     */
    get g() {
        return this._g;
    }

     /**
     * @summary Blue
     * @type {number}
     * @readonly
     */
    get b() {
        return this._b;
    }

    /**
     * @summary Alpha
     * @type {number}
     * @readonly
     */
    get a() {
        return this._a;
    }
};

export default Color;
