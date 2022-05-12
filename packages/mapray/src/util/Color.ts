import GeoMath, { Vector3, Vector4 } from "../GeoMath";


/**
 * Utility Class for Color
 */
namespace Color {



/**
 * 不透明色を生成。
 *
 * 4番目以降の要素は無視される。要素数が 3 に満たない場合は 0.0 と解釈する。
 */
export function createOpaqueColor( rgb?: Vector3 ): Vector3 {
    return GeoMath.createVector3( rgb );
}


/**
 * 色を生成
 */
export function createColor( rgb?: Vector3 | Vector4 ): Vector4 {
    return GeoMath.createVector4(
        !rgb ? undefined :
        GeoMath.isVector4( rgb ) ? rgb :
        [ rgb[0], rgb[1], rgb[2], 1.0 ]
    );
}


/**
 * 不透明色を代入
 *
 * src を dst に代入する。
 * 透明色を代入した場合は、透明チャネルが無視される。
 * @param  src  代入元
 * @param  dst  代入先
 * @return dst
 */
export function copyOpaqueColor( src: Vector3 | Vector4, dst: Vector3 ): Vector3
{
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    return dst;
}


/**
 * 色を代入
 *
 * src を dst に代入する。
 * 不透明色を代入した場合は、透明チャネルは `1.0` とする。
 * @param  src  代入元
 * @param  dst  代入先
 * @return dst
 */
export function copyColor( src: Vector3 | Vector4, dst: Vector4 ): Vector4
{
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    dst[3] = GeoMath.isVector3( src ) ? 1.0 : src[3];
    return dst;
}


/**
 * 乗算済みアルファを計算します。
 *
 * @param  src  入力値
 * @param  dst  代入先
 * @return dst
 */
export function premultiply( src: Vector3 | Vector4, dst: Vector4 ): Vector4
{
    if ( GeoMath.isVector4( src ) ) {
        const alpha = src[3];
        if ( alpha === 0 ) {
            dst[0] = dst[1] = dst[2] = dst[3] = 0.0;
        }
        else {
            dst[0] = src[0] / alpha;
            dst[1] = src[1] / alpha;
            dst[2] = src[2] / alpha;
            dst[3] = alpha;
        }
    }
    else {
        dst[0] = src[0];
        dst[1] = src[1];
        dst[2] = src[2];
        dst[3] = 1.0;
    }
    return dst;
}


/**
 * RGBA文字列に変換する
 */
export function toRGBString( rgb: Vector3 | Vector4 ): string
{
    const r = Color.floatToByte( rgb[0] );
    const g = Color.floatToByte( rgb[1] );
    const b = Color.floatToByte( rgb[2] );
    if ( GeoMath.isVector4( rgb ) ) {
        const a = Color.floatToByte( rgb[3] );
        return `rgba(${r},${g},${b},${a})`;
    }
    else {
        return `rgb(${r},${g},${b})`;
    }
}

/**
 * 0~1.0 の色値を 255 までの値に正規化
 */
export function floatToByte( value: number ): number
{
    return value === 1.0 ? 255.0 : (value * 256.0) | 0;
}

/**
 * 0~1.0 の色値を 255 までの値に正規化
 */
export function floatColorToByteColor( src: Vector3 | Vector4, dst: Vector4 ): Vector4
{
    dst[0] = Color.floatToByte(src[0]);
    dst[1] = Color.floatToByte(src[1]);
    dst[2] = Color.floatToByte(src[2]);
    dst[3] = GeoMath.isVector3( src ) ? 255 : Color.floatToByte(src[3]);
    return dst;
}



} // namespace Color



export default Color;
