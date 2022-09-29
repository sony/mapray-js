import type { Area } from "./AreaUtil";


/**
 * タイルテクスチャ
 *
 * @see [[TileTextureCache]]
 */
class TileTexture implements Area {

    /**
     * 地図ズームレベル
     */
    readonly z: number;

    /**
     * X タイル座標
     */
    readonly x: number;

    /**
     * Y タイル座標
     */
    readonly y: number;


    /**
     * テクスチャオブジェクト
     */
    readonly texture: WebGLTexture;


    /**
     * @param z       - 地図ズームレベル
     * @param x       - X タイル座標
     * @param y       - Y タイル座標
     * @param texture - テクスチャオブジェクト
     */
    constructor( z: number,
                 x: number,
                 y: number,
                 texture: WebGLTexture )
    {
        this.z = z;
        this.x = x;
        this.y = y;
        this.texture = texture;
    }


    /**
     * リソースを破棄
     *
     * @param gl - WebGL レンダリングコンテキスト
     */
    dispose( gl: WebGLRenderingContext ): void
    {
        gl.deleteTexture( this.texture );
        // @ts-ignore - これ以降は参照されないので OK
        this.texture = null;
    }

}


export default TileTexture;
