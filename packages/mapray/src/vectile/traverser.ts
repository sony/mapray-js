import type { StyleManager, Source } from "./style_manager";
import type { FlakeContext } from "./style_flake";
import type { StyleLayer } from "./style_layer";
import type { TileProvider } from "./TileProvider";
import { IdealLevelCalculator, IdealLevelInfo  } from "./ideal_level";
import GeoMath from "../GeoMath";
import type { Vector4 } from "../GeoMath";
import type RenderStage from "../RenderStage";
import type Globe from "../Globe";
import type Primitive from "../Primitive";

type MetaData = TileProvider.MetaData;
type    Flake = Globe.Flake;


/**
 * [[Traverser]] インスタンスを管理する。
 *
 * [[StyleManager]] インスタンスに対する [[Traverser]] インスタンスを
 * 列挙する。
 *
 * このクラスは [[StyleManager]] 内部で使用する。
 */
export class TraverserManager {

    readonly style_manager: StyleManager;


    /**
     * 初期化
     *
     * @param owner - `this` を管理する [[StyleManager]] インスタンス
     *                (未初期化でも可能)
     */
    constructor( owner: StyleManager )
    {
        this.style_manager = owner;
        this._traversers   = [];
    }


    /**
     * [[Traverser]] インスタンスを追加する。
     *
     * `sources` の各ソースに対応する [[Traverser]] インスタンスを追加する。
     *
     * @param sources - ソースを列挙するオブジェクト
     */
    addTraversers( sources: Iterable<Source> ): void
    {
        for ( const source of sources ) {
            this._traversers.push( new Traverser( this, source, source.metadata ) );
        }
    }


    /**
     * 現在のスタイルのレンダリングに必要な [[Traverser]] インスタンス
     * を列挙する。
     */
    enumerate(): Iterable<Traverser>
    {
        return this._traversers;
    }


    private readonly _traversers: Traverser[];

}


/**
 * [[Traverser.run]] で使用するコンテキストである。
 */
export class TraverseContext {

    /**
     * 起源となる StyleManager インスタンス
     */
    readonly style_manager: StyleManager;


    /**
     * 最上位の地表断片
     */
    readonly root_flake: Flake;


    /**
     * 描画対象となるプリミティブの配列
     */
    readonly primitives: Primitive[];


    /**
     * 元となる RenderStage インスタンス
     */
    readonly stage: RenderStage;


    /**
     * この構築子は [[StyleManager.draw]] が呼び出す。
     */
    constructor( style_manager: StyleManager,
                 stage:         RenderStage,
                 globe:         Globe )
    {
        this.style_manager = style_manager;
        this.root_flake    = globe.root_flake;
        this.primitives    = [];
        this.stage         = stage;

        this._clip_planes = TraverseContext._createClipPlanes( stage, this.root_flake );
        this._ideal_level_calc = new IdealLevelCalculator( style_manager, stage, this._clip_planes );
    }


    /**
     * 描画するプリミティブを追加
     */
    addPrimitives( primitives: Primitive[] ): void
    {
        for ( const prim of primitives ) {
            this.primitives.push( prim );
        }
    }


    /**
     * `flake` が可視でないなら `true`, それ以外なら `false` を返す。
     */
    isInvisible( flake: Flake ): boolean
    {
        return flake.isInvisible( this._clip_planes );
    }


    /**
     * `flake` に対する理想レベルの範囲を取得する。
     */
    getIdealLevelInfo( flake: Flake ): IdealLevelInfo | null
    {
        return this._ideal_level_calc.calculate( flake );
    }


    /**
     * 下限判定関数
     *
     * `flake` の可視範囲の 1/2 を超える面積の理想レベルが `flake.z - 1`
     * 以下のとき `true`, それ以外のとき `false` を返す。
     */
    isLevelLower( flake: Flake,
                  info:  IdealLevelInfo ): boolean
    {
        // これは近似計算 (vector-tile-style.org::#H7qo)
        const b = info.center - flake.z;
        return b < -0.5;
    }


    /**
     * 上限判定関数
     *
     * `flake` の可視範囲の 1/2 を超える面積の理想レベルが `flake.z + 1`
     * 以上のとき `true`, それ以外のとき `false` を返す。
     */
    isLevelUpper( flake: Flake,
                  info:  IdealLevelInfo ): boolean
    {
        // これは近似計算 (vector-tile-style.org::#H7qo)
        const b = info.center - flake.z;
        return b > 0.5;
    }


    /**
     * see [[_clip_planes]]
     */
    private static _createClipPlanes( stage: RenderStage,
                                      root_flake:  Flake )
    {
        const  view_to_gocs = stage.view_to_gocs;
        const  gocs_to_view = stage.gocs_to_view;
        const volume_planes = stage.getVolumePlanes();
        const   clip_planes = [];

        // 地表遮蔽カリング平面
        const rmin = GeoMath.EARTH_RADIUS + root_flake.height_min;  // 最小半径
        const rmax = GeoMath.EARTH_RADIUS + root_flake.height_max;  // 最大半径

        // P (視点位置)
        const px = view_to_gocs[12];
        const py = view_to_gocs[13];
        const pz = view_to_gocs[14];

        // q = √[(P.P - rmin^2)(rmax^2 - rmin^2)] - rmin^2
        const    p2 = px*px + py*py + pz*pz;
        const rmin2 = rmin*rmin;
        const rmax2 = rmax*rmax;
        const     q = Math.sqrt( (p2 - rmin2) * (rmax2 - rmin2) ) - rmin2;

        // L = <P, q> / ‖P‖
        const plane = GeoMath.createVector4();
        const recip = 1 / Math.sqrt( p2 );
        plane[0] = px * recip;
        plane[1] = py * recip;
        plane[2] = pz * recip;
        plane[3] =  q * recip;
        clip_planes.push( plane );

        // L を基とした遠方距離
        const far_dist = Math.sqrt( p2 + rmax2 + 2*q );

        // 視体積平面を取得して、地心直交座標系に変換
        // (直交変換なので x, y, z は正規化されている)
        for ( let i = 0; i < 6; ++i ) {
            let   src_plane = volume_planes[i];
            const dst_plane = GeoMath.createVector4();

            if ( i == 1 && src_plane[3] > far_dist ) {
                // 遠方平面が必要以上に遠いとき far_dist に置き換える
                src_plane    = GeoMath.createVector4( src_plane );
                src_plane[3] = far_dist;
            }

            GeoMath.transformPlane_A( gocs_to_view, src_plane, dst_plane );

            clip_planes.push( dst_plane );
        }

        return clip_planes;
    }


    /**
     * 視体積カリング平面と地表遮蔽カリング平面 (GOCS)
     */
    private readonly _clip_planes: Vector4[];


    /**
     * @see [[getIdealLevelInfo]]
     */
    private readonly _ideal_level_calc : IdealLevelCalculator;

}


/**
 * ベクトルタイルのトラバース単位を表現する。
 *
 * 1 つの [[StyleManager]] インスタンスは、0 個以上の [[Traverser]] イ
 * ンスタンスにより描画される。
 *
 * 各 [[Traverser]] インスタンスが描画する [[StyleLayer]] インスタンス
 * 集合は互いに素になる。
 */
class Traverser {

    /**
     * @param owner    - 起源となる StyleManager インスタンス
     * @param source   - これを持ったレイヤーがトラバース対象
     * @param metadata - プロバイダから得たメタデータ
     *
     * @remarks
     *
     * この構築子は [[TraverserManager]] が呼び出す。
     */
    constructor( owner:    TraverserManager,
                 source:   Source,
                 metadata: MetaData )
    {
        this._layers = [];

        for ( const layer of owner.style_manager.getLayers() ) {
            if ( layer.__source_inst === source ) {
                this._layers.push( layer );
            }
        }

        // TODO: style ファイルの source に記述された範囲も考慮
        this._min_level = metadata.min_level;
        this._max_level = metadata.max_level;
    }


    /**
     * このトラバーサに対応するすべてのレイヤーを横断する。
     *
     * @remarks
     *
     * このメソッドは [[StyleManager.draw]] が呼び出す。
     */
    run( ctx: TraverseContext ): void
    {
        this._runRecur( ctx, ctx.root_flake )
    }


    /**
     * `flake` とその子孫を横断する。
     *
     * @remarks
     *
     * [[run]] から呼び出されるサブルーチンである。
     */
    private _runRecur( ctx:   TraverseContext,
                       flake: Flake ): void
    {
        if ( ctx.isInvisible( flake ) ) {
            // flake 全体が不可視なので、この領域は無視
            return;
        }

        const Z_min   = this._min_level;
        const Z_max   = this._max_level;
        const Z_ideal = ctx.getIdealLevelInfo( flake );

        if ( Z_ideal === null ) {
            /* 理想レベルの範囲は計算できなかった */
            if ( flake.z === Z_max ) {
                // area が最高レベルの場合は諦めてタイルを欠落させる
            }
            else {
                // 子領域ではレベルを計算できて、さらに配置できる可能性に賭ける
                for ( const child of ensureFlakeChildren( flake ) ) {
                    this._runRecur( ctx, child );
                }
            }
        }
        else if ( flake.z === Z_max ) {
            /* flake は上限レベルに達している */
            if ( ctx.isLevelLower( flake, Z_ideal ) ) {
                // 理想レベルが flake.z より低い部分が多いのでタイルを欠落させる
            }
            else if ( Z_ideal.lower < flake.z - 1 ) {
                // 理想レベルが低すぎる部分があるのでタイルを欠落させる
            }
            else {
                // それ以外は flake に対応するタイルを配置
                this._putTile( flake, Z_ideal, ctx );
            }
        }
        else if ( Z_ideal.upper > flake.z + 1 ) {
            // 理想レベルが高すぎる部分があるので分割する
            for ( const child of ensureFlakeChildren( flake ) ) {
                this._runRecur( ctx, child );
            }
        }
        else if ( Z_ideal.lower < flake.z - 1 ) {
            // 理想レベルが低すぎる部分があるのでタイルを欠落させる
            if ( Z_ideal.upper >= flake.z + 1 ) {
                // ただし分割すれば子領域を配置できる可能性があるので試す
                for ( const child of ensureFlakeChildren( flake ) ) {
                    this._runRecur( ctx, child );
                }
            }
        }
        else {
            /* 可視部分全体の理想のレベルが flake.z に近い */
            if ( ctx.isLevelLower( flake, Z_ideal ) ) {
                // 理想レベルが flake.z より低い部分が多いのでタイルを欠落させる
            }
            else if ( ctx.isLevelUpper( flake, Z_ideal ) ) {
                // 理想レベルが flake.z より高い部分が多いので子領域を配置
                const child_z = flake.z + 1;
                if ( child_z >= Z_min ) {
                    for ( const child of ensureFlakeChildren( flake ) ) {
                        if ( ctx.isInvisible( child ) ) {
                            // child 全体が不可視なので無視
                            continue;
                        }

                        const Z_child_ideal = ctx.getIdealLevelInfo( child );
                        if ( Z_child_ideal === null ) {
                            // 理想レベルを計算できないのでタイルを欠落させる
                            continue;
                        }
                        else if ( Z_child_ideal.lower < child.z - 1 ) {
                            // 理想レベルが低すぎる部分があるのでタイルを欠落させる
                            continue;
                        }
                        this._putTile( child, Z_child_ideal, ctx );
                    }
                }
            }
            else {
                // 理想レベルが平均的に flake.z と思われるので flake のタイルを配置
                if ( flake.z >= Z_min ) {
                    this._putTile( flake, Z_ideal, ctx );
                }
            }
        }

    }


    /**
     * タイルを配置
     *
     * `flake` に対する `StyleFlake` インスタンスから複数のプリミティ
     * ブを得て `ctx` に追加する。
     *
     * `this` が担当する、すべての `StyleLayer` インスタンス (可視) に
     * 対するプリミティブが対象となる。
     */
    private _putTile( flake: Flake,
                      info:  IdealLevelInfo,
                      ctx:   TraverseContext ): void
    {
        // `flake` に対する `StyleFlake` インスタンス
        const style_flake = flake.ensureStyleFlake( ctx.style_manager );

        if ( style_flake === null ) {
            // DEM データが入手できないので、このタイルの表示は破棄する。
            return;
        }

        const flake_ctx: FlakeContext = {
            z: flake.z,
            x: flake.x,
            y: flake.y,

            zoom:        info.center,
            image_names: ctx.style_manager.__image_manager.getImageNames(),

            stage: ctx.stage,
            dem_sampler: style_flake.dem_sampler,
        };

        for ( const style_layer of this._layers ) {
            if ( !style_layer.visibility ) {
                // 不可視のレイヤーは対象外
                continue;
            }

            // style_layer の描画プリミティブを ctx に追加
            const primitives = style_flake.getPrimitives( style_layer, flake_ctx );
            ctx.addPrimitives( primitives );
        }
    }


    /**
     * トラバースの対象となるレイヤー
     *
     * `manager` 内の `source` を持つ、すべての [[StyleLayer]] インス
     * タンスである。
     */
    private readonly _layers: StyleLayer[];


    /**
     * レンダリングするタイルのレベルの最小値
     */
    private readonly _min_level: number;


    /**
     * レンダリングするタイルのレベルの最大値
     */
    private readonly _max_level: number;

}


/**
 * `flake` の子 Flake を列挙する。
 */
function* ensureFlakeChildren( flake: Flake ): Iterable<Flake>
{
    for ( let v = 0; v < 2; ++v ) {
        for ( let u = 0; u < 2; ++u ) {
            yield flake.newChild( u, v );
        }
    }
}
