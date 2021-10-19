import Mesh from "./Mesh";
import GeoMath, { Vector4, Matrix } from "./GeoMath";
import CloudMaterial from "./CloudMaterial";
import Resource, { URLResource } from "./Resource";

import Viewer from "./Viewer";
import GLEnv from "./GLEnv";
import RenderStage from "./RenderStage";

import { ImageIconLoader } from "./IconLoader";
import Dom from "./util/Dom";



/**
 * 雲を表現するクラス
 */
class CloudVisualizer {

    static readonly CLOUD_WIDTH: number = 720 * 2;
    static readonly CLOUD_HEIGHT: number = 361 * 2;

    private _viewer!: Viewer;
    private _glenv!: GLEnv;
    private _mesh!: Mesh;

    private _visibility!: boolean;

    private _intensity!: number;

    private _height: number;
    private _fade: number;

    private _image_width!: number;
    private _image_height!: number;
    private _context!: CanvasRenderingContext2D;

    private _initial_from_image_src: CloudVisualizer.ImageResource;

    private _initial_to_image_src: CloudVisualizer.ImageResource;

    private _loaded_image_src: CloudVisualizer.ImageResource[];

    private _imageArray: number[][];

    private _gradient_array: Vector4[];

    private _gradient_mode: CloudVisualizer.GradientMode;

    private _vertices: Array<number>;

    private _indices: Array<number>;


    /**
     * constructor
     *
     * @param image_src image source
     * @param gradient_array gradient生成のためのcolor配列(RGBA)
     * @param gradient_mode  gradientの表現方法
     */
    constructor( option: CloudVisualizer.Option = {} )
    {
        this._loaded_image_src = [undefined, undefined];
        this._initial_from_image_src = option.from_image;
        this._initial_to_image_src = option.to_image;

        this._vertices = [];
        this._indices  = [];

        this._height = option.height || 10000;
        this._fade = 0;

        this._imageArray = [];
        this._imageArray[CloudVisualizer.ImageTarget.FROM] = [];
        this._imageArray[CloudVisualizer.ImageTarget.TO]   = [];

        this._gradient_array = option.gradient_array || [
            GeoMath.createVector4([1, 1, 1, 0]),
            GeoMath.createVector4([1, 1, 1, 1])
        ];

        this._gradient_mode = option.gradient_mode || CloudVisualizer.GradientMode.LINEAR;
    }


    /**
     * 初期化
     * Viewerのコンストラクタで呼び出されます。
     *
     * @param viewer 所属するViewer
     */
    init( viewer: Viewer )
    {
        this._viewer = viewer;
        this._glenv = viewer.glenv;

        this._visibility = true;

        this._intensity = 1.0;

        this._fade = 0.0;

        this._image_width = CloudVisualizer.CLOUD_WIDTH;
        this._image_height = CloudVisualizer.CLOUD_HEIGHT;
        this._context = Dom.createCanvasContext( this._image_width, this._image_height );

        this._imageArray[CloudVisualizer.ImageTarget.FROM].length = this._image_width * this._image_height;
        this._imageArray[CloudVisualizer.ImageTarget.FROM].fill(0);
        this._imageArray[CloudVisualizer.ImageTarget.TO].length = this._image_width * this._image_height;
        this._imageArray[CloudVisualizer.ImageTarget.TO].fill(0);

        this._checkMaterials();
        this._createMesh();

        this.loadData( this._initial_from_image_src, this._initial_to_image_src );
    }


    /**
     * 破棄
     */
    destroy()
    {
        this._deleteMaterials();
        if (this._mesh) this._mesh.dispose();
    }


    /**
     * 可視性フラグを取得
     */
    get visibility(): Boolean { return this._visibility; }


    /**
     * 可視性フラグを設定
     *
     * @param visibility  可視性フラグ
     */
    setVisibility( flag: boolean ) { this._visibility = flag; }


    /**
     * フェード係数を設定
     *
     * @param value  フェード係数 (0 - 1) 1でfromの画像
     */
    setFade( value: number ) {
        this._fade = value;
    }


    /**
     * 輝度係数を設定
     *
     * @param value  輝度係数 (0, 1) 1で陰部分の影響を受けない
     */
    setIntensity( value: number ) {
        this._intensity = value;
    }


    /**
     * メッシュを生成
     */
    private _createMesh() {
        let ai, si, ci;
        let aj, sj, cj;
        let p1, p2;

        const radius = 10.0 * (1.0 + this._height / GeoMath.EARTH_RADIUS);

        let count = 0;

        this._vertices = [];
        this._indices = [];

        // Vertices
        for (let j = 0; j < this._image_height; j++) {
            aj = j * 0.25 * GeoMath.DEGREE;
            sj = Math.sin(aj);
            cj = Math.cos(aj);
            for (let i = 0; i < this._image_width; i++) {
                ai = i * 0.25 * GeoMath.DEGREE;
                si = Math.sin(ai);
                ci = Math.cos(ai);

                this._vertices.push(ci * sj * radius); //z
                this._vertices.push(si * sj * radius); //x
                this._vertices.push(cj * radius);      //y

                this._vertices.push(this._imageArray[CloudVisualizer.ImageTarget.FROM][count]);
                this._vertices.push(this._imageArray[CloudVisualizer.ImageTarget.TO][count]);

                count++;
            }
        }

        // Indices
        for (let j = 0; j < this._image_height - 1; j++) {
            for (let i = 0; i < this._image_width; i++) {
                p1 = j * this._image_width + i;
                p2 = p1 + this._image_width;

                this._indices.push(p1);
                this._indices.push(p2);
                this._indices.push(p1 + 1);

                this._indices.push(p1 + 1);
                this._indices.push(p2);
                if ((j === this._image_height - 2) && (i === this._image_width - 1)) {
                    this._indices.push(p2 - (this._image_width - 1));
                }
                else {
                    this._indices.push(p2 + 1);
                }
            }
        }

        const mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_cloud", size: 2 },
            ],
            vertices: this._vertices,
            indices:  this._indices
        };

        if ( this._mesh ) {
            this._mesh.dispose();
        }
        this._mesh = new Mesh( this._glenv, mesh_data );
    }


    /**
     * メッシュの雲量値を更新
     */
    private _updateMesh() {
        if ( !this._mesh ) {
            throw new Error("Illegal State: mesh was not created.");
        }

        const fromImageArray = this._imageArray[CloudVisualizer.ImageTarget.FROM];
        const toImageArray   = this._imageArray[CloudVisualizer.ImageTarget.TO];

        // Vertices
        let count = 0;
        let ptr = 3;
        for (let j = 0; j < this._image_height; j++) {
            for (let i = 0; i < this._image_width; i++) {
                this._vertices[ptr++] = fromImageArray[count];
                this._vertices[ptr]   = toImageArray[count++];
                ptr += 4;
            }
        }

        const mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_cloud", size: 2 },
            ],
            vertices: this._vertices,
            indices:  this._indices
        };

        if ( this._mesh ) {
            this._mesh.dispose();
        }
        this._mesh = new Mesh( this._glenv, mesh_data );
    }


    /**
     * マテリアルを確認してCacheにセット
     */
    private _checkMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( !render_cache.cloud_material ) {
            render_cache.cloud_material = new CloudMaterial( this._viewer, this._gradient_array, this._gradient_mode );
        }
    }


    /**
     * マテリアルを確認してCacheにセット
     * すでにマテリアルがあれば更新
     */
    private _updateMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( !render_cache.cloud_material ) {
            render_cache.cloud_material = new CloudMaterial( this._viewer, this._gradient_array, this._gradient_mode );
        }
        else {
            if (render_cache && render_cache.cloud_material ) {
                render_cache.cloud_material.dispose();
            }
            render_cache.cloud_material = new CloudMaterial( this._viewer, this._gradient_array, this._gradient_mode );    
        }
    }


    /**
     * マテリアルを削除
     */
    private _deleteMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache;
        if (render_cache && render_cache.cloud_material ) {
            render_cache.cloud_material.dispose();
        }
    }


    /**
     * 雲を描画
     *
     * @param render_stage レンダリングステージ
     * @param gocs_to_clip gocs_to_clip
     * @param view_to_gocs view_to_gocs
     */
    draw( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix )
    {
        if ( !this._mesh ) return;

        // @ts-ignore
        const material = this._viewer._render_cache.cloud_material;

        material.bindProgram();
        const need_draw = material.setParameter( render_stage, gocs_to_clip, view_to_gocs, this._viewer.sun, this._fade, this._intensity );

        if ( need_draw ) {
            this._mesh.draw( material );
        }
    }


    /**
     * コンターを変更
     * @param gradient_array gradient生成のためのcolor配列(RGBA)
     * @param gradient_mode  gradientの表現方法
     */
    setGradient( gradient_array: Vector4[], gradient_mode: CloudVisualizer.GradientMode = CloudVisualizer.GradientMode.LINEAR )
    {
        this._gradient_array = gradient_array;
        this._gradient_mode = gradient_mode;
        this._updateMaterials();
    }


    /**
     * Fromにテクスチャ画像を設定
     * @param image_src  画像のパス
     * @param fade       fade係数
     */
    public async loadFrom( image_src: CloudVisualizer.ImageResource, fade: number = -1 )
    {
        const old_to_src = this._loaded_image_src[CloudVisualizer.ImageTarget.TO];
        return await this._loadImages( image_src, old_to_src, fade );
    }


    /**
     * Toにテクスチャ画像を設定
     * @param image_src  画像のパス
     * @param fade       fade係数
     */
    public async loadTo( image_src: CloudVisualizer.ImageResource, fade: number = -1 )
    {
        const old_from_src = this._loaded_image_src[CloudVisualizer.ImageTarget.FROM];
        return await this._loadImages( old_from_src, image_src, fade );
    }


    /**
     * From,Toにテクスチャ画像を設定
     * @param image_from  From画像のパス
     * @param image_to    To画像のパス
     * @param fade       fade係数
     */
    public async loadData( image_from: CloudVisualizer.ImageResource, image_to: CloudVisualizer.ImageResource = undefined, fade: number = -1 )
    {
        return this._loadImages( image_from, image_to || image_from, fade ); // to 指定無しの時は Fromと同じにする
    }


    /**
     * Fromにテクスチャ画像を設定
     * @param image_src  画像のパス
     * @param fade       fade係数
     */
    public async pushFront( image_src: CloudVisualizer.ImageResource, fade: number = -1 )
    {
        const old_from_src = this._loaded_image_src[CloudVisualizer.ImageTarget.FROM];
        return await this._loadImages( image_src, old_from_src, fade );
    }


    /**
     * Toにテクスチャ画像を設定
     * @param image_src  画像のパス
     * @param fade       fade係数
     */
    public async pushBack( image_src: CloudVisualizer.ImageResource, fade: number = -1 )
    {
        const old_to_src = this._loaded_image_src[CloudVisualizer.ImageTarget.TO];
        return await this._loadImages( old_to_src, image_src, fade );
    }


    /**
     * 2つのテクスチャ画像を設定
     * @param from_src  from画像のパス
     * @param to_src    to画像のパス
     * @param fade      fade値(2画像ロード後に適用)
     */
    private async _loadImages( from_src: CloudVisualizer.ImageResource, to_src: CloudVisualizer.ImageResource, fade: number = -1 )
    {
        let old_to_src   = this._loaded_image_src[CloudVisualizer.ImageTarget.TO];
        let old_from_src = this._loaded_image_src[CloudVisualizer.ImageTarget.FROM];

        if ( ( old_to_src === to_src ) && ( old_from_src === from_src ) ) {
            // no need to update mesh
        }
        else {
            let needUpdateMesh = false;

            const tasks: any[] = [];
            if ( (old_to_src === from_src) || (old_from_src === to_src) ) {
                if (from_src === to_src) { // copy
                    if (old_from_src !== from_src) {
                        this._imageArray[CloudVisualizer.ImageTarget.FROM] = this._imageArray[CloudVisualizer.ImageTarget.TO].concat();
                    }
                    else { // (old_to_src !== to_src)
                        this._imageArray[CloudVisualizer.ImageTarget.TO] = this._imageArray[CloudVisualizer.ImageTarget.FROM].concat();
                    }
                }
                else { // swap
                    const tmp = this._imageArray[CloudVisualizer.ImageTarget.TO];
                    this._imageArray[CloudVisualizer.ImageTarget.TO]   = this._imageArray[CloudVisualizer.ImageTarget.FROM];
                    this._imageArray[CloudVisualizer.ImageTarget.FROM] = tmp;
                    this._loaded_image_src[CloudVisualizer.ImageTarget.FROM] = old_to_src;
                    this._loaded_image_src[CloudVisualizer.ImageTarget.TO]   = old_from_src;
                    old_from_src = this._loaded_image_src[CloudVisualizer.ImageTarget.FROM];
                    old_to_src   = this._loaded_image_src[CloudVisualizer.ImageTarget.TO]
                }
                needUpdateMesh = true;
            }

            if ( old_from_src !== from_src ) {
                tasks.push( this._loadImageData( from_src, this._imageArray[CloudVisualizer.ImageTarget.FROM] ) );
                this._loaded_image_src[CloudVisualizer.ImageTarget.FROM] = from_src;
                needUpdateMesh = true;
            }

            if ( old_to_src !== to_src ) {
                tasks.push( this._loadImageData( to_src, this._imageArray[CloudVisualizer.ImageTarget.TO] ) );
                this._loaded_image_src[CloudVisualizer.ImageTarget.TO] = to_src;
                needUpdateMesh = true;
            }

            if ( tasks.length > 0 ) {
                await Promise.all( tasks );
            }

            if ( needUpdateMesh ) {
                this._updateMesh();
            }
        }

        if ( fade !== -1 ) { 
            this._fade = fade;
        }
    }


    /**
     * 画像情報からピクセルを読み込む
     * @param image_src 画像
     * @param buf 結果を格納する配列
     */
    private async _loadImageData( image_src: CloudVisualizer.ImageResource, buf: number[] ): Promise<number[]>
    {
        if ( image_src ) {
            let drawable_image: CanvasImageSource;
            if ( image_src instanceof HTMLImageElement || image_src instanceof HTMLCanvasElement ) {
                drawable_image = image_src;
            }
            else {
                const resource = image_src instanceof Resource ? image_src : new URLResource( image_src.toString(), { });

                const iconLoader = new ImageIconLoader();
                const icon = iconLoader.load( resource );
                drawable_image = await new Promise((onSuccess, onError) => {
                        icon.onEnd((item: { _icon: CanvasImageSource; }) => {
                                if ( icon.isLoaded() ) {
                                    onSuccess( item._icon );
                                }
                                else {
                                    onError( 'image load error: ' + image_src );
                                }
                        });
                });
            }

            this._context.drawImage( drawable_image, 0, 0, this._image_width, this._image_height );
            const image_data = this._context.getImageData( 0, 0, this._image_width, this._image_height ).data;
            for ( let i=0; i < buf.length; i++ ) {
                buf[i] = image_data[i * 4];
            }
        }
        else {
            for ( let i=0; i < buf.length; i++ ) {
                buf[i] = 0;
            }
        }
        return buf;
    }
}



namespace CloudVisualizer {



export type ImageResource = undefined | string | URLResource | CanvasImageSource;



export interface Option {
    from_image?: ImageResource,
    to_image?: ImageResource,
    height?: number;
    gradient_array?: Vector4[];
    gradient_mode?: GradientMode;
}



export enum ImageTarget {
    FROM = 0,
    TO = 1,
};



export enum GradientMode {
    LINEAR,
    STEP
};



} // namespace CloudVisualizer



export default CloudVisualizer;
