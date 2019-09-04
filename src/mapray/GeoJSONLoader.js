import Loader from "./Loader"
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import CredentialMode from "./CredentialMode";
import MarkerLineEntity from "./MarkerLineEntity";
import PolygonEntity from "./PolygonEntity";
import PinEntity from "./PinEntity";
import Resource, { URLResource } from "./Resource";

/**
 * GeoJSON形式（<a href="https://tools.ietf.org/html/rfc7946">rfc7946</a>）のデータをシーンに読み込みます。
 * @memberof mapray
 */
class GeoJSONLoader extends Loader {

    /**
     * @desc
     * <p>url で指定したシーンデータの読み込みを開始し、scene にエンティティを構築する。</p>
     * <p>読み込みが終了したとき options.callback を呼び出す。</p>
     * @param {mapray.Scene} scene      読み込み先のシーン
     * @param {string}       resource        シーンファイルの URL
     * @param {object}       [options]  オプション集合
     * @param {mapray.GeoJSONLoader.TransformCallback} [options.transform]  リソース要求変換関数
     * @param {mapray.GeoJSONLoader.FinishCallback}    [options.callback]   終了コールバック関数
     */
    constructor( scene, resource, options={} )
    {
        if (resource instanceof Resource) {
            // OK
        }
        else if ( typeof resource === "string" ) {
            resource = new URLResource(resource, {
                    type: "json",
                    transform: options.transform
            });
        }
        else {
            throw new Error( "Unsupported Resource: " + resource);
        }

        super( scene, resource, {
                onLoad: options.onLoad
        } );

        this._getLineColor = options.getLineColor || defaultGetLineColorCallback;
        this._getLineWidth = options.getLineWidth || defaultGetLineWidthCallback;

        this._getRadius = options.getRadius || defaultGetRadiusCallback;
        this._getFillColor = options.getFillColor || defaultGetFillColorCallback;

        this._getPointFGColor = options.getPointFGColor || defaultGetPointFGColorCallback;
        this._getPointBGColor = options.getPointBGColor || defaultGetPointBGColorCallback;
        this._getPointSize = options.getPointSize || defaultGetPointSizeCallback;
        this._getPointIconId = options.getPointIconId || defaultGetPointIconIdCallback;

        this._getElevation = options.getElevation || defaultGetElevationCallback;
        this._transform  = options.transform || defaultTransformCallback;
        this._getExtrudedMode = options.getExtrudedMode || defaultExtrudedModeCallback;
        this._glenv      = scene.glenv;
        this._references = {};
        this._cancelled  = false;
        this._finished   = false;
    }


    _load()
    {
        return (
            this._resource.load()
            .then( geoJson => {
                    // JSON データの取得に成功
                    this._check_cancel();
                    this._load_geojson_object( geoJson );
            } )
        );
    }


    /**
     * Load GeoJSON Object
     * @private
     */
    _load_geojson_object( geojson )
    {
        var success;
        if ( geojson.type === TYPES.FEATURE_COLLECTION ) {
            var features = geojson.features;
            success = false;
            for ( var i = 0, len = features.length; i < len; i++ ) {
                var feature = features[i];
                var s = this._load_geojson_object( feature.featureId ? feature.feature : feature ); // @ToDo: Unknown
                // var s = this._load_geojson_object( feature );
                if (s && !success) success = s;
            }
        }
        else if ( geojson.type === TYPES.FEATURE ) {
            var geometry = geojson.geometry;
            success = this._load_geometry_object( geometry, geojson );
        }
        else if ( SUPPORTED_GEOMETRY_TYPES.indexOf( geojson.type ) !== -1 ) {
            success = this._load_geometry_object( geojson, null );
        }
        else {
            throw new Error( "Unnsupported Type: " + geojson.type );
        }
        
        if ( this._cancelled ) return false;

        return success;
    }


    /**
     * Load Geometry Object
     * @private
     */
    _load_geometry_object( geometry, geojson={} ) {
        var coords = geometry.coordinates;

        if (!coords && !geometry) {
            return false;
        }
        
        switch ( geometry.type ) {
          case GEOMETRY_TYPES.POINT:
          case GEOMETRY_TYPES.MULTI_POINT:
              return this._loadPoint( geometry, geojson );

          case GEOMETRY_TYPES.LINE_STRING:
          case GEOMETRY_TYPES.MULTI_LINE_STRING:
              return this._loadLines( geometry, geojson );

          case GEOMETRY_TYPES.POLYGON:
          case GEOMETRY_TYPES.MULTI_POLYGON:
              return this._loadPolygons( geometry, geojson );

          case GEOMETRY_TYPES.GEOMETRY_COLLECTION:
              return true;

          default:
              throw new Error( "Invalid GeoJSON type: " + geometry.type );
        }
      }


    /**
     * fetch() の init 引数に与えるオブジェクトを生成
     * @private
     */
    _make_fetch_params( tr )
    {
        var init = {
            signal:      this._abort_ctrl.signal,
            credentials: (tr.credentials || CredentialMode.OMIT).credentials
        };

        if ( tr.headers ) {
            init.headers = (tr.headers || GeoJSONLoader._defaultHeaders);
        }

        return init;
    }


    _loadLines( geometry, geojson ) 
    {
        const color4 = this._getLineColor( geojson );
        const width = this._getLineWidth( geojson );
        const extruded = this._getExtrudedMode( geojson );
        const elevation = this._getElevation( geojson );
        
        if ( !geometry || color4.length !== 4 ) {
            return false;
        }
        var type = geometry.type;
        var coords = geometry.coordinates;
        var rgb = color4.slice(0, 3);
        var alpha = color4[3];

        // If multiline, split entity
        if ( type === GEOMETRY_TYPES.MULTI_LINE_STRING ) {
            coords.forEach( points => {
                if ( !this._generateLine( points, width, rgb, alpha, extruded, elevation ) ) {
                    return false;
                }
            });
            return true;
        }
        else { // type === GEOMETRY_TYPES.LINE_STRING
            return this._generateLine( coords, width, rgb, alpha, extruded, elevation )
        }
    }


    _generateLine( points, width, color, opaticy, extruded, elevation ) 
    {
        if ( !points ) {
            return false;
        }

        var h = 0;
        if ( !extruded ) {
            h = 0;
        }
        else if ( extruded ) {
            h = elevation;
        }

        var entity = new MarkerLineEntity( this._scene );
        var fp = this._flatten( points, h );
        if ( !fp ) {
            return false;
        }
        entity.addPoints( fp );
        entity.setLineWidth( width );
        entity.setColor( color );
        entity.setOpacity( opaticy );
        this._scene.addEntity( entity );
        
        return true;
    }


    _loadPoint( geometry, geojson )
    {
        const fgColor = this._getPointFGColor( geojson );
        const bgColor = this._getPointBGColor( geojson );
        const iconId = this._getPointIconId( geojson );
        const size = this._getPointSize( geojson );
        const extruded = this._getExtrudedMode( geojson );
        const elevation = this._getElevation( geojson );
        
        if ( !geometry ) {
            return false;
        }
        var type = geometry.type;
        // TO do: height is fake.


        var props = {
            "fg_color": fgColor.slice( 0, 3 ),
            "bg_color": bgColor.slice( 0, 3 ),
            size: size,
        };

        // If multiline, split entity
        if ( type === GEOMETRY_TYPES.POINT ) {
            var entity = new PinEntity( this._scene );
            var coords = new GeoPoint( geometry.coordinates[0], geometry.coordinates[1], geometry.coordinates[2] );
            if ( iconId !== null ) {
                entity.addMakiIconPin( iconId, coords, props );
            }
            else {
                entity.addPin( coords, props );
            }
            this._scene.addEntity( entity );
        }
        else { // type === GEOMETRY_TYPES.MULTI_POINT
            var entity = new PinEntity( this._scene );
            for ( var i = 0; i < geometry.coordinates.length; i++ ) {
                var targetCoordinates = geometry.coordinates[i];
                var coords = new GeoPoint( targetCoordinates[0], targetCoordinates[1], targetCoordinates[2] );
                if ( iconId !== null ) {
                    entity.addMakiIconPin( iconId, coords, props );
                    // entity.addPin( coords, props );
                }
                else {
                    entity.addPin( coords, props );
                }
            }
            this._scene.addEntity( entity );
        }

        return true;
    }


    _loadPolygons( geometry, geojson )
    {
        const color4 = this._getFillColor( geojson );
        const extruded = this._getExtrudedMode( geojson );
        const elevation = this._getElevation( geojson );

        if ( !geometry || color4.length !== 4 ) {
            return false;
        }
        var type = geometry.type;
        var coords = geometry.coordinates;
        var rgb = color4.slice(0, 3);
        var alpha = color4[3];

        // If multiline, split entity
        if ( type === GEOMETRY_TYPES.MULTI_POLYGON ) {
            coords.forEach( points => {
                if ( !this._generatePolygon( points, rgb, alpha, extruded, elevation ) ) {
                    return false;
                }
            });
            return true;
        }
        else { // type === GEOMETRY_TYPES.POLYGON
            return this._generatePolygon( coords, rgb, alpha, extruded, elevation )
        }
    }


    _generatePolygon( pointsList, color, opaticy, extruded, elevation ) 
    {
        if ( !pointsList ) {
            return false;
        }

        var h = extruded ? elevation : 0;
        const entity = new PolygonEntity( this._scene );
        entity.setColor( color );
        entity.setOpacity( opaticy );
        for ( let i=0; i< pointsList.length; i++ ) {
            const fp = this._flatten( pointsList[ i ], h, pointsList[ i ].length-1 );
            if ( !fp ) return false;
            if (i === 0) entity.addOuterBoundary( fp );
            else entity.addInnerBoundary( fp );
        }
        this._scene.addEntity(entity);
        
        return true;
    }


    _flatten( ary, h, len=ary.length )
    {
        return ary.reduce( (p, c, i) => {
                return (
                    i >= len ? p:
                    c.length === 2 ? p.concat(c, h) :
                    p.concat(c)
                );
        }, []);
    };
}

/**
 * @summary リソース要求変換関数
 * @callback TransformCallback
 * @desc
 * <p>リソースのリクエスト時に URL などを変換する関数の型である。</p>
 *
 * @param  {string}                          url   変換前のリソース URL
 * @param  {mapray.GeoJSONLoader.ResourceType} type  リソースの種類
 * @return {mapray.GeoJSONLoader.TransformResult}    変換結果を表すオブジェクト
 *
 * @example
 * function( url, type ) {
 *     return {
 *         url:         url,
 *         credentials: mapray.CredentialMode.SAME_ORIGIN,
 *         headers: {
 *             'Header-Name': 'Header-Value'
 *         }
 *     };
 * }
 *
 * @memberof mapray.GeoJSONLoader
 */


/**
 * @summary リソース要求変換関数の変換結果
 * @typedef {object} TransformResult
 * @desc
 * <p>関数型 {@link mapray.GeoJSONLoader.TransformCallback} の戻り値のオブジェクト構造である。</p>
 * <p>注意: 現在のところ、リソースの種類が {@link mapray.GeoJSONLoader.ResourceType|ResourceType}.IMAGE のとき、headers プロパティの値は無視される。</p>
 * @property {string}                url                 変換後のリソース URL
 * @property {mapray.CredentialMode} [credentials=OMIT]  クレデンシャルモード
 * @property {object}                [headers={}]        リクエストに追加するヘッダーの辞書 (キーがヘッダー名、値がヘッダー値)
 * @memberof mapray.GeoJSONLoader
 */


{
    GeoJSONLoader._defaultHeaders = {};
    GeoJSONLoader.defaultLineColor = [0, 0, 0, 1];
    GeoJSONLoader.defaultFillColor = [0, 0, 0, 1];
    GeoJSONLoader.defaultLineWidth = 1;
    GeoJSONLoader.defaultRadius = 10;
    GeoJSONLoader.defaultExtrudedMode = true;
    GeoJSONLoader.defaultPointFGColor = [1, 0, 0];
    GeoJSONLoader.defaultPointBGColor = [0, 0, 1];
    GeoJSONLoader.defaultPointSize = 30;
    GeoJSONLoader.defaultPointIconId = null;
}



function defaultGetLineColorCallback( geojson )
{
    return GeoJSONLoader.defaultLineColor;
}

function defaultGetLineWidthCallback( geojson ) 
{
    return GeoJSONLoader.defaultLineWidth;
}

function defaultGetRadiusCallback( geojson )
{
    return GeoJSONLoader.defaultRadius;
}

function defaultGetFillColorCallback( geojson )
{
    return GeoJSONLoader.defaultFillColor;
}


function defaultGetPointFGColorCallback( geojson )
{
    return GeoJSONLoader.defaultPointFGColor;
}

function defaultGetPointBGColorCallback( geojson )
{
    return GeoJSONLoader.defaultPointBGColor;
}

function defaultGetPointSizeCallback( geojson )
{
    return GeoJSONLoader.defaultPointSize;
}

function defaultGetPointIconIdCallback( geojson )
{
    return GeoJSONLoader.defaultPointIconId;
}


function defaultGetElevationCallback( geojson )
{
    return 100;
}

function defaultExtrudedModeCallback( geojson )
{
    if ( !geojson ) {
        return GeoJSONLoader.defaultExtrudedMode;
    }

    var geometry = geojson.type === "Feature" ? geojson.geometry : geojson;
    switch (geometry.type) {
        case GEOMETRY_TYPES.POINT:
        case GEOMETRY_TYPES.MULTI_POINT:
            return true;
        case GEOMETRY_TYPES.LINE_STRING:
        case GEOMETRY_TYPES.MULTI_LINE_STRING:
            return true;
        case GEOMETRY_TYPES.POLYGON:
        case GEOMETRY_TYPES.MULTI_POLYGON:
            return true;
        default:
            throw new Error('Invalid GeoJSON: unknown type: ' + geometry.type);
    }
    return GeoJSONLoader.defaultExtrudedMode;
}

function defaultTransformCallback( url )
{
    return { url: url };
}

var TYPES = {
    FEATURE: "Feature",
    FEATURE_COLLECTION: "FeatureCollection",
};

var GEOMETRY_TYPES = {
    POINT: "Point",
    MULTI_POINT: "MultiPoint",
    LINE_STRING: "LineString",
    MULTI_LINE_STRING: "MultiLineString",
    POLYGON: "Polygon",
    MULTI_POLYGON: "MultiPolygon",
    GEOMETRY_COLLECTION: "GeometryCollection",
    FEATURE: "Feature"
};

var SUPPORTED_GEOMETRY_TYPES = Object.values( GEOMETRY_TYPES );

export default GeoJSONLoader;
