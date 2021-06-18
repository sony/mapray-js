import { Vector3, Vector4 } from "../GeoMath";


/**
 * Utility Class for Color
 */
class Color {
    /** The red (0.0 ~ 1.0) */
    private _r: number;

    /** The green (0.0 ~ 1.0) */
    private _g: number;

    /** The blue (0.0 ~ 1.0) */
    private _b: number;

    /** The alpha (0.0 ~ 1.0) */
    private _a: number;

    /**
     * @param r The red (0.0 ~ 1.0)
     * @param g The green (0.0 ~ 1.0)
     * @param b The blue (0.0 ~ 1.0)
     * @param a The alpha (0.0 ~ 1.0)
     */
    constructor( r: number, g: number, b: number, a: number ) 
    {
        this._r = r;
        this._g = g;
        this._b = b;
        this._a = a;
    }

    /**
     * 不透明色を生成
     */
    static generateOpacityColor( rgb: Vector3 ): Color {
        return new Color(rgb[0], rgb[1], rgb[2], 1)
    }

    /**
     * 色を代入
     *
     * src を dst に代入する。
     * @param  src  代入元
     * @param  dst  代入先
     * @return dst
     */
    static copyColor( src: Color, dst: Color ): Color
    {
        dst._r = src._r;
        dst._g = src._g;
        dst._b = src._b;
        dst._a = src._a;

        return dst;
    }

    /**
     * 不透明色を代入
     *
     * src を dst に代入する。
     * @param  rgb  代入元
     * @param  dst  代入先
     */
    static setOpacityColor( rgb: Vector3, dst: Color )
    {
        dst._r = rgb[0];
        dst._g = rgb[1];
        dst._b = rgb[2];
        dst._a = 1;
    }

    /**
     * 色配列に変換する
     *
     * 0から255に正規化。 [R, G, B, A]の順番
     */
    toArray(): Vector4
    {
        return (this._a === 0 ? [0, 0, 0, 0] : [
            this.floatToByte(this._r) / this._a, 
            this.floatToByte(this._g) / this._a, 
            this.floatToByte(this._b) / this._a, 
            this._a
        ]); 
    }

    /**
     * 色配列に変換する
     *
     * 0から1に正規化。 [R, G, B, A]の順番
     *
     * @return dst
     */
    toVector4(): Vector4
    {
        return (this._a === 0 ? [0, 0, 0, 0] : [
            this._r / this._a, 
            this._g / this._a, 
            this._b / this._a, 
            this._a
        ]);
    }

    /**
     * RGBA文字列に変換する
     *
     * RGBA文字列に変換して文字列を返却
     */
    toRGBString(): string
    {
        const rgba = this.toArray();
        return `rgba(${Math.round(rgba[0])},${Math.round(rgba[1])},${Math.round(rgba[2])},${rgba[3]})`;
    }

    /**
     * 0~1.0の色値を255までで正規化
     *
     * 0から1で正規化された色値を255までに拡張する
     */
    floatToByte( value: number ): number
    {
        return value === 1.0 ? 255.0 : (value * 256.0) | 0;
    }

    /**
     * Red
     */
    get r(): number {
        return this._r;
    }

    /**
     * Green
     */
    get g(): number {
        return this._g;
    }

     /**
     * Blue
     * number
     */
    get b(): number {
        return this._b;
    }

    /**
     * Alpha
     */
    get a(): number {
        return this._a;
    }
};

export default Color;
