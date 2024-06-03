import ImageProvider from "./ImageProvider";
import EmptyImageProvider from "./EmptyImageProvider";
import TileTexture from "./TileTexture";
import GeoMath, { Vector3 } from "./GeoMath";
import GLEnv from "./GLEnv";
import Dom from "./util/Dom";
import type { PoleInfo } from "./Viewer";
import { GLOBE_BELT_LOWER_Y, GLOBE_BELT_UPPER_Y } from "./Globe";
import { cfa_assert } from "./util/assertion";


/**
 * タイルテクスチャの管理
 *
 * @see [[TileTexture]]
 */
class TileTextureCache {

    /**
     * WebGL 環境
     *
     * @internal
     */
    public readonly glenv: GLEnv;

    /**
     * 通常領域の画像プロバイダ
     *
     * @internal
     */
    private _main_provider: ImageProvider;
    get main_provider() { return this._main_provider; }

    /**
     * 北側極地の画像プロバイダ
     *
     * @remarks
     *
     * 現在は Belt 間でインスタンスを共有する。
     *
     * @internal
     */
    private _npole_provider: ImageProvider
    get npole_provider() { return this._npole_provider; }

    /**
     * 南側極地の画像プロバイダ
     *
     * @remarks
     *
     * 現在は Belt 間でインスタンスを共有する。
     *
     * @internal
     */
    private _spole_provider: ImageProvider
    get spole_provider() { return this._spole_provider; }

    /**
     * Belt の Y 座標の下限
     */
    private _belt_lower_y: number;

    /**
     * Belt の Y 座標の上限
     */
    private _belt_upper_y: number;

    /**
     * すべての [[Belt]] インスタンス
     */
    private readonly _belts: Belt[];


    /**
     * @param glenv    - WebGL 環境
     * @param provider - 地図画像プロバイダ
     * @param options  - 生成オプション
     */
    constructor( glenv: GLEnv,
                 provider: ImageProvider,
                 options?: Option )
    {
        // 極地オプション
        const pole_opts = options?.pole_info;

        this.glenv = glenv;
        this._main_provider  = provider;
        this._npole_provider = new PoleImageProvider( provider, pole_opts?.north_color ?? DEFAULT_NPOLE_COLOR );
        this._spole_provider = new PoleImageProvider( provider, pole_opts?.south_color ?? DEFAULT_SPOLE_COLOR );

        const pole_enabled = pole_opts?.enabled ?? false;
        this._belt_lower_y = pole_enabled ? GLOBE_BELT_LOWER_Y : 0;
        this._belt_upper_y = pole_enabled ? GLOBE_BELT_UPPER_Y : 0;

        this._belts = [];

        for ( let y = this._belt_lower_y; y <= this._belt_upper_y; ++y ) {
            this._belts.push( new Belt( this, y ) );
        }
    }


    /**
     * ImageProviderを切り替える
     *
     * @param provider  地図画像プロバイダ
     * @param pole_info Pole情報
     */
    setProvider( provider: ImageProvider ): void
    {
        if ( this._main_provider !== provider ) {
            this._main_provider = provider;

            // update belts
            for ( let i=0; i<this._belts.length; i++ ) {
                const belt = this._belts[i];
                if ( belt._belt_y === 0 ) {
                    belt.setProvider( this, provider );
                }
            }
        }
    }


    /**
     * Pole を切り替える
     *
     * @param pole_info Pole情報
     */
    setPole( pole_info: PoleInfo ): void
    {
        this._npole_provider = new PoleImageProvider( this._main_provider, pole_info.north_color ?? DEFAULT_NPOLE_COLOR );
        this._spole_provider = new PoleImageProvider( this._main_provider, pole_info.south_color ?? DEFAULT_SPOLE_COLOR );
        const pole_enabled = pole_info.enabled;
        this._belt_lower_y = pole_enabled ? GLOBE_BELT_LOWER_Y : 0;
        this._belt_upper_y = pole_enabled ? GLOBE_BELT_UPPER_Y : 0;

        // update belts
        let main_belt: Belt | undefined = undefined;
        for ( const belt of this._belts ) {
            if ( belt._belt_y === 0 ) {
                main_belt = belt; // keep the main belt
            }
            else {
                belt.dispose();
            }
        }
        cfa_assert( main_belt !== undefined );
        this._belts.splice( 0, this._belts.length );
        for ( let y = this._belt_lower_y; y <= this._belt_upper_y; ++y ) {
            if ( y === 0 ) {
                this._belts.push( main_belt );
            }
            else {
                this._belts.push( new Belt( this, y ) );
            }
        };
    }


    /**
     * 領域 0/0/y に対応する `Belt` インスタンスを取得
     *
     * @param y - y 座標 (整数 [_belt_lower_y, _belt_upper_y])
     */
    private _belt( y: number ): Belt
    {
        cfa_assert( this._belt_lower_y <= y && y <= this._belt_upper_y );

        return this._belts[y - this._belt_lower_y];
    }


    /**
     * すべてのリクエストを取り消し、リソースを破棄する。
     */
    dispose(): void
    {
        for ( const belt of this._belts ) {
            belt.dispose();
        }
    }


    /**
     * LOD からテクスチャの Z レベルを計算するバイアス値を取得
     *
     * @return Log2[2Pi / size]
     */
    getImageZBias(): number
    {
        return this._belt( 0 ).getImageZBias();
    }


    /**
     * @return タイルの Z レベルの最小値
     */
    getImageZMin(): number
    {
        return this._belt( 0 ).getImageZMin();
    }


    /**
     * リクエスト待ちのタイルの個数を取得
     *
     * @return リクエスト待ちのタイルの個数
     */
    getNumWaitingRequests(): number
    {
        let num_requests = 0;

        for ( const belt of this._belts ) {
            num_requests += belt.getNumWaitingRequests();
        }

        return num_requests;
    }


    /**
     * 先祖タイルテクスチャを検索
     *
     * `[x, y, z]` タイルの祖先の中で、現在キャッシュに存在する最大レ
     * ベルのタイルテクスチャを検索し、`hi` に設定する。
     *
     * ただし検索されるタイルのズームレベルが `Z` とすると、
     * `Z <= max( zlimit, this._min_image_z )`
     * という条件から検索し、存在しなければ `null` となる。
     *
     * `hi` より低いレベルにタイルが存在すれば、それを `lo` に設定し、
     * 存在しなければ `lo` に `hi` と同じタイルを設定する。
     *
     * プロバイダにもっと相応しいテクスチャが存在する可能性があれば、
     * そのテクスチャを要求する。
     *
     * 前提: `z >= this._min_image_z && z >= zlimit`
     *
     * @param z      - 地図ズームレベル
     * @param x      - X タイル座標
     * @param y      - Y タイル座標
     * @param zlimit - 先祖レベルの上限
     *
     * @returns 先祖タイルテクスチャ配列 `[hi, lo]`
     */
    findNearestAncestors( z:         number,
                          x:         number,
                          y:         number,
                          zlimit:    number ): [hi: FTile, lo: FTile]
    {
        const z_pot  = Math.round( Math.pow( 2, z ) );  // 2^z の厳密値
        const belt_y = Math.floor( y / z_pot );

        if ( this._belt_lower_y <= belt_y && belt_y <= this._belt_upper_y ) {
            const belt = this._belt( belt_y );
            return belt.findNearestAncestors( z_pot, x, y, zlimit );
        }
        else {
            // Belt が存在しない領域
            return [null, null];
        }
    }


    /**
     * フレームの最後の処理
     */
    endFrame(): void
    {
        for ( const belt of this._belts ) {
            belt.endFrame();
        }
    }

}


const DEFAULT_NPOLE_COLOR = GeoMath.createVector3( [0.8, 0.8, 0.8] );
const DEFAULT_SPOLE_COLOR = GeoMath.createVector3( [0.8, 0.8, 0.8] );


/**
 * 生成オプションの型
 *
 * @see [[TileTextureCache.constructor]]
 */
export interface Option {

    /**
     * 極地情報
     *
     * @defaultValue [[Viewer.PoleOption]] の既定値
     */
    pole_info?: PoleInfo;

}


/**
 * 画像タイルのベルト単位の管理
 *
 * @see [[TileTextureCache]], [[TileTexture]]
 */
class Belt {

    /**
     * @param owner  - 親 TileTextureCache インスタンス
     * @param belt_y - Belt の y 座標 (整数)
     */
    constructor( owner: TileTextureCache,
                 belt_y: number )
    {
        const  glenv = owner.glenv;

        this._belt_y      = belt_y;
        this._glenv       = glenv;
        this._provider    = new EmptyImageProvider();
        this._min_image_z = 0;
        this._max_image_z = 0;
        this._image_zbias = 0;

        // キャッシュを初期化
        this._croot = new CacheNode();

        // キャッシュ制御変数
        this._max_accesses  = 0;  // 最近のフレームの最大アクセスノード数
        this._frame_counter = 0;  // 現行フレーム番号

        this._lower_bound   = 1.0;  // >= 1.0
        this._upper_bound   = 1.2;  // >= lower_bound

        // リクエスト制御変数
        this._num_requesteds = 0;   // 現在の REQUESTED 状態のノード数
        this._max_requesteds = 75;  // 最大 REQUESTED ノード数
        this._new_requesteds = [];  // 新規リクエストのリスト

        // WebGL 関連
        const gl = glenv.context;

        const aniso_ext = glenv.EXT_texture_filter_anisotropic;
        if ( aniso_ext ) {
            this._aniso_ext = aniso_ext;
            this._max_aniso = gl.getParameter( aniso_ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT );
        }
        else {
            this._aniso_ext = null;
            this._max_aniso = 0;
        }
        this._use_mipmap = false;

        this.setProvider( owner, (
                belt_y < 0 ? owner.npole_provider:
                belt_y > 0 ? owner.spole_provider:
                owner.main_provider
        ));
    }


    /**
     * 画像プロバイダを再設定
     *
     * - `_provider`
     * - `_min_image_z`
     * - `_max_image_z`
     * - `_image_zbias`
     */
    private _setProviderInner( provider: ImageProvider ): void
    {
        this._provider = provider;

        const range = provider.getZoomLevelRange();
        this._min_image_z = range.min;
        this._max_image_z = range.max;

        this._image_zbias = GeoMath.maprayLog2( 2 * Math.PI / provider.getImageSize() );

        if ( !( this._provider instanceof EmptyImageProvider ) ) {
            if ( range.min === 0 ) {
                this.findNearestAncestors( 1, 0, 0, 1, 100 );
            }
            else if ( range.min === 1 ) {
                this.findNearestAncestors( 2, 0, 0, 1, 100 );
                this.findNearestAncestors( 2, 0, 1, 1, 100 );
                this.findNearestAncestors( 2, 1, 0, 1, 100 );
                this.findNearestAncestors( 2, 1, 1, 1, 100 );
            }
        }
    }


    /**
     * すべてのリクエストを取り消し、ノードも解放する。
     */
    dispose(): void
    {
        new NodeCanceller( this, this._croot, true );  // リクエストを取り消す
        this._croot = new CacheNode();           // 取り消したノードは使えないので、単純にすべて捨てる
        this._max_accesses = 0;
        cfa_assert( this._num_requesteds === 0 );
    }


    /**
     * ImageProviderを切り替える
     * @param owner    TileTextureCache
     * @param provider ImageProvider
     */
    setProvider( owner: TileTextureCache, provider: ImageProvider ): void
    {
        const status_callback: ImageProvider.StatusCallback = ( status ) => {
            if ( status === ImageProvider.Status.READY ) {
                // EmptyImageProvider から本来の provider に切り替える
                this._setProviderInner( provider );
            }
            else if ( status === ImageProvider.Status.FAILED ) {
                // provider が READY 状態にならなかった
                console.error( "ImageProvider.Status.FAILED in TileTextureCache" );
            }
        };

        new NodeReplacer( this, this._croot );
        const is_provider_ready = (provider.status( status_callback ) === ImageProvider.Status.READY);
        this._setProviderInner( is_provider_ready ? provider : new EmptyImageProvider() );
    }


    /**
     * LOD からテクスチャの Z レベルを計算するバイアス値を取得
     *
     * @return Log2[2Pi / size]
     */
    getImageZBias(): number
    {
        return this._image_zbias;
    }


    /**
     * @return タイルの Z レベルの最小値
     */
    getImageZMin(): number
    {
        return this._min_image_z;
    }


    /**
     * リクエスト待ちのタイルの個数を取得
     *
     * @return リクエスト待ちのタイルの個数
     */
    getNumWaitingRequests(): number
    {
        return this._num_requesteds;
    }


    /**
     * 先祖タイルテクスチャを検索
     *
     * 基本的に [[TileTextureCache.findNearestAncestors]] と同じ仕様で
     * ある。
     *
     * ただしズームレベル `z` の代わりに 2 の `z` 乗である `z_pot` が
     * 使われる。
     *
     * `z_pot` は近似値ではなく厳密値でなければならない。厳密値は
     * `Math.round( Math.pow( 2, z ) )` のように求めることができる。
     *
     * @param z_pot     - 2^z (注意: 厳密値)
     * @param x         - X タイル座標
     * @param y         - Y タイル座標
     * @param zlimit    - 先祖レベルの上限
     * @param req_power - `node.req_power`
     *
     * @returns 先祖タイルテクスチャ配列 `[hi, lo]`
     */
    findNearestAncestors( z_pot:     number,
                          x:         number,
                          y:         number,
                          zlimit:    number,
                          req_power: number = -1 ): [hi: FTile, lo: FTile]
    {
        let   depth = 0;
        const d_min = this._min_image_z;

        let xo = 0;  // 現行領域の左上の X 座標 (座標はレベル z 基準)
        let yo = Math.floor( y / z_pot ) * z_pot;  // 上記の Y 座標版
        let csize = z_pot / 2;  // 子領域の寸法 (寸法はレベル z 基準)
        let scale = 1 / z_pot;  // 現行領域の XY 座標を計算するための倍率

        let node = this._croot;

        // 最小レベルのノード  --->  node, depth
        for ( ; depth < d_min; ++depth ) {
            const u = (x < xo + csize) ? 0 : 1;
            const v = (y < yo + csize) ? 0 : 1;
            const index = u + 2*v;

            const children = node.children;
            let      child = children[index];
            if ( child === null ) {
                child = new CacheNode();
                children[index] = child;
            }

            xo += u * csize;
            yo += v * csize;
            csize /= 2;
            scale *= 2;
            node = child;
        }

        const d_max = this._max_image_z;
        const  d_lo = GeoMath.clamp( zlimit - 1, d_min, d_max );
        const  d_hi = GeoMath.clamp( zlimit,     d_min, d_max );
        let  tex_lo: CacheNode | null = null;
        let  tex_hi: CacheNode | null = null;

        if ( d_lo < d_hi ) {
            cfa_assert( (d_min < d_max) && (d_min < zlimit && zlimit <= d_max) );

            for ( ; depth <= d_lo; ++depth ) {
                if ( node.data ) {
                    // 候補テクスチャを更新
                    tex_lo = node;
                }

                if ( node.state === NodeState.NEED_REQUEST ) {
                    // 新規リクエスト
                    node.state     = NodeState.REQUESTED;
                    node.req_power = req_power !== -1 ? req_power : zlimit - depth;
                    this._new_requesteds.push( [node, depth, Math.floor( x * scale ), Math.floor( y * scale )] );
                }
                else if ( node.state === NodeState.REQUESTED ) {
                    // 要求度を更新
                    node.updateRequestPower( zlimit - depth );
                }

                const u = (x < xo + csize) ? 0 : 1;
                const v = (y < yo + csize) ? 0 : 1;
                const index = u + 2*v;

                const children = node.children;
                let      child = children[index];
                if ( child === null ) {
                    child = new CacheNode();
                    children[index] = child;
                }

                xo += u * csize;
                yo += v * csize;
                csize /= 2;
                scale *= 2;
                node = child;
            }

            tex_hi = tex_lo;

            if ( node.data ) {
                // 候補テクスチャを更新
                tex_hi = node;
            }

            if ( node.state === NodeState.NEED_REQUEST ) {
                // 新規リクエスト
                node.state     = NodeState.REQUESTED;
                node.req_power = req_power !== -1 ? req_power : zlimit - depth;
                this._new_requesteds.push( [node, depth, Math.floor( x * scale ), Math.floor( y * scale )] );
            }
            else if ( node.state === NodeState.REQUESTED ) {
                // 要求度を更新
                node.updateRequestPower( zlimit - depth );
            }
        }
        else {
            cfa_assert( d_lo === d_hi );
            cfa_assert( (d_min === d_max) || (zlimit <= d_min) || (zlimit > d_max) );

            for ( ;; ++depth ) {
                if ( node.data ) {
                    // 候補テクスチャを更新
                    tex_lo = node;
                }

                if ( node.state === NodeState.NEED_REQUEST ) {
                    // 新規リクエスト
                    node.state     = NodeState.REQUESTED;
                    node.req_power = req_power !== -1 ? req_power : zlimit - depth;
                    this._new_requesteds.push( [node, depth, Math.floor( x * scale ), Math.floor( y * scale )] );
                }
                else if ( node.state === NodeState.REQUESTED ) {
                    // 要求度を更新
                    node.updateRequestPower( zlimit - depth );
                }

                if ( depth == d_lo ) {
                    tex_hi = tex_lo;
                    break;
                }

                const u = (x < xo + csize) ? 0 : 1;
                const v = (y < yo + csize) ? 0 : 1;
                const index = u + 2*v;

                const children = node.children;
                let      child = children[index];
                if ( child === null ) {
                    child = new CacheNode();
                    children[index] = child;
                }

                xo += u * csize;
                yo += v * csize;
                csize /= 2;
                scale *= 2;
                node = child;
            }

            cfa_assert( tex_hi === tex_lo );
        }

        node.touch();

        const result = Belt._findNearestAncestors_result;

        cfa_assert( tex_hi === null || (tex_hi.data instanceof TileTexture) );
        cfa_assert( tex_lo === null || (tex_lo.data instanceof TileTexture) );

        // @ts-ignore - CFA で判断できない?
        result[0] = (tex_hi !== null) ? tex_hi.data : null;
        // @ts-ignore
        result[1] = (tex_lo !== null) ? tex_lo.data : null;

        return result;
    }


    /**
     * フレームの最後の処理
     */
    endFrame(): void
    {
        this._performNewRequests();

        const counter = new NodeCounter( this._croot, this._frame_counter );
        this._max_accesses = Math.max( counter.num_accesses, this._max_accesses );

        if ( counter.num_loadeds > this._upper_bound * this._max_accesses ) {
            var num_nodes = Math.floor( this._lower_bound * this._max_accesses );
            this._reduceCache( num_nodes );
        }

        ++this._frame_counter;
    }


    /**
     * 新規リクエストを実行
     */
    private _performNewRequests(): void
    {
        // リクエスト数
        const num_requests = Math.min( this._max_requesteds - this._num_requesteds, this._new_requesteds.length );

        // 基準に基づき、新規リクエストを前半 (num_requests 個) と後半に分割
        this._new_requesteds.sort( function( a, b ) {
            const anode = a[0];
            const bnode = b[0];
            return bnode.req_power - anode.req_power;
        } );

        // リクエストを実行
        var self = this;
        this._new_requesteds.slice( 0, num_requests ).forEach( function( req ) {
            const [node, z, x, y] = req;
            self._requestTileTexture( z, x, y, node );
        } );

        // リクエストしなかったノードを空に戻す
        this._new_requesteds.slice( num_requests ).forEach( function( req ) {
            const node = req[0];
            node.state = NodeState.NEED_REQUEST;
        } );

        // 新規リクエストのリストをクリア
        this._new_requesteds.length = 0;
    }


    /**
     * タイルテクスチャを要求
     *
     * @param z - 地図ズームレベル
     * @param x - X タイル座標
     * @param y - Y タイル座標
     * @param node - 対象ノード
     */
    private _requestTileTexture( z: number,
                                 x: number,
                                 y: number,
                                 node: CacheNode ): void
    {
        const request_id = this._provider.requestTile( z, x, y, image => {

            if ( node.state !== NodeState.REQUESTED ) {
                return;
            }

            if ( request_id !== node.request_id ) {
                return;
            }

            if ( image ) {
                if ( node.data ) {
                    node.data.dispose( this._glenv.context );
                }
                node.data  = new TileTexture( z, x, y, this._createTexture( image ) );
                node.state = NodeState.LOADED;
            }
            else {
                node.data  = null;
                node.state = NodeState.FAILED;
            }
            --this._num_requesteds;

        } );

        node.request_id = request_id;

        ++this._num_requesteds;
    }


    /**
     * タイルテクスチャの要求を取り消す
     *
     * @internal
     */
    cancelTileTexture( id: unknown ): void
    {
        this._provider.cancelRequest( id );
        --this._num_requesteds;
    }


    /**
     * テクスチャを生成
     *
     * WebGL ステートの変更
     *
     * - `TEXTURE_2D_BINDING`  -> `null`
     * - `UNPACK_FLIP_Y_WEBGL` -> `false`
     *
     * @param image - 元画像
     *
     * @return 生成されたテクスチャ
     */
    private _createTexture( image: TexImageSource ): WebGLTexture
    {
        const        gl = this._glenv.context;
        const aniso_ext = this._aniso_ext;

        const  target = gl.TEXTURE_2D;
        const texture = gl.createTexture();

        if ( texture === null ) {
            throw new Error( "failed to gl.createTexture()" );
        }

        gl.bindTexture( target, texture );

        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
        gl.texImage2D( target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );

        if ( this._use_mipmap ) {
            gl.generateMipmap( target );
        }

        gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, this._use_mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR );
        gl.texParameteri( target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

        if ( aniso_ext ) {
            gl.texParameterf( gl.TEXTURE_2D, aniso_ext.TEXTURE_MAX_ANISOTROPY_EXT, this._max_aniso );
        }

        gl.bindTexture( target, null );

        return texture;
    }


    /**
     * キャッシュを削減
     *
     * @param num_cnodes - 目標ノード数
     */
    private _reduceCache( num_nodes: number ): void
    {
        const collector = new NodeCollector( this._croot );

        // 基準に基づき、ノードを前半 (num_cnodes 個) と後半に分割
        collector.nodes.sort( ( a, b ) => {
            cfa_assert( typeof a.aframe === 'number' && typeof b.aframe === 'number' );
            const aframe = b.aframe - a.aframe;
            if ( aframe == 0 ) {
                if ( (a.state === NodeState.LOADED) && (b.state === NodeState.LOADED) ) {
                    cfa_assert( a.data instanceof TileTexture && b.data instanceof TileTexture );
                    return a.data.z - b.data.z;
                }
            }
            return aframe;
        } );


        // 後半のノードを削除
        const gl = this._glenv.context;

        const min_level = this._provider.getZoomLevelRange().min;
        const force_keep_level = (min_level <= 1) ? min_level : -1;

        collector.nodes.slice( num_nodes ).forEach( node => {
            if ( node.data ) {
                if ( node.data.z === force_keep_level ) {
                    return;
                }
                node.data.dispose( gl );
            }
            node.state = NodeState.NEED_REQUEST;
            node.data  = null;
        } );

        // NodeState.NEED_REQUEST の葉ノードを消去
        collector.clean();
    }


    public readonly _glenv: GLEnv;

    public readonly _belt_y: number;

    private _provider: ImageProvider;
    private _min_image_z: number;
    private _max_image_z: number;
    private _image_zbias: number;

    private _croot: CacheNode;
    private _max_accesses: number;

    private _frame_counter: number;
    private readonly _lower_bound: number;
    private readonly _upper_bound: number;
    private          _num_requesteds: number;
    private readonly _max_requesteds: number;
    private readonly _new_requesteds: NewRequest[];

    private readonly _aniso_ext: EXT_texture_filter_anisotropic | null;
    private readonly _max_aniso: number;
    private readonly _use_mipmap: boolean;


    private static readonly _findNearestAncestors_result: [hi: FTile, lo: FTile] = [null, null];

}


/**
 * タイルの検索結果の要素
 */
type FTile = TileTexture | null;


/**
 * [[TileTextureCache._new_requesteds]] の要素の型
 */
type NewRequest = [node: CacheNode, z: number, x: number, y: number];


/**
 * キャッシュノード
 */
class CacheNode {

    /** 子ノード */
    readonly children: [
        CacheNode | null,
        CacheNode | null,
        CacheNode | null,
        CacheNode | null,
    ];


    /** ノード状態 */
    state: NodeState;


    /**
     * TileTexture オブジェクト、または取り消しオブジェクト
     */
    data: TileTexture | null;


    /** リクエストID */
    request_id: unknown;


    /** 要求度 */
    req_power: number;


    /**
     * 最終アクセスフレーム
     *
     * アクセスしたときに `true` マークを付ける。
     * その後に実際の時刻に更新する。
     */
    aframe: number | true;


    constructor()
    {
        this.children  = [null, null, null, null];
        this.state     = NodeState.NEED_REQUEST;
        this.data      = null;  // TileTexture オブジェクト、または取り消しオブジェクト
        this.req_power = -1;    // 要求度
        this.aframe    = -1;    // 最終アクセスフレーム
        this.request_id = null;
    }

    /**
     * 要求度を更新
     */
    updateRequestPower( req_power: number )
    {
        if ( req_power > this.req_power ) {
            this.req_power = req_power;
        }
    }

    /**
     * このタイルにアクセスしたことにする
     */
    touch()
    {
        this.aframe = true;
    }

}


/**
 * ノード数の計上
 *
 * アクセスがあったノードに対して `aframe` を更新する。
 */
class NodeCounter {

    /**
     * ロードされているタイル数
     */
    num_loadeds:  number;

    /**
     * ロードされているタイルのうち、アクセスされたタイル数
     */
    num_accesses: number;


    /**
     * @param root  - 最上位ノード
     * @param frame - 現在のフレーム
     */
    constructor( root: CacheNode,
                 frame: number )
    {
        this.num_loadeds  = 0;
        this.num_accesses = 0;
        this._frame       = frame;
        this._traverse( root );
    }


    /**
     * トラバース処理
     */
    private _traverse( node: CacheNode ): boolean
    {
        const children = node.children;
        let isAccessed = (node.aframe === true);

        for ( let i = 0; i < 4; ++i ) {
            const child = children[i];
            if ( child !== null ) {
                isAccessed = this._traverse( child ) || isAccessed;
            }
        }

        if ( node.state === NodeState.LOADED ) {
            ++this.num_loadeds;
            if ( isAccessed ) {
                ++this.num_accesses;
            }
        }

        if ( isAccessed ) {
            // アクセスフレームを更新
            node.aframe = this._frame;
        }

        return isAccessed;
    }


    private readonly _frame: number;

}


/**
 * ノード収集
 *
 * `NodeState.LOADED` または `NodeState.FAILED` のノードを
 * `this.nodes` に収集する。
 */
class NodeCollector {

    readonly nodes: CacheNode[];

    /**
     * @param root - 最上位ノード
     */
    constructor( root: CacheNode )
    {
        this._root = root;
        this.nodes = [];
        this._traverse( root );
    }

    private _traverse( node: CacheNode ): void
    {
        const state = node.state;
        if ( state === NodeState.LOADED || state === NodeState.FAILED ) {
            // LOADED または FAILED なら追加
            this.nodes.push( node );
        }

        const children = node.children;
        for ( let i = 0; i < 4; ++i ) {
            const child = children[i];
            if ( child !== null ) {
                this._traverse( child );
            }
        }
    }

    /**
     * `NodeState.NEED_REQUEST` の葉ノードを消去
     */
    clean(): void
    {
        this._clean_recur( this._root );
    }

    /**
     * @return 自己と子孫がすべて `NodeState.NEED_REQUEST` のとき `true`,
     *         それ以外のとき `false`
     */
    private _clean_recur( node: CacheNode ): boolean
    {
        let isNodeNone = (node.state === NodeState.NEED_REQUEST);

        const children = node.children;
        for ( let i = 0; i < 4; ++i ) {
            const child = children[i];
            if ( child !== null ) {
                const isChildNone = this._clean_recur( child );
                if ( isChildNone === true ) {
                    children[i] = null;
                }
                isNodeNone = isChildNone && isNodeNone;
            }
        }

        return isNodeNone;
    }

    private _root: CacheNode;

}


/**
 * すべてのリクエストを取り消す
 */
class NodeCanceller {

    /**
     * @param owner   - 管理者
     * @param root    - 最上位ノード
     * @param dispose - リソースを破棄する
     */
    constructor( owner: Belt, root: CacheNode, dispose: boolean = false )
    {
        this._belt = owner;
        this._dispose = dispose;
        this._traverse( root );
    }

    private _traverse( node: CacheNode ): void
    {
        const children = node.children;
        for ( let i = 0; i < 4; ++i ) {
            const child = children[i];
            if ( child !== null ) {
                this._traverse( child );
            }
        }
        if ( this._dispose ) {
            if ( node.state === NodeState.REQUESTED ) {
                this._belt.cancelTileTexture( node.request_id );
            }
            if ( node.data ) {
                node.data.dispose( this._belt._glenv.context );
                node.data = null;
            }
            node.state = NodeState.NEED_REQUEST;
        }
        else {
            if ( node.state === NodeState.REQUESTED ) {
                node.state = NodeState.NEED_REQUEST;
                this._belt.cancelTileTexture( node.request_id );
            }
        }
    }

    private readonly _belt: Belt;
    private readonly _dispose: boolean;
}


/**
 * すべてのリクエストを取り消し、新たに再リクエストするように設定する。
 * ただし、読み込み済みのリソースはそのまま保持し続ける
 */
class NodeReplacer {

    /**
     * @param owner - 管理者
     * @param root  - 最上位ノード
     */
    constructor( owner: Belt,
                 root: CacheNode )
    {
        this._belt = owner;
        this._traverse( root );
    }

    private _traverse( node: CacheNode ): void
    {
        const children = node.children;
        for ( let i = 0; i < 4; ++i ) {
            const child = children[i];
            if ( child !== null ) {
                this._traverse( child );
            }
        }

        if ( node.state === NodeState.REQUESTED ) {
            this._belt.cancelTileTexture( node.request_id );
        }

        node.state = NodeState.NEED_REQUEST;
    }

    private readonly _belt: Belt;
}


/**
 * ノード状態の列挙型
 */
const enum NodeState {
    //       .---------------------------------.
    //       v                                 |
    // NEED_REQUEST --> REQUESTED --> LOADED --'
    //                      |
    //                      '-------> FAILED

    /**
     * タイルを取得する必要があることを示す
     * 既にタイルが存在するが、再取得する必要がある場合もこの状態となる。
     */
    NEED_REQUEST = "@@_NEED_REQUEST",

    /**
     * タイルが存在する
     */
    LOADED = "@@_LOADED",

    /**
     * タイルをリクエスト中
     */
    REQUESTED = "@@_REQUESTED",

    /**
     * タイルのリクエストに失敗
     */
    FAILED = "@@_FAILED",

};


/**
 * 非中心ベルト用のデフォルトの画像プロバイダー
 *
 * 中心ベルト以外のベルトの画像プロバイダーは、以下の要件を満たさなけ
 * ればならない。中心ベルトの画像プロバイダーを `center` とする。
 *
 * - `getImageSize` が返す値は `center` と同じ
 * - `getZoomLevelRange` が返す値の `min` プロパティは `center` と同じ
 * - `requestTile` の `y` 引数に、そのベルトの範囲の座標を受け入れる
 */
class PoleImageProvider extends ImageProvider<void> {

    /**
     * @param center - 参照する画像プロバイダ
     * @param color  - 地表の色
     */
    constructor( center: ImageProvider,
                 color:  Vector3 )
    {
        super();

        const ccolor = GeoMath.copyVector3( color, GeoMath.createVector3() );

        // ステータス管理
        this._status = ImageProvider.Status.NOT_READY;
        this._status_callbacks = [];

        // 準備ができるまでのダミー値で初期化
        this._size  = 0;
        this._level = -1;
        this._image = PoleImageProvider._createImage( 1, ccolor );

        // center の準備ができたときに実行する処理
        const status_callback: ImageProvider.StatusCallback = ( status ) => {
            if ( status === ImageProvider.Status.READY ) {
                this._size  = center.getImageSize();
                this._level = center.getZoomLevelRange().min;
                this._image = PoleImageProvider._createImage( this._size, ccolor );
            }
            else if ( status === ImageProvider.Status.FAILED ) {
                // this が READY 状態にならなかった
                console.error( "ImageProvider.Status.FAILED in PoleImageProvider" );
            }
            this._status = status;
            // this に登録されたコールバックの処理
            for ( const callback of this._status_callbacks ) {
                callback( status );
            }
            this._status_callbacks.length = 0;  // すべて実行したのでクリア
        };

        if  ( center.status( status_callback ) === ImageProvider.Status.READY ) {
            // center はすでに READY だったので自分でコールバックを処理を呼び出す
            Promise.resolve()
                .then( () => {
                    status_callback( ImageProvider.Status.READY );
                } );
        }
    }

    // from ImageProvider
    override status( callback?: ImageProvider.StatusCallback ): ImageProvider.Status
    {
        if ( (this._status === ImageProvider.Status.NOT_READY) && (callback !== undefined) ) {
            // 後で実行するコールバックを登録
            this._status_callbacks.push( callback );
        }

        return this._status;
    }

    // from ImageProvider
    override requestTile( _z: number,
                          _x: number,
                          _y: number,
                          callback: ImageProvider.RequestCallback ): void
    {
        cfa_assert( this._status === ImageProvider.Status.READY );

        // callback を非同期呼び出し
        Promise.resolve()
            .then( () => {
                callback( this._image );
            } );
    }

    // from ImageProvider
    override cancelRequest(): void
    {
        // 取り消し処理はない
    }

    // from ImageProvider
    override getImageSize(): number
    {
        cfa_assert( this._status === ImageProvider.Status.READY );
        return this._size;
    }

    // from ImageProvider
    override getZoomLevelRange(): ImageProvider.Range
    {
        cfa_assert( this._status === ImageProvider.Status.READY );
        return new ImageProvider.Range( this._level, this._level );
    }

    /**
     * 単色画像を作成
     */
    private static _createImage( size: number,
                                 color: Vector3 ): HTMLCanvasElement
    {
        const conv = PoleImageProvider._convertColorToRGB;

        const ctx = Dom.createCanvasContext( size, size );

        ctx.fillStyle = `rgb(${conv(color[0])},${conv(color[1])},${conv(color[2])})`;
        ctx.fillRect( 0, 0, size, size );

        return ctx.canvas;
    }

    private static _convertColorToRGB( value: number ): number
    {
        return Math.round( 255 * value );
    }


    private _status: ImageProvider.Status;
    private readonly _status_callbacks: ImageProvider.StatusCallback[];

    private _size: number;
    private _level: number;
    private _image: HTMLCanvasElement;

}


export default TileTextureCache;
