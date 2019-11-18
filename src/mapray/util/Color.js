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
    constructor(r, g, b, a) 
    {
        this._r = r;
        this._g = g;
        this._b = b;
        this._a = a;
    }

    toArray() 
    {
        return [this._r, this._g, this._b, this._a];
    }

    toRGBString()
    {
        const [r, g, b, a] = this.toArray();
        return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
    }
};

export default Color;
