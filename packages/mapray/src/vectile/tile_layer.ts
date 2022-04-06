import { Layer as LayerMvt,
         Feature as FeatureMvt,
         GeomType as GeomTypeMvt } from "./mvt_parser";
import { Feature as FeatureExpr,
         GeomType as GeomTypeExpr } from "./expression";
import { cfa_assert } from "../util/assertion";


/**
 * ベクトルタイルのレイヤーを表現
 */
export class TileLayer {

    /**
     * @param mvt_layer - レイヤーデータ
     */
    constructor( mvt_layer: LayerMvt )
    {
        this._point_features   = [];
        this._lines_features   = [];
        this._polygon_features = [];

        this._setupFeatures( mvt_layer );
    }


    /**
     * POINT 型のフィーチャを列挙
     */
    get point_features(): Iterable<PointFeature>
    {
        return this._point_features;
    }


    /**
     * LINESTRING 型のフィーチャを列挙
     */
    get linestring_features(): Iterable<LineStringFeature>
    {
        return this._lines_features;
    }


    /**
     * POLYGON 型のフィーチャを列挙
     */
    get polygon_features(): Iterable<PolygonFeature>
    {
        return this._polygon_features;
    }


    /**
     * フィーチャの有無を確認
     */
    hasFeature(): boolean
    {
        return this._point_features.length   > 0
            || this._lines_features.length   > 0
            || this._polygon_features.length > 0;
    }


    /**
     * this._features を初期化
     */
    private _setupFeatures( mvt_layer: Readonly<LayerMvt> ): void
    {
        for ( const mvt_feature of mvt_layer.features ) {
            switch ( mvt_feature.type ) {
            case GeomTypeMvt.POINT:
                this._point_features.push( new PointFeature( mvt_feature, mvt_layer ) );
                break;

            case GeomTypeMvt.LINESTRING:
                this._lines_features.push( new LineStringFeature( mvt_feature, mvt_layer ) );
                break;

            case GeomTypeMvt.POLYGON:
                this._polygon_features.push( new PolygonFeature( mvt_feature, mvt_layer ) );
                break;

            default: // 未知の GeomType
                continue;
            }
        }
    }


    private readonly   _point_features: PointFeature[];
    private readonly   _lines_features: LineStringFeature[];
    private readonly _polygon_features: PolygonFeature[];

}


/**
 * コマンド ID
 */
const enum CommandId {

    /**
     * {@link https://github.com/mapbox/vector-tile-spec/tree/master/2.1#4331-moveto-command
     *  MoveTo Command}
     *
     * - パラメータ: dX, dY
     * - パラメータ数: 2
     */
    MoveTo = 1,


    /**
     * {@link https://github.com/mapbox/vector-tile-spec/tree/master/2.1#4332-lineto-command
     *  LineTo Command}
     *
     * - パラメータ: dX, dY
     * - パラメータ数: 2
     */
    LineTo = 2,


    /**
     * {@link https://github.com/mapbox/vector-tile-spec/tree/master/2.1#4333-closepath-command
     *  ClosePath Command}
     *
     * - パラメータ: なし
     * - パラメータ数: 0
     */
    ClosePath = 7,

}


/**
 * ZigZag エンコードを復号する。
 *
 * `n` パラメータは `uint32` 型に ZigZag エンコードされていることを想
 * 定している。
 *
 * @see {@link https://github.com/mapbox/vector-tile-spec/tree/master/2.1#432-parameter-integers
 *       Parameter Integers}
 */
function
decode_zigzag_uint32( n: number ): number
{
    return (n >>> 1) ^ -(n & 1);
}


/**
 * ジオメトリの部分を表現する。
 *
 * `vertices` は各頂点位置の x, y 座標が並んでいる。座標系は、そのフィー
 * チャが所属するタイルの ALCS である。
 *
 * ALCS はタイルの左上 (北西) が [0, 0]、右下 (南東) が [1, 1] となる
 * 座標系である。
 */
export class GeometryPart {

    /**
     * 頂点数
     */
    readonly num_vertices: number;


    /**
     * 頂点座標の配列
     */
    readonly vertices: Float32Array;


    /**
     * @param num_vertices - 頂点数
     *
     * @internal
     */
    constructor( num_vertices: number )
    {
        this.num_vertices = num_vertices;
        this.vertices     = new Float32Array( 2 * num_vertices );
    }

}


/**
 * フィーチャの基底クラス
 */
export abstract class Feature implements FeatureExpr {

    // from interface FeatureExpr
    readonly type;
    readonly id;
    readonly properties: FeatureExpr['properties'];


    /**
     * @param gtype       - 評価用の GeoType
     * @param mvt_feature - 入力元のフィーチャデータ
     * @param mvt_layer   - 入力元のレイヤーデータ
     *
     * @internal
     */
    protected constructor( gtype:       GeomTypeExpr,
                           mvt_feature: Readonly<FeatureMvt>,
                           mvt_layer:   Readonly<LayerMvt> )
    {
        this.type       = gtype;
        this.id         = mvt_feature.id;
        this.properties = {};

        this._setupProperties( mvt_feature.tags,
                               mvt_layer.keys,
                               mvt_layer.values );
    }


    /**
     * this.properties を初期化
     */
    private _setupProperties( tags:   FeatureMvt['tags'],
                              keys:   LayerMvt['keys'],
                              values: LayerMvt['values'] ): void
    {
        for ( let i = 0; i < tags.length; i += 2 ) {
            const key_index = tags[i];
            const val_index = tags[i + 1];

            const   key = keys[key_index];
            const value = values[val_index];

            this.properties[key] = value;
        }
    }

}


/**
 * `Point` 型のフィーチャ
 */
export class PointFeature extends Feature {

    /**
     * 1 つ以上の点を持つ幾何データである。
     */
    readonly points: GeometryPart;


    /**
     * @internal
     */
    constructor( mvt_feature: Readonly<FeatureMvt>,
                 mvt_layer:   Readonly<LayerMvt> )
    {
        super( GeomTypeExpr.POINT, mvt_feature, mvt_layer );

        this.points = PointFeature.create_geometry( mvt_feature.geometry,
                                                    1 / mvt_layer.extent );

        cfa_assert( this.points.num_vertices >= 1 );
    }


    private static create_geometry( geometry: FeatureMvt['geometry'],
                                    scale:    number ): GeometryPart
    {
        // POINT は単一の MoveTo コマンドで構成される。
        // コマンドカウントが 0 より大きい。

        let it = 0;

        const cmd_integer    = geometry[it++];
        const id : CommandId = cmd_integer & 7;
        const count          = cmd_integer >>> 3;

        if ( id !== CommandId.MoveTo || count < 1 ) {
            // 単一の MoveTo ではない、またはコマンドカウントが 0 より
            // 大きくない
            throw new Error( "unexpected command" );
        }

        const points = new GeometryPart( count );
        const coords = points.vertices;  // 書き込み先の座標列

        // 現行座標
        let cx = 0;
        let cy = 0;

        for ( let i = 0; i < count; ++i ) {
            const px = cx + decode_zigzag_uint32( geometry[it++] );
            const py = cy + decode_zigzag_uint32( geometry[it++] );

            coords[2*i    ] = px * scale;
            coords[2*i + 1] = py * scale;

            cx = px;
            cy = py;
        }

        return points;
    }

}


/**
 * `LineString` 型のフィーチャ
 */
export class LineStringFeature extends Feature {

    /**
     * これは 1 個以上の [[GeometryPart]] インスタンスの配列である。
     *
     * 個々の [[GeometryPart]] インスタンスは 2 個以上の頂点を持つ。
     *
     * [[GeometryPart]] インスタンス内の隣り合う点は線分で結ばれている
     * と考える。
     */
    readonly geom_parts: GeometryPart[];


    /**
     * @internal
     */
    constructor( mvt_feature: Readonly<FeatureMvt>,
                 mvt_layer:   Readonly<LayerMvt> )
    {
        super( GeomTypeExpr.LINESTRING, mvt_feature, mvt_layer );

        this.geom_parts = LineStringFeature.create_geometry( mvt_feature.geometry,
                                                             1 / mvt_layer.extent );

        cfa_assert( this.geom_parts.length >= 1 );
    }


    private static create_geometry( geometry: FeatureMvt['geometry'],
                                    scale:    number ): GeometryPart[]
    {
        // LINESTRING は MoveTo コマンド (コマンドカウント 1) と
        // LineTo コマンド (コマンドカウント >= 1) が交互に (1 つ以上)
        // 現れる。

        const geo_parts: GeometryPart[] = [];

        // 現行座標
        let cx = 0;
        let cy = 0;

        if ( geometry.length == 0 ) {
            // 空の LineString は仕様に反する
            throw new Error( "empty LineStringFeature is unexpected" );
        }

        for ( let it = 0; it < geometry.length; ) {
            // 最初の頂点の座標
            let x_0;
            let y_0;

            // MoveTo 部
            {
                const cmd_integer    = geometry[it++];
                const id : CommandId = cmd_integer & 7;
                const count          = cmd_integer >>> 3;

                if ( id !== CommandId.MoveTo || count !== 1 ) {
                    // ここで予期しないコマンド、または MoveTo のコマ
                    // ンドカウントが 1 ではない
                    throw new Error( "unexpected command" );
                }

                const px = cx + decode_zigzag_uint32( geometry[it++] );
                const py = cy + decode_zigzag_uint32( geometry[it++] );

                x_0 = px * scale;
                y_0 = py * scale;

                cx = px;
                cy = py;
            }

            let geo_part: GeometryPart;

            // LineTo 部
            {
                const cmd_integer    = geometry[it++];
                const id : CommandId = cmd_integer & 7;
                const count          = cmd_integer >>> 3;

                if ( id !== CommandId.LineTo || count < 1 ) {
                    // ここで予期しないコマンド、または LineTo のコマ
                    // ンドカウントが 1 以上ではない
                    throw new Error( "unexpected command" );
                }

                geo_part     = new GeometryPart( 1 + count );
                const coords = geo_part.vertices;  // 書き込み先の座標列

                coords[0] = x_0;
                coords[1] = y_0;

                for ( let i = 0; i < count; ++i ) {
                    const px = cx + decode_zigzag_uint32( geometry[it++] );
                    const py = cy + decode_zigzag_uint32( geometry[it++] );

                    coords[2*i + 2] = px * scale;
                    coords[2*i + 3] = py * scale;

                    cx = px;
                    cy = py;
                }
            }

            cfa_assert( geo_part.num_vertices >= 2 );
            geo_parts.push( geo_part );
        }

        return geo_parts;
    }

}


/**
 * `Polygon` 型のフィーチャ
 */
export class PolygonFeature extends Feature {

    /**
     * 多角形の幾何データ
     *
     * 1 つまたは複数の多角形を表現する。
     *
     * [[GeometryPart]] インスタンスは 3 個以上の頂点を持ち、外側境界
     * または内側境界を表現する多角形である。
     *
     * 内側境界は、ある外側境界の内側に包含され、その外側境界の多角形
     * に穴を開ける。
     *
     * 頂点の順序は、外側境界が時計回りで、内側境界が反時計回りになっ
     * ている。
     */
    readonly geom_parts: GeometryPart[];


    /**
     * @internal
     */
    constructor( mvt_feature: Readonly<FeatureMvt>,
                 mvt_layer:   Readonly<LayerMvt> )
    {
        super( GeomTypeExpr.POLYGON, mvt_feature, mvt_layer );

        this.geom_parts = PolygonFeature.create_geometry( mvt_feature.geometry,
                                                          1 / mvt_layer.extent );

        cfa_assert( this.geom_parts.length >= 1 );
    }


    private static create_geometry( geometry: FeatureMvt['geometry'],
                                    scale:    number ): GeometryPart[]
    {
        const geo_parts: GeometryPart[] = [];

        // 現行座標
        let cx = 0;
        let cy = 0;

        if ( geometry.length == 0 ) {
            // 空の Polygon は仕様に反する
            throw new Error( "empty PolygonFeature is unexpected" );
        }

        for ( let it = 0; it < geometry.length; ) {
            // 最初の頂点の座標
            let x_0;
            let y_0;

            // MoveTo 部
            {
                const cmd_integer    = geometry[it++];
                const id : CommandId = cmd_integer & 7;
                const count          = cmd_integer >>> 3;

                if ( id !== CommandId.MoveTo || count !== 1 ) {
                    // ここで予期しないコマンド、または MoveTo のコマ
                    // ンドカウントが 1 ではない
                    throw new Error( "unexpected command" );
                }

                const px = cx + decode_zigzag_uint32( geometry[it++] );
                const py = cy + decode_zigzag_uint32( geometry[it++] );

                x_0 = px * scale;
                y_0 = py * scale;

                cx = px;
                cy = py;
            }

            let geo_part: GeometryPart;

            // LineTo 部
            {
                const cmd_integer    = geometry[it++];
                const id : CommandId = cmd_integer & 7;
                const count          = cmd_integer >>> 3;

                if ( id !== CommandId.LineTo || count < 2 ) {
                    // ここで予期しないコマンド、または LineTo のコマ
                    // ンドカウントが 2 以上ではない
                    throw new Error( "unexpected command" );
                }

                geo_part     = new GeometryPart( 1 + count );
                const coords = geo_part.vertices;  // 書き込み先の座標列

                coords[0] = x_0;
                coords[1] = y_0;

                for ( let i = 0; i < count; ++i ) {
                    const px = cx + decode_zigzag_uint32( geometry[it++] );
                    const py = cy + decode_zigzag_uint32( geometry[it++] );

                    coords[2*i + 2] = px * scale;
                    coords[2*i + 3] = py * scale;

                    cx = px;
                    cy = py;
                }
            }

            // ClosePath 部
            {
                const cmd_integer    = geometry[it++];
                const id : CommandId = cmd_integer & 7;
                const count          = cmd_integer >>> 3;

                if ( id !== CommandId.ClosePath || count !== 1 ) {
                    // ここで予期しないコマンド、または ClosePath のコ
                    // マンドカウントが 1 ではない
                    throw new Error( "unexpected command" );
                }
            }

            cfa_assert( geo_part.num_vertices >= 3 );
            geo_parts.push( geo_part );
        }

        return geo_parts;
    }

}
