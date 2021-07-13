import ImageProvider from "./ImageProvider";
import EmptyImageProvider from "./EmptyImageProvider";
import TileTexture from "./TileTexture";
import GeoMath from "./GeoMath";



/**
 * @summary タイルテクスチャの管理
 * @memberof mapray
 * @private
 * @see mapray.TileTexture
 */
class TileTextureCache {

    /**
     * @param {mapray.GLEnv}         glenv     WebGL 環境
     * @param {mapray.ImageProvider} provider  地図画像プロバイダ
     */
    constructor( glenv, provider )
    {
        this._glenv       = glenv;
        this._provider    = null;
        this._min_image_z = 0;
        this._max_image_z = 0;
        this._image_zbias = 0;

        var status_callback = ( status ) => {
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

        this._resetImageProvider( (provider.status( status_callback ) === ImageProvider.Status.READY) ? provider : new EmptyImageProvider() );

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
        var gl = glenv.context;

        var aniso_ext = glenv.EXT_texture_filter_anisotropic;
        if ( aniso_ext ) {
            this._aniso_ext = aniso_ext;
            this._max_aniso = gl.getParameter( aniso_ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT );
        }
        this._use_mipmap = false;
    }


    /**
     * 画像プロバイダを再設定
     *
     *   _provider
     *   _min_image_z
     *   _max_image_z
     *   _image_zbias
     *
     * @private
     */
    _resetImageProvider( provider )
    {
        this._provider = provider;

        var renge = provider.getZoomLevelRange();
        this._min_image_z = renge.min;
        this._max_image_z = renge.max;

        this._image_zbias = GeoMath.maprayLog2( 2 * Math.PI / provider.getImageSize() );
    }


    /**
     * すべてのリクエストを取り消す
     */
    cancel()
    {
        this._flush();
    }


    /**
     * キャッシュをフラッシュ
     * @private
     */
    _flush()
    {
        new NodeCanceller( this, this._croot );  // リクエストを取り消す
        this._croot = new CacheNode();           // 取り消したノードは使えないので、単純にすべて捨てる
        this._max_accesses = 0;
        // assert: this._num_requesteds == 0
    }


    /**
     * LOD からテクスチャの Z レベルを計算するバイアス値を取得
     *
     * @return {number}  Log2[2Pi / size]
     */
    getImageZBias()
    {
        return this._image_zbias;
    }


    /**
     * @return {number}  タイルの Z レベルの最小値
     */
    getImageZMin()
    {
        return this._min_image_z;
    }


    /**
     * @summary リクエスト待ちのタイルの個数を取得
     *
     * @return {number}  リクエスト待ちのタイルの個数
     */
    getNumWaitingRequests()
    {
        return this._num_requesteds;
    }


    /**
     * @summary 先祖タイルテクスチャを検索
     * @desc
     * <p>[x, y, z] タイルの祖先の中で、現在キャッシュに存在する最大レベルのタイルテクスチャを検索し、hi に設定する。</p>
     *
     * <p>ただし検索されるタイルのズームレベルが Z とすると、Z <= max( zlimit, this._min_image_z )
     *    という条件から検索し、存在しなければ null となる。</p>
     *
     *  <p>hi より低いレベルにタイルが存在すれば、それを lo に設定し、存在しなければ lo に hi と同じタイルを設定する</p>
     *
     * <p>プロバイダにもっと相応しいテクスチャが存在する可能性があれば、そのテクスチャを要求する。</p>
     *
     * <p>前提: z >= this._min_image_z && z >= zlimit</p>
     *
     * @param  {number}          z   地図ズームレベル
     * @param  {number}          x   X タイル座標
     * @param  {number}          y   Y タイル座標
     * @param  {number}     zlimit   先祖レベルの上限
     * @return {mapray.TileTexture[]}  先祖タイルテクスチャ配列 [hi, lo]
     */
    findNearestAncestors( z, x, y, zlimit )
    {
        var depth = 0;
        var d_min = this._min_image_z;

        var   pow = Math.pow( 2, 1 - z );
        var    xf = (x + 0.5) * pow;
        var    yf = (y + 0.5) * pow;
        var  node = this._croot;

        var u;
        var v;
        var index;
        var children;
        var child;

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

        var  d_max = this._max_image_z;
        var   d_lo = GeoMath.clamp( zlimit - 1, d_min, d_max );
        var   d_hi = GeoMath.clamp( zlimit,     d_min, d_max );
        var tex_lo = null;
        var tex_hi = null;

        if ( d_lo < d_hi ) {
            /* assert: (d_min < d_max) && (d_min < zlimit <= d_max) */

            for ( ; depth <= d_lo; ++depth ) {
                if ( node.state === NodeState.LOADED ) {
                    // 候補テクスチャを更新
                    tex_lo = node;
                }
                else if ( node.state === NodeState.NONE ) {
                    // 新規リクエスト
                    node.state     = NodeState.REQUESTED;
                    node.req_power = zlimit - depth;
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
                node.req_power = zlimit - depth;
                this._new_requesteds.push( [node, depth, Math.floor( 0.5 * xf ), Math.floor( 0.5 * yf )] );
            }
            else if ( node.state === NodeState.REQUESTED ) {
                // 要求度を更新
                node.updateRequestPower( zlimit - depth );
            }
        }
        else { // if d_lo == d_hi
            /* assert: (d_min == d_max) || (zlimit <= d_min) || (zlimit > d_max) */

            for ( ;; ++depth ) {
                if ( node.state === NodeState.LOADED ) {
                    // 候補テクスチャを更新
                    tex_lo = node;
                }
                else if ( node.state === NodeState.NONE ) {
                    // 新規リクエスト
                    node.state     = NodeState.REQUESTED;
                    node.req_power = zlimit - depth;
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

            // assert: tex_hi === tex_lo
        }

        node.touch();

        var result = TileTextureCache._findNearestAncestors_result;
        result[0] = (tex_hi !== null) ? tex_hi.data : null;
        result[1] = (tex_lo !== null) ? tex_lo.data : null;
        return result;
    }


    /**
     * @summary フレームの最後の処理
     */
    endFrame()
    {
        this._performNewRequests();

        var counter = new NodeCounter( this._croot, this._frame_counter );
        this._max_accesses = Math.max( counter.num_accesses, this._max_accesses );

        if ( counter.num_loadeds > this._upper_bound * this._max_accesses ) {
            var num_nodes = Math.floor( this._lower_bound * this._max_accesses );
            this._reduceCache( num_nodes );
        }

        ++this._frame_counter;
    }


    /**
     * @summary 新規リクエストを実行
     * @private
     */
    _performNewRequests()
    {
        // リクエスト数
        var num_requests = Math.min( this._max_requesteds - this._num_requesteds, this._new_requesteds.length );

        // 基準に基づき、新規リクエストを前半 (num_requests 個) と後半に分割
        this._new_requesteds.sort( function( a, b ) {
            var anode = a[0];
            var bnode = b[0];
            return bnode.req_power - anode.req_power;
        } );

        // リクエストを実行
        var self = this;
        this._new_requesteds.slice( 0, num_requests ).forEach( function( req ) {
            var node = req[0];
            var    z = req[1];
            var    x = req[2];
            var    y = req[3];
            self._requestTileTexture( z, x, y, node );
        } );

        // リクエストしなかったノードを空に戻す
        this._new_requesteds.slice( num_requests ).forEach( function( req ) {
            var node = req[0];
            node.state = NodeState.NONE;
            // assert: node.data === null
        } );

        // 新規リクエストのリストをクリア
        this._new_requesteds.length = 0;
    }


    /**
     * @summary タイルテクスチャを要求
     * @param {number} z  地図ズームレベル
     * @param {number} x  X タイル座標
     * @param {number} y  Y タイル座標
     * @param {mapray.TileTextureCache.CacheNode} node  対象ノード
     * @private
     */
    _requestTileTexture( z, x, y, node )
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
     * @summary テクスチャを生成
     * @desc
     * <p>GL ステートの変更</p>
     * <ul>
     *   <li>TEXTURE_2D_BINDING:   null</li>
     *   <li>UNPACK_FLIP_Y_WEBGL:  false</li>
     * </ul>
     * @param  {Image}  image  元画像
     * @return {WebGLTexture}  生成されたテクスチャ
     * @private
     */
    _createTexture( image )
    {
        var        gl = this._glenv.context;
        var aniso_ext = this._aniso_ext;

        var  target = gl.TEXTURE_2D;
        var texture = gl.createTexture();

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
     * @summary キャッシュを削減
     * @param  {number} num_cnodes  目標ノード数
     * @private
     */
    _reduceCache( num_nodes )
    {
        var collector = new NodeCollector( this._croot );

        // 基準に基づき、ノードを前半 (num_cnodes 個) と後半に分割
        collector.nodes.sort( function( a, b ) {
            var aframe = b.aframe - a.aframe;
            if ( aframe == 0 ) {
                if ( (a.state === NodeState.LOADED) && (b.state === NodeState.LOADED) ) {
                    return a.data.z - b.data.z;
                }
            }
            return aframe;
        } );


        // 後半のノードを削除
        var gl = this._glenv.context;
        collector.nodes.slice( num_nodes ).forEach( function( node ) {
            if ( node.state === NodeState.LOADED ) {
                node.data.dispose( gl );
            }
            node.state = NodeState.NONE;
            node.data  = null;
        } );

        // NodeState.NONE の葉ノードを消去
        collector.clean();
    }

}


// クラス定数を定義
TileTextureCache._findNearestAncestors_result = new Array( 2 );


/**
 * @summary キャッシュノード
 *
 * @memberof mapray.TileTextureCache
 * @private
 */
class CacheNode {

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
    updateRequestPower( req_power )
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
 * @summary ノード数の計上
 *
 * this.num_loadeds:  ロードされているタイル数
 * this.num_accesses: ロードされているタイルのうち、アクセスされたタイル数
 *
 * アクセスがあったノードに対して aframe を更新する。
 *
 * @memberof mapray.TileTextureCache
 * @private
 */
class NodeCounter {

    /**
     * @param {mapray.TileTextureCache.CacheNode} root   最上位ノード
     * @param {number}                            frame  現在のフレーム
     */
    constructor( root, frame )
    {
        this.num_loadeds  = 0;
        this.num_accesses = 0;
        this._frame       = frame;
        this._traverse( root );
    }

    /**
     * @private
     */
    _traverse( node )
    {
        var   children = node.children;
        var isAccessed = (node.aframe === true);

        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
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

}


/**
 * @summary ノード収集
 * @desc
 * <p>NodeState.LOADED または NodeState.FAILED のノードを this.nodes に収集する。</p>
 *
 * @memberof mapray.TileTextureCache
 * @private
 */
class NodeCollector {

    /**
     * @param {mapray.TileTextureCache.CacheNode} root  最上位ノード
     */
    constructor( root )
    {
        this._root = root;
        this.nodes = [];
        this._traverse( root );
    }

    /**
     * @private
     */
    _traverse( node )
    {
        var state = node.state;
        if ( state === NodeState.LOADED || state === NodeState.FAILED ) {
            // LOADED または FAILED なら追加
            this.nodes.push( node );
        }

        var children = node.children;
        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child !== null ) {
                this._traverse( child );
            }
        }
    }

    /**
     * @summary NodeState.NONE の葉ノードを消去
     */
    clean()
    {
        this._clean_recur( this._root );
    }

    /**
     * @return 自己と子孫がすべて NodeState.NONE のとき true, それいがいのとき false
     * @private
     */
    _clean_recur( node )
    {
        var isNodeNone = (node.state === NodeState.NONE);

        var children = node.children;
        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child !== null ) {
                var isChildNone = this._clean_recur( child );
                if ( isChildNone === true ) {
                    children[i] = null;
                }
                isNodeNone = isChildNone && isNodeNone;
            }
        }

        return isNodeNone;
    }

}


/**
 * @summary すべてのリクエストを取り消す
 * @memberof mapray.TileTextureCache
 * @private
 */
class NodeCanceller {

    /**
     * @param {mapray.TileTextureCache}          owner  最上位ノード
     * @param {mapray.TileTextureCache.CacheNode} root  最上位ノード
     */
    constructor( owner, root )
    {
        this._owner = owner;
        this._traverse( root );
    }

    /**
     * @private
     */
    _traverse( node )
    {
        var children = node.children;
        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child !== null ) {
                this._traverse( child );
            }
        }
        if ( node.state === NodeState.REQUESTED ) {
            var owner = this._owner;
            node.state = NodeState.NONE;
            owner._provider.cancelRequest( node.data );
            --owner._num_requesteds;
        }
    }

}


/**
 * @summary ノード状態の列挙型
 * @enum {object}
 * @memberof mapray.TileTextureCache
 * @constant
 */
var NodeState = {
    /**
     * タイルが存在しない
     */
    NONE: { id: "NONE" },

    /**
     * タイルが存在する
     */
    LOADED: { id: "LOADED" },

    /**
     * タイルをリクエスト中
     */
    REQUESTED: { id: "REQUESTED" },

    /**
     * タイルのリクエストに失敗
     */
    FAILED: { id: "FAILED" }
};


export default TileTextureCache;
