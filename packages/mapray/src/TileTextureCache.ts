import ImageProvider from "./ImageProvider";
import EmptyImageProvider from "./EmptyImageProvider";
import TileTexture from "./TileTexture";
import GeoMath from "./GeoMath";
import GLEnv from "./GLEnv";
import { cfa_assert } from "./util/assertion";


/**
 * タイルテクスチャの管理
 *
 * @see [[TileTexture]]
 */
class TileTextureCache {

    /**
     * @param glenv    - WebGL 環境
     * @param provider - 地図画像プロバイダ
     */
    constructor( glenv: GLEnv,
                 provider: ImageProvider )
    {
        this._glenv       = glenv;
        this._provider    = new EmptyImageProvider();
        this._min_image_z = 0;
        this._max_image_z = 0;
        this._image_zbias = 0;

        const status_callback: ImageProvider.StatusCallback = ( status ) => {
            if ( status === ImageProvider.Status.READY ) {
                // EmptyImageProvider から本来の provider に切り替える
                this._flush();
                this._resetImageProvider( provider );
            }
            else if ( status === ImageProvider.Status.FAILED ) {
                // provider が READY 状態にならなかった
                console.error( "ImageProvider.Status.FAILED in TileTextureCache" );
            }
        };

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

        this._resetImageProvider( (provider.status( status_callback ) === ImageProvider.Status.READY) ? provider : new EmptyImageProvider() );
    }


    /**
     * 画像プロバイダを再設定
     *
     * - `_provider`
     * - `_min_image_z`
     * - `_max_image_z`
     * - `_image_zbias`
     */
    private _resetImageProvider( provider: ImageProvider ): void
    {
        this._provider = provider;

        const range = provider.getZoomLevelRange();
        this._min_image_z = range.min;
        this._max_image_z = range.max;

        this._image_zbias = GeoMath.maprayLog2( 2 * Math.PI / provider.getImageSize() );

        if ( !( this._provider instanceof EmptyImageProvider ) ) {
            if ( range.min === 0 ) {
                this.findNearestAncestors( 0, 0, 0, 1, 100 );
            }
            else if ( range.min === 1 ) {
                this.findNearestAncestors( 1, 0, 0, 1, 100 );
                this.findNearestAncestors( 1, 0, 1, 1, 100 );
                this.findNearestAncestors( 1, 1, 0, 1, 100 );
                this.findNearestAncestors( 1, 1, 1, 1, 100 );
            }
        }
    }


    /**
     * すべてのリクエストを取り消す
     */
    cancel(): void
    {
        this._flush();
    }


    /**
     * キャッシュをフラッシュ
     */
    private _flush(): void
    {
        new NodeCanceller( this, this._croot );  // リクエストを取り消す
        this._croot = new CacheNode();           // 取り消したノードは使えないので、単純にすべて捨てる
        this._max_accesses = 0;
        cfa_assert( this._num_requesteds === 0 );
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
     * @param z         - 地図ズームレベル
     * @param x         - X タイル座標
     * @param y         - Y タイル座標
     * @param zlimit    - 先祖レベルの上限
     * @param req_power - `node.req_power`
     *
     * @returns 先祖タイルテクスチャ配列 `[hi, lo]`
     */
    findNearestAncestors( z:         number,
                          x:         number,
                          y:         number,
                          zlimit:    number,
                          req_power: number = -1 ): [hi: FTile, lo: FTile]
    {
        let   depth = 0;
        const d_min = this._min_image_z;

        const pow = Math.pow( 2, 1 - z );
        let    xf = (x + 0.5) * pow;
        let    yf = (y + 0.5) * pow;
        let  node = this._croot;

        let u: number;
        let v: number;
        let index: number;
        let children: CacheNode['children'];
        let child: CacheNode | null;

        // 最小レベルのノード  --->  node, depth
        for ( ; depth < d_min; ++depth ) {
            u = Math.floor( xf ) % 2;
            v = Math.floor( yf ) % 2;
            index = u + 2*v;

            children = node.children;
            child    = children[index];
            if ( child === null ) {
                child = new CacheNode();
                children[index] = child;
            }

            xf *= 2;
            yf *= 2;
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
                if ( node.state === NodeState.LOADED ) {
                    // 候補テクスチャを更新
                    tex_lo = node;
                }
                else if ( node.state === NodeState.NONE ) {
                    // 新規リクエスト
                    node.state     = NodeState.REQUESTED;
                    node.req_power = req_power !== -1 ? req_power : zlimit - depth;
                    this._new_requesteds.push( [node, depth, Math.floor( 0.5 * xf ), Math.floor( 0.5 * yf )] );
                }
                else if ( node.state === NodeState.REQUESTED ) {
                    // 要求度を更新
                    node.updateRequestPower( zlimit - depth );
                }

                u = Math.floor( xf ) % 2;
                v = Math.floor( yf ) % 2;
                index = u + 2*v;

                children = node.children;
                child    = children[index];
                if ( child === null ) {
                    child = new CacheNode();
                    children[index] = child;
                }

                xf *= 2;
                yf *= 2;
                node = child;
            }

            tex_hi = tex_lo;

            if ( node.state === NodeState.LOADED ) {
                // 候補テクスチャを更新
                tex_hi = node;
            }
            else if ( node.state === NodeState.NONE ) {
                // 新規リクエスト
                node.state     = NodeState.REQUESTED;
                node.req_power = req_power !== -1 ? req_power : zlimit - depth;
                this._new_requesteds.push( [node, depth, Math.floor( 0.5 * xf ), Math.floor( 0.5 * yf )] );
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
                if ( node.state === NodeState.LOADED ) {
                    // 候補テクスチャを更新
                    tex_lo = node;
                }
                else if ( node.state === NodeState.NONE ) {
                    // 新規リクエスト
                    node.state     = NodeState.REQUESTED;
                    node.req_power = req_power !== -1 ? req_power : zlimit - depth;
                    this._new_requesteds.push( [node, depth, Math.floor( 0.5 * xf ), Math.floor( 0.5 * yf )] );
                }
                else if ( node.state === NodeState.REQUESTED ) {
                    // 要求度を更新
                    node.updateRequestPower( zlimit - depth );
                }

                if ( depth == d_lo ) {
                    tex_hi = tex_lo;
                    break;
                }

                u = Math.floor( xf ) % 2;
                v = Math.floor( yf ) % 2;
                index = u + 2*v;

                children = node.children;
                child    = children[index];
                if ( child === null ) {
                    child = new CacheNode();
                    children[index] = child;
                }

                xf *= 2;
                yf *= 2;
                node = child;
            }

            cfa_assert( tex_hi === tex_lo );
        }

        node.touch();

        const result = TileTextureCache._findNearestAncestors_result;

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
            node.state = NodeState.NONE;
            cfa_assert( node.data === null );
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
        node.data = this._provider.requestTile( z, x, y, image => {

            if ( node.state !== NodeState.REQUESTED ) {
                // キャンセルされているので無視
                return;
            }

            if ( image ) {
                node.data  = new TileTexture( z, x, y, this._createTexture( image ) );
                node.state = NodeState.LOADED;
            }
            else {
                node.data  = null;
                node.state = NodeState.FAILED;
            }
            --this._num_requesteds;

        } );

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
            if ( node.state === NodeState.LOADED ) {
                cfa_assert( node.data instanceof TileTexture );

                if ( node.data.z === force_keep_level ) {
                    return;
                }

                node.data.dispose( gl );
            }
            node.state = NodeState.NONE;
            node.data  = null;
        } );

        // NodeState.NONE の葉ノードを消去
        collector.clean();
    }


    private readonly _glenv: GLEnv;

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
    data: TileTexture | null | unknown;


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
        this.state     = NodeState.NONE;
        this.data      = null;  // TileTexture オブジェクト、または取り消しオブジェクト
        this.req_power = -1;    // 要求度
        this.aframe    = -1;    // 最終アクセスフレーム
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
     * `NodeState.NONE` の葉ノードを消去
     */
    clean(): void
    {
        this._clean_recur( this._root );
    }

    /**
     * @return 自己と子孫がすべて `NodeState.NONE` のとき `true`,
     *         それ以外のとき `false`
     */
    private _clean_recur( node: CacheNode ): boolean
    {
        let isNodeNone = (node.state === NodeState.NONE);

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
     * @param owner - 管理者
     * @param root  - 最上位ノード
     */
    constructor( owner: TileTextureCache,
                 root: CacheNode )
    {
        this._owner = owner;
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
            node.state = NodeState.NONE;
            this._owner.cancelTileTexture( node.data );
        }
    }

    private readonly _owner: TileTextureCache;

}


/**
 * ノード状態の列挙型
 */
const enum NodeState {

    /**
     * タイルが存在しない
     */
    NONE = "@@_NONE",

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


export default TileTextureCache;
