/**
 * @module
 *
 * `symbol` 型スタイルレイヤーで使用する画像生成の負荷を抑えるための
 * キャッシュを実装する。
 */

import { MAX_SDF_WIDTH, MAX_SDF_HEIGHT, DIST_FACTOR, DIST_LOWER } from "./symbol_base";
import GLEnv from "../../GLEnv";
import WasmTool, { EmModule } from "../../WasmTool";
import sdfield_base64 from "../../wasm/sdfield.wasm";
import sdfield_factory from "../../wasm/sdfield.js";
import { cfa_assert } from "../../util/assertion";


// TODO: 正式に同期させる
let sdfield_module: EmModule | undefined;
WasmTool.createEmObjectByBese64( sdfield_base64, sdfield_factory ).then( mod => { sdfield_module = mod; } );


/**
 * テクスチャを拡張するときの刻み幅
 */
const TEXTURE_EXTENSION_STEP = 5.0;


/**
 * 表示を拡張するときの刻み幅
 */
const DISPLAY_EXTENSION_STEP = 3.5;


/**
 * モジュール内部でのフォントサイズの最小値
 */
const MIN_FONT_SIZE = 0.1;


/**
 * キャッシュされているノード数が、これ以下のときはキャッシュ
 * を縮小しない。
 *
 * またキャッシュを縮小しても、これ未満のノード数にはしない。
 */
const NUM_NODES_ALLOWABLE = 150;      // >= 0


/**
 * 現在ハンドルから参照されているノード数に対するキャッシュの
 * ノード数がこの割合を超えると、キャッシュの縮小を行う。
 */
const NODE_CACHE_REDUCE_UPPER = 3.0;  // > NODE_CACHE_REDUCE_LOWER


/**
 * キャッシュを縮小するときに、現在ハンドルから参照されている
 * ノード数に対して、この割合のノード数まで減らす。
 */
const NODE_CACHE_REDUCE_LOWER = 2.0;  // > 1.0


/**
 * 表示できる縁取り幅の限界値
 *
 * これ以上の値を指定しても、縁取りの幅は太くならない。
 */
const HALO_WIDTH_DISP_LIMIT = 1 / DIST_FACTOR + DIST_LOWER;


/**
 * `symbol` 型スタイルレイヤーの画像をキャッシュを管理
 *
 * 一般的に `ImageCache` インスタンスは複数の [[SymbolLayer]]
 * インスタンス間で共有される。
 */
export class ImageCache {

    readonly glenv: GLEnv;

    private _canvas_width: number;
    private _canvas_height: number;
    private _canvas_context: CanvasRenderingContext2D;


    /**
     * キャッシュされているノード
     */
    private readonly _cache_nodes: Map<string, CacheNode>;


    /**
     * これまでに生成されたノード数
     */
    private _num_nodes_created: number;


    /**
     * 現在ハンドルから参照されているノードの数
     */
    private _num_nodes_referenced: number;


    /**
     * 初期化
     *
     * @param glenv - WebGL 環境
     */
    constructor( glenv: GLEnv )
    {
        this.glenv = glenv;
        this._canvas_width   = 1;
        this._canvas_height  = 1;
        this._canvas_context = this._create_canvas_context();
        this._cache_nodes    = new Map();

        this._num_nodes_created    = 0;
        this._num_nodes_referenced = 0;
    }


    /**
     * 画像ハンドルを取得
     *
     * @param text       - テキスト文字列
     * @param style      - フォントスタイル
     * @param font_size  - フォント px サイズ
     * @param halo_width - 現在の縁取り幅
     *
     * @return 画像ハンドル
     */
    getHandle( text: string,
               style: string,
               font_size: number,
               halo_width: number ): ImageHandle
    {
        halo_width = Math.min( Math.max( halo_width, 0 ), HALO_WIDTH_DISP_LIMIT );
        font_size  = Math.max( font_size, MIN_FONT_SIZE );

        const key = make_node_key( text, style );
        let  node = this._cache_nodes.get( key );

        if ( !node ) {
            this._canvas_context.font = style;
            const metrics = this._canvas_context.measureText( text );

            node = new CacheNode( this, text, style, font_size, halo_width, metrics );
            this._cache_nodes.set( key, node );

            ++this._num_nodes_created;
        }

        const handle = new ImageHandle( node, halo_width );

        if ( node.ref_count === 1 ) {
            // ノードは始めて参照された
            ++this._num_nodes_referenced;
        }

        // キャシュの縮小を試みる
        this._try_reduce_cache();

        cfa_assert( this._num_nodes_referenced <= this._cache_nodes.size );

        return handle;
    }


    /**
     * キャシュの縮小を試みる
     */
    private _try_reduce_cache(): void
    {
        if ( this._cache_nodes.size <= NUM_NODES_ALLOWABLE ) {
            // ノードが十分少ないので何もしない
            return;
        }

        if ( this._cache_nodes.size <= NODE_CACHE_REDUCE_UPPER * this._num_nodes_referenced ) {
            // ノードが参照数に対して、それほど多くないので縮小しない
            return;
        }

        cfa_assert( this._num_nodes_referenced <= this._cache_nodes.size );
        cfa_assert( NUM_NODES_ALLOWABLE < this._cache_nodes.size );
        cfa_assert( NODE_CACHE_REDUCE_UPPER * this._num_nodes_referenced < this._cache_nodes.size );
        cfa_assert( this._num_nodes_referenced <= NODE_CACHE_REDUCE_UPPER * this._num_nodes_referenced );
        cfa_assert( this._num_nodes_referenced <= NODE_CACHE_REDUCE_LOWER * this._num_nodes_referenced );

        // つまり以下が成り立っている
        //   _num_nodes_referenced <= (NODE_CACHE_REDUCE_LOWER * _num_nodes_referenced) <=
        //   (NODE_CACHE_REDUCE_UPPER * _num_nodes_referenced) <  _cache_nodes.size

        // 以下が同時に成り立つ必要がある
        //   _num_nodes_referenced <= N <= _cache_nodes.size
        //   NUM_NODES_ALLOWABLE <= N

        // 残すノード数
        const num_nodes_leave = Math.max( Math.round( NODE_CACHE_REDUCE_LOWER * this._num_nodes_referenced ),
                                          NUM_NODES_ALLOWABLE );

        cfa_assert( this._num_nodes_referenced <= num_nodes_leave && num_nodes_leave <= this._cache_nodes.size );

        // 参照されていないノード (削除候補) を集める
        const unreferenced_nodes: CacheNode[] = [];

        for ( const node of this._cache_nodes.values() ) {
            if ( node.ref_count === 0 ) {
                // 参照されていないノードを追加
                unreferenced_nodes.push( node );
            }
        }

        cfa_assert( unreferenced_nodes.length == this._cache_nodes.size - this._num_nodes_referenced );

        // 削除するノード数
        const num_nodes_remove = this._cache_nodes.size - num_nodes_leave;
        cfa_assert( num_nodes_remove <= unreferenced_nodes.length );

        // 参照されなくなった時刻が古いものから順に並べる
        unreferenced_nodes.sort( ( a, b ) => a.unreferenced_time - b.unreferenced_time );
        unreferenced_nodes.length = num_nodes_remove;

        // キャッシュからノードを削除
        for ( const node of unreferenced_nodes ) {
            const key = make_node_key( node.text, node.style );
            cfa_assert( this._cache_nodes.has( key ) );
            this._cache_nodes.delete( key );
        }

        cfa_assert( this._cache_nodes.size === num_nodes_leave );
    }


    /**
     * キャンバスのコンテキストを生成
     *
     * 事前に以下のプロパティを設定すること。
     *
     * - [[_canvas_width]]
     * - [[_canvas_height]]
     *
     * 以下のコンテキストのプロパティが変更され、以後これらは変更
     * されないことを想定している。
     *
     * - `textAlign`
     * - `textBaseline`
     * - `fillStyle`
     */
    private _create_canvas_context(): CanvasRenderingContext2D
    {
        const canvas = document.createElement( "canvas" );

        canvas.width  = this._canvas_width;
        canvas.height = this._canvas_height;

        const context = canvas.getContext( "2d", {
            // 頻繁に getImageData() を呼び出すヒント
            willReadFrequently: true,
        } as CanvasRenderingContext2DSettings );  // TODO: TypeScript 4.4 以上なら as を外す

        if ( !context ) {
            throw new Error( "Cannot get context of canvas" );
        }

        context.textAlign    = "left";
        context.textBaseline = "top";
        context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";

        return context;
    }


    /**
     * SDF テクスチャを生成
     *
     * `node` は `sdf_texture` を除くプロパティが設定されていること。
     *
     * @internal
     *
     * `CacheNode` から呼び出される。
     */
    _create_sdf_texture( node: CacheNode ): WebGLTexture
    {
        const      gl = this.glenv.context;
        const  target = gl.TEXTURE_2D;
        const texture = gl.createTexture();

        if ( texture === null ) {
            throw new Error( "Failed to create texture" );
        }

        gl.bindTexture( target, texture );

        // UNPACK_FLIP_Y_WEBGL, TEXTURE_WRAP_ は不要
        this._create_sdfield_image( node, ( array, width, height ) => {
            gl.texImage2D( target, 0, gl.LUMINANCE, width, height, 0,
                           gl.LUMINANCE, gl.UNSIGNED_BYTE, array );
        } );

        gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

        gl.bindTexture( target, null );

        return texture;
    }


    /**
     * テキストを描画するための画像データを生成する。
     *
     * 画像データの画素値は最小距離である。
     *
     * 1 行のバイト数は 4 バイトアラインされている。
     *
     * @param node    - シンボルの元画像のデータ
     * @param consume - 画像を消費する関数
     */
    private _create_sdfield_image( node: CacheNode,
                                   consume: ( array: Uint8Array,
                                              width: number,
                                              height: number ) => void ): void
    {
        const sdf_ext    = Math.ceil( node.sdf_max_width + 0.5 );
        const sdf_width  = node.canvas_width  + 2 * sdf_ext;
        const sdf_height = node.canvas_height + 2 * sdf_ext;
        const sdf_pitch  = 4 * Math.ceil( sdf_width / 4 );

        if ( sdf_width > MAX_SDF_WIDTH || sdf_height > MAX_SDF_HEIGHT ) {
            throw new Error( "Symbol image is too large" );
        }

        if ( !sdfield_module ) {
            // TODO
            const empty = new Uint8Array( sdf_pitch * sdf_height );
            empty.fill( 255 );
            consume( empty, sdf_width, sdf_height );
            console.warn( "no sdfield_module!" );
            return;
        }

        const cov_width  = node.canvas_width;
        const cov_height = node.canvas_height;

        const conv = sdfield_module._converter_create( cov_width, cov_height, sdf_ext );
        try {
            // 被覆率画像を sdfield_module に渡す
            const num_cov_pixels = cov_width * cov_height;

            const src_cov_data = this._get_text_image_data( node ).data;
            let src_cov_pos = 3;  // A 要素の位置
            let dst_cov_pos = sdfield_module._converter_get_write_position( conv ) as number;

            const dst_cov_data = sdfield_module.HEAPU8 as Uint8Array;
            for ( let i = 0; i < num_cov_pixels; ++i ) {
                dst_cov_data[dst_cov_pos] = src_cov_data[src_cov_pos];
                src_cov_pos += 4;
                dst_cov_pos += 1;
            }

            // SDF を生成して、それを消費させる
            const sdf_pos  = sdfield_module._converter_build_sdf( conv ) as number;
            const sdf_data = sdfield_module.HEAPU8 as Uint8Array;
            consume( new Uint8Array( sdf_data.buffer, sdf_pos, sdf_pitch * sdf_height ),
                     sdf_width, sdf_height );
        }
        finally {
            sdfield_module._converter_destroy( conv );
        }
    }


    /**
     * 十分なサイズのキャンバスを用意する
     *
     * TODO: タイミングを見てキャンバスを縮小する処理も必要
     */
    private _ensure_canvas_info( node: CacheNode ): void
    {
        const canvas_width  = Math.max( node.canvas_width,  this._canvas_width  );
        const canvas_height = Math.max( node.canvas_height, this._canvas_height );

        if ( canvas_width  > this._canvas_width ||
             canvas_height > this._canvas_height ) {
            // キャンバスのサイズを更新
            this._canvas_width   = canvas_width;
            this._canvas_height  = canvas_height;
            this._canvas_context = this._create_canvas_context();
        }
    }


    /**
     * キャンバスにテキストを描画して、その画像データを取得
     */
    private _get_text_image_data( node: CacheNode ): ImageData
    {
        this._ensure_canvas_info( node );

        const ctx = this._canvas_context;

        // テキスト部分の背景を消去
        ctx.clearRect( 0, 0, node.canvas_width, node.canvas_height );

        // テキストを描画
        ctx.font = node.style;
        ctx.fillText( node.text, node.bbox_L, node.bbox_A );

        return ctx.getImageData( 0, 0, node.canvas_width, node.canvas_height );
    }


    /**
     * `node` が参照されなくなったときに呼び出される
     *
     * @internal
     */
    __make_unreferenced( node: CacheNode ): void
    {
        cfa_assert( node.ref_count == 0 );

        // 参照が無くなった時刻を記録
        node.unreferenced_time = this._num_nodes_created;

        // 全体のノードの参照数が減少
        --this._num_nodes_referenced;
    }

}


/**
 * キャッシュノード辞書用のキーを生成
 */
function make_node_key( text:  string,
                        style: string ): string
{
    // text, style の異なる組み合わせは、必ず異なる文字列にする
    return `${style} ~~~ ${text}`;
}


/**
 * ImageCache インスタンス内で管理されるノード
 *
 * 各パラメータの意味は資料 `vector-tile-style.org` の「テキスト画像の
 * 座標系」を参照のこと。
 */
class CacheNode {

    /**
     * 参照カウンタ
     *
     * `this` を参照している `ImageHandle` インスタンスの個数を表す。
     */
    ref_count: number;


    /**
     * 参照されなくなった時刻
     *
     * 実際にはノード生成ベースの時刻 (ImageCache._num_nodes_created)
     * である。
     */
    unreferenced_time: number;


    /**
     * `this` を保有している `ImageCache` インスタンス
     */
    readonly image_cache: ImageCache;


    /**
     * `sdf_texture` に描画されているテキスト
     */
    readonly text: string;


    /**
     * `sdf_texture` に描画されているフォントスタイル
     */
    readonly style: string;


    /**
     * テキスト画像のテクスチャ (符号付き距離場)
     *
     * 水平画素数: `canvas_width + 2 * ceil( sdf_max_width + 1/2 )`
     *
     * 垂直画素数: `canvas_height + 2 * ceil( sdf_max_width + 1/2 )`
     */
    sdf_texture: WebGLTexture;


    /**
     * `sdf_texture` で描画可能な縁取りの最大幅 (w)
     *
     * 条件: `sdf_max_width >= 0`
     */
    sdf_max_width: number;


    /**
     * テキスト描画キャンバスの水平画素数 (int)
     *
     * `canvas_width == max( ceil( bbox_L + bbox_R ), 1 )`
     *
     * 条件: `canvas_width >= 1`
     */
    readonly canvas_width: number;


    /**
     * テキスト描画キャンバスの垂直画素数 (int)
     *
     * `canvas_height == max( ceil( bbox_A + bbox_D ), 1 )`
     *
     * 条件: `canvas_height >= 1`
     */
    readonly canvas_height: number;


    /**
     * テキストの `TextMetrics.width` プロパティ値
     *
     * 条件: `text_width >= 0`
     */
    readonly text_width: number;


    /**
     * `style` に指定したフォントの px サイズ
     *
     * 条件: `font_size > 0`
     */
    readonly font_size: number;


    /**
     * テキストの `TextMetrics.actualBoundingBoxLeft` プロパティ値
     */
    readonly bbox_L: number;


    /**
     * テキストの `TextMetrics.actualBoundingBoxAscent` プロパティ値
     */
    readonly bbox_A: number;


    /**
     * CacheNode インスタンスを初期化
     *
     * @see [[ImageCache.getHandle]]
     */
    constructor( owner: ImageCache,
                 text: string,
                 style: string,
                 font_size: number,
                 halo_width: number,
                 metrics: TextMetrics )
    {
        cfa_assert( halo_width >= 0 );
        cfa_assert( font_size > 0 );

        this.ref_count = 0;
        this.unreferenced_time = 0;

        this.image_cache = owner;

        this.text  = text;
        this.style = style;

        this.sdf_max_width = halo_width;

        const bbox_L = metrics.actualBoundingBoxLeft;
        const bbox_R = metrics.actualBoundingBoxRight;
        const bbox_A = metrics.actualBoundingBoxAscent;
        const bbox_D = metrics.actualBoundingBoxDescent;

        this.canvas_width  = Math.max( Math.ceil( bbox_L + bbox_R ), 1 );
        this.canvas_height = Math.max( Math.ceil( bbox_A + bbox_D ), 1 );

        this.text_width = metrics.width;
        this.font_size  = font_size;

        this.bbox_L = bbox_L;
        this.bbox_A = bbox_A;

        this.sdf_texture = owner._create_sdf_texture( this );

        cfa_assert( this.is_valid() );
    }


    /**
     * インスタンスの有効性の検査
     */
    is_valid(): boolean
    {
        if ( this.ref_count < 0 ) return false;
        if ( this.sdf_max_width < 0 ) return false;
        if ( this.canvas_width < 1 ) return false;
        if ( this.canvas_height < 1 ) return false;
        if ( this.text_width < 0 ) return false;
        if ( this.font_size <= 0 ) return false;
        if ( !isFinite( this.bbox_L ) ) return false;
        if ( !isFinite( this.bbox_A ) ) return false;

        // すべて合格
        return true;
    }


    /**
     * ハンドルから参照される呼び出される
     */
    add_ref(): void
    {
        ++this.ref_count;
    }


    /**
     * ハンドルから参照されなくなったときに呼び出される
     */
    release(): void
    {
        cfa_assert( this.ref_count >= 1 );

        --this.ref_count;

        if ( this.ref_count == 0 ) {
            // ノード this はどのハンドルからも参照されなくなった
            this.image_cache.__make_unreferenced( this );
        }
    }

}


/**
 * キャッシュされた画像を扱うオブジェクト
 *
 * インスタンスは [[ImageCache.getHandle]] により取得する。
 */
export class ImageHandle {

    /**
     * 画像を保有するノード
     *
     * 1 つの `CacheNode` インスタンスを `ImageHandle` インスタンス間
     * で共有することがある。
     */
    private readonly _cache_node: CacheNode;


    /**
     * テクスチャ上のキャンバス領域に対して、何画素まで拡張して表示
     * するかを示す。
     *
     * 常に `0 <= _disp_ext_size <= _cache_node.sdf_max_width` が
     * 成り立つ。
     */
    private _disp_ext_size: number;


    /**
     * `ImageHandle` インスタンスを初期化
     *
     * @internal
     *
     * [[ImageCache.getHandle]] から呼び出される。
     */
    constructor( node: CacheNode,
                 halo_width: number )
    {
        cfa_assert( halo_width >= 0 );

        this._cache_node    = node;
        this._disp_ext_size = halo_width;

        if ( halo_width > node.sdf_max_width ) {
            // halo_width に対してテクスチャが小さいので、少し余裕のある大きさに拡張
            node.sdf_max_width = Math.max( halo_width, node.sdf_max_width + TEXTURE_EXTENSION_STEP );
            node.sdf_texture   = node.image_cache._create_sdf_texture( node );
            cfa_assert( node.is_valid() );
        }

        // ハンドルが node を参照することを通知
        node.add_ref();

        cfa_assert( this.is_valid() );
    }


    /**
     * インスタンスの有効性の検査
     */
    is_valid(): boolean
    {
        if ( this._disp_ext_size < 0 ) return false;
        if ( this._disp_ext_size > this._cache_node.sdf_max_width ) return false;

        // すべて合格
        return true;
    }


    /**
     * メッシュの再作成を確認
     *
     * `true` を返したときは [[getImageInfo]] で情報を取得してメッ
     * シュを再作成する必要がある。
     *
     * @param halo_width - 現在の `halo_width` プロパティの値
     *
     * @return メッシュを再作成する必要があるとき `true`,
     *         それ以外のとき `false`
     */
    checkRebuild( halo_width: number ): boolean
    {
        halo_width = Math.min( Math.max( halo_width, 0 ), HALO_WIDTH_DISP_LIMIT );

        const node = this._cache_node;

        let rebuild = false;

        if ( halo_width > node.sdf_max_width ) {
            // halo_width に対してテクスチャが小さいので、少し余裕のある大きさに拡張
            node.sdf_max_width = Math.max( halo_width, node.sdf_max_width + TEXTURE_EXTENSION_STEP );
            node.sdf_texture   = node.image_cache._create_sdf_texture( node );
            cfa_assert( node.is_valid() );
            rebuild = true;
        }

        if ( halo_width > this._disp_ext_size ) {
            // halo_width に対して表示が小さいので、少し余裕のある大きさに拡張
            this._disp_ext_size = Math.min( halo_width + DISPLAY_EXTENSION_STEP, node.sdf_max_width );
            rebuild = true;
        }
        else if ( halo_width < this._disp_ext_size - DISPLAY_EXTENSION_STEP ) {
            // halo_width に対して表示が大きすぎるので、そうならない状態に縮小
            this._disp_ext_size = Math.max( this._disp_ext_size - DISPLAY_EXTENSION_STEP, 0 );
            rebuild = true;
        }

        cfa_assert( this.is_valid() );
        return rebuild;
    }


    /**
     * テクスチャを取得
     */
    getTexture(): WebGLTexture
    {
        return this._cache_node.sdf_texture;
    }


    /**
     * シンボル画像の情報を取得
     *
     * [[checkRebuild]] が `false` を返したとき、前回得た情報と変わら
     * ないので、一般的にメッシュを再作成する必要はない。
     */
    getImageInfo(): ImageInfo
    {
        const node = this._cache_node;

        const sdf_ext = Math.ceil( node.sdf_max_width + 0.5 );
        const texture_width  = node.canvas_width  + 2 * sdf_ext;
        const texture_height = node.canvas_height + 2 * sdf_ext;

        const anchor_lower_x = sdf_ext + node.bbox_L;
        const anchor_lower_y = sdf_ext + node.canvas_height - node.bbox_A;

        const disp_ext = this._disp_ext_size;

        return {
            texture_width,
            texture_height,

            display_lower_x: sdf_ext - disp_ext,
            display_lower_y: sdf_ext - disp_ext,
            display_upper_x: texture_width  - sdf_ext + disp_ext,
            display_upper_y: texture_height - sdf_ext + disp_ext,

            anchor_lower_x,
            anchor_lower_y,
            anchor_upper_x: anchor_lower_x + node.text_width,
            anchor_upper_y: anchor_lower_x + node.font_size,
        };
    }


    /**
     * ハンドルを破棄
     *
     * 以降、`this` にアクセスすることはできない。
     */
    dispose(): void
    {
        this._cache_node.release();
    }

}


/**
 * シンボル画像の情報
 *
 * 座標系はテクスチャの左下を原点とする画素単位の座標である。
 */
export interface ImageInfo {

    /**
     * テクスチャ画像の水平方向の画素数
     */
    texture_width: number;


    /**
     * テクスチャ画像の垂直方向の画素数
     */
    texture_height: number;


    /**
     * テクスチャの表示領域の左下の X 座標
     */
    display_lower_x: number;


    /**
     * テクスチャの表示領域の左下の Y 座標
     */
    display_lower_y: number;


    /**
     * テクスチャの表示領域の右上の X 座標
     */
    display_upper_x: number;


    /**
     * テクスチャの表示領域の右上の Y 座標
     */
    display_upper_y: number;


    /**
     * テクスチャのアンカー領域の左下の X 座標
     */
    anchor_lower_x: number;


    /**
     * テクスチャのアンカー領域の左下の Y 座標
     */
    anchor_lower_y: number;


    /**
     * テクスチャのアンカー領域の右下の X 座標
     */
    anchor_upper_x: number;


    /**
     * テクスチャのアンカー領域の右下の Y 座標
     */
    anchor_upper_y: number;

}
