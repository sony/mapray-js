import Loader from "./Loader"
import GeoMath, { Vector3, Vector4 } from "./GeoMath";
import Scene from "./Scene";
import GLEnv from "./GLEnv";
import GeoPoint from "./GeoPoint";
import CredentialMode from "./CredentialMode";
import MarkerLineEntity from "./MarkerLineEntity";
import PolygonEntity from "./PolygonEntity";
import PinEntity from "./PinEntity";
import Resource, { URLResource } from "./Resource";
import AltitudeMode from "./AltitudeMode";
import GeoJSON from "./GeoJSON";

/**
 * GeoJSON形式（[rfc7946](https://tools.ietf.org/html/rfc7946)）のデータをシーンに読み込みます。
 */
class GeoJSONLoader extends Loader {

    private _getPointFGColor: (geojson: GeoJSON.FeatureJson) => Vector3 | number[];

    private _getPointBGColor: (geojson: GeoJSON.FeatureJson) => Vector3 | number[];

    private _getPointSize: (geojson: GeoJSON.FeatureJson) => number;

    private _getPointIconId: (geojson: GeoJSON.FeatureJson) => string | undefined;

    private _getLineColor: (geojson: GeoJSON.FeatureJson) => Vector3 | Vector4 | number[];

    private _getLineWidth: (geojson: GeoJSON.FeatureJson) => number;

    private _getFillColor: (geojson: GeoJSON.FeatureJson) => Vector4 | number[];

    private _getExtrudedHeight: (geojson: GeoJSON.FeatureJson) => number;

    private _getAltitudeMode: (geojson: GeoJSON.FeatureJson) => AltitudeMode;

    private _getAltitude: (geojson: GeoJSON.FeatureJson) => number | undefined;

    private _glenv: GLEnv;

    private _cancelled: boolean;

    private _finished: boolean;


    /**
     * url で指定したシーンデータの読み込みを開始し、scene にエンティティを構築する。
     *
     * 読み込みが終了したとき options.callback を呼び出す。
     * @param scene    読み込み先のシーン
     * @param resource シーンファイルの URL
     * @param options  オプション集合
     */
    constructor( scene: Scene, resource: Resource | string, options: GeoJSONLoader.Option = {} )
    {
        let res: Resource;
        if (resource instanceof Resource) {
            res = resource;
        }
        else if ( typeof resource === "string" ) {
            res = new URLResource(resource, {
                    type: Resource.Type.JSON,
                    transform: options.transform
            });
        }
        else {
            throw new Error( "Unsupported Resource: " + resource);
        }

        super( scene, res, {
                onEntity: options.onEntity,
                onLoad: options.onLoad
        } );

        // PinEntity
        this._getPointFGColor = options.getPointFGColor || defaultGetPointFGColorCallback;
        this._getPointBGColor = options.getPointBGColor || defaultGetPointBGColorCallback;
        this._getPointSize = options.getPointSize || defaultGetPointSizeCallback;
        this._getPointIconId = options.getPointIconId || defaultGetPointIconIdCallback;

        // MarkerLineEntity
        this._getLineColor = options.getLineColor || defaultGetLineColorCallback;
        this._getLineWidth = options.getLineWidth || defaultGetLineWidthCallback;

        // PolygonEntity
        this._getFillColor = options.getFillColor || defaultGetFillColorCallback;
        this._getExtrudedHeight = options.getExtrudedHeight || defaultGetExtrudedHeightCallback;

        // Common
        this._getAltitudeMode = options.getAltitudeMode || defaultGetAltitudeModeCallback;
        this._getAltitude = options.getAltitude || defaultGetAltitudeCallback;

        this._glenv      = scene.glenv;
        // this._references = {};
        this._cancelled  = false;
        this._finished   = false;
    }


    /**
     * 読み込み処理の実態。継承クラスによって実装される。
     */
    protected override _load(): Promise<void>
    {
        return (
            this._resource.load( { type: Resource.Type.JSON } )
            .then( geoJson => {
                    // JSON データの取得に成功
                    this._check_cancel();
                    this._load_geojson_object( geoJson );
            } )
        );
    }


    /**
     * Load GeoJSON Object
     */
    private _load_geojson_object( geojson: GeoJSON.FeatureCollectionJson | GeoJSON.FeatureJson | GeoJSON.GeometryJson ): boolean
    {
        var success;
        if ( GeoJSON.isFeatureCollectionJson( geojson ) ) {
            success = false;
            for ( var i = 0, len = geojson.features.length; i < len; i++ ) {
                var feature = geojson.features[i];
                // @ts-ignore
                var s = this._load_geojson_object( feature.featureId ? feature.feature : feature ); // @ToDo: Unknown
                // var s = this._load_geojson_object( feature );
                if (s && !success) success = s;
            }
        }
        else if ( GeoJSON.isFeatureJson( geojson ) ) {
            success = this._load_geometry_object( geojson.geometry, geojson );
        }
        else {
            success = this._load_geometry_object( geojson, undefined );
        }

        if ( this._cancelled ) return false;

        return success;
    }


    /**
     * Load Geometry Object
     */
    private _load_geometry_object( geometry: GeoJSON.GeometryJson, geojson?: GeoJSON.FeatureJson ): boolean {
        const vGeojson = geojson || {
            id: "",
            type: "Feature",
            geometry: geometry,
        } as GeoJSON.FeatureJson;

        switch ( geometry.type ) {
          case GEOMETRY_TYPES.POINT:
          case GEOMETRY_TYPES.MULTI_POINT:
              return this._loadPoint( geometry as (GeoJSON.PointGeometryJson | GeoJSON.MultiPointGeometryJson), vGeojson );

          case GEOMETRY_TYPES.LINE_STRING:
          case GEOMETRY_TYPES.MULTI_LINE_STRING:
              return this._loadLines( geometry as (GeoJSON.LineStringGeometryJson | GeoJSON.MultiLineStringGeometryJson), vGeojson );

          case GEOMETRY_TYPES.POLYGON:
          case GEOMETRY_TYPES.MULTI_POLYGON:
              return this._loadPolygons( geometry as (GeoJSON.PolygonGeometryJson | GeoJSON.MultiPolygonGeometryJson), vGeojson );

          case GEOMETRY_TYPES.GEOMETRY_COLLECTION:
              return true;

          default:
              throw new Error( "Invalid GeoJSON type: " + geometry.type );
        }
      }



    /**
     * Load Line and LineString
     */
    private _loadLines( geometry: GeoJSON.LineStringGeometryJson | GeoJSON.MultiLineStringGeometryJson, geojson: GeoJSON.FeatureJson ): boolean
    {
        const color4 = this._getLineColor( geojson );
        const width = this._getLineWidth( geojson );
        const altitude = this._getAltitude( geojson );
        const altitude_mode = this._getAltitudeMode( geojson );
        
        if ( !geometry || color4.length !== 4 ) {
            return false;
        }
        var type = geometry.type;
        var coords = geometry.coordinates;
        var rgb = color4.slice(0, 3) as Vector3;
        var alpha = color4[3];

        // If multiline, split entity
        if ( type === GEOMETRY_TYPES.MULTI_LINE_STRING ) {
            const multiLineStringGeometry = geometry as GeoJSON.MultiLineStringGeometryJson;
            let noError = true;
            multiLineStringGeometry.coordinates.forEach( points => {
                const flag = this._generateLine( points, width, rgb, alpha, altitude_mode, altitude, geojson );
                if ( !flag ) {
                    noError = false;
                }
                return flag;
            });
            return noError;
        }
        else { // type === GEOMETRY_TYPES.LINE_STRING
            const lineStringGeometry = geometry as GeoJSON.LineStringGeometryJson;
            return this._generateLine( lineStringGeometry.coordinates, width, rgb, alpha, altitude_mode, altitude, geojson )
        }
    }


    /**
     * Create MarkerLineEntity
     */
    private _generateLine( points: GeoJSON.CoordinatesJson[], width: number, color: Vector3, opacity: number, altitude_mode: AltitudeMode, altitude: number | undefined, geojson: GeoJSON.FeatureJson ): boolean
    {
        if ( !points ) {
            return false;
        }

        var entity = new MarkerLineEntity( this._scene );
        // @ts-ignore
        entity.altitude_mode = altitude_mode;
        var fp = this._flatten( points, altitude );
        entity.addPoints( fp );
        // @ts-ignore
        entity.setLineWidth( width );
        // @ts-ignore
        entity.setColor( color );
        // @ts-ignore
        entity.setOpacity( opacity );
        // @ts-ignore
        this._onEntity( this, entity, geojson );

        return true;
    }


    /**
     * Load Point and MultiPoint
     */
    private _loadPoint( geometry: GeoJSON.PointGeometryJson | GeoJSON.MultiPointGeometryJson, geojson: GeoJSON.FeatureJson ): boolean
    {
        const fgColor = this._getPointFGColor( geojson );
        const bgColor = this._getPointBGColor( geojson );
        const iconId = this._getPointIconId( geojson );
        const size = this._getPointSize( geojson );
        const altitude_mode = this._getAltitudeMode( geojson );
        const altitude = this._getAltitude( geojson );
        
        if ( !geometry ) {
            return false;
        }
        var type = geometry.type;


        var props = {
            "fg_color": fgColor.slice( 0, 3 ) as Vector3,
            "bg_color": bgColor.slice( 0, 3 ) as Vector3,
            "size": size,
        };

        // If multiline, split entity
        const entity = new PinEntity( this._scene );
        entity.altitude_mode = altitude_mode;
        if ( GeoJSON.isPointGeometryJson( geometry ) ) {
            var alt = this._getActualValue( altitude, geometry.coordinates[2], GeoJSONLoader.defaultAltitude );
            var coords = new GeoPoint( geometry.coordinates[0], geometry.coordinates[1], alt );
            if ( iconId ) {
                entity.addMakiIconPin( iconId, coords, props );
            }
            else {
                entity.addPin( coords, props );
            }
        }
        else { // type === GEOMETRY_TYPES.MULTI_POINT
            for ( var i = 0; i < geometry.coordinates.length; i++ ) {
                var targetCoordinates = geometry.coordinates[i];
                var alt = this._getActualValue( altitude, targetCoordinates[2], GeoJSONLoader.defaultAltitude );
                var coords = new GeoPoint( targetCoordinates[0], targetCoordinates[1], alt );
                if ( iconId ) {
                    entity.addMakiIconPin( iconId, coords, props );
                    // entity.addPin( coords, props );
                }
                else {
                    entity.addPin( coords, props );
                }
            }
        }
        // @ts-ignore
        this._onEntity( this, entity, geojson );

        return true;
    }


    /**
     * Load Polygon and MultiPolygon
     */
    private _loadPolygons( geometry: GeoJSON.PolygonGeometryJson | GeoJSON.MultiPolygonGeometryJson, geojson: GeoJSON.FeatureJson ): boolean
    {
        const color4 = this._getFillColor( geojson );
        const altitude_mode = this._getAltitudeMode( geojson );
        const altitude = this._getAltitude( geojson );
        const extruded_height = this._getExtrudedHeight( geojson );

        if ( !geometry || color4.length !== 4 ) {
            return false;
        }
        var type = geometry.type;
        var coords = geometry.coordinates;
        var rgb = color4.slice(0, 3) as Vector3;
        var alpha = color4[3];

        // If multiline, split entity
        if ( type === GEOMETRY_TYPES.MULTI_POLYGON ) {
            const multiPolygonGeometry = geometry as GeoJSON.MultiPolygonGeometryJson;
            let noError = true;
            multiPolygonGeometry.coordinates.forEach( points => {
                const flag = this._generatePolygon( points, rgb, alpha, altitude_mode, altitude, extruded_height, geojson );
                if ( !flag ) {
                    noError = false;
                }
                return flag;
            });
            return noError;
        }
        else { // type === GEOMETRY_TYPES.POLYGON
            const polygonGeometry = geometry as GeoJSON.PolygonGeometryJson;
            return this._generatePolygon( polygonGeometry.coordinates, rgb, alpha, altitude_mode, altitude, extruded_height, geojson )
        }
    }


    /**
     * Create Polygon
     */
    private _generatePolygon( pointsList: GeoJSON.CoordinatesJson[][], color: Vector3, opacity: number, altitude_mode: AltitudeMode, altitude: number | undefined, extruded_height: number, geojson: GeoJSON.FeatureJson ): boolean
    {
        if ( !pointsList ) {
            return false;
        }

        const entity = new PolygonEntity( this._scene );
        // @ts-ignore
        entity.altitude_mode = altitude_mode;
        entity.extruded_height = extruded_height;
        entity.setColor( color );
        entity.setOpacity( opacity );
        for ( let i=0; i< pointsList.length; i++ ) {
            const fp = this._flatten( pointsList[ i ], altitude, pointsList[ i ].length-1 );
            if ( !fp ) return false;
            if ( i === 0 ) entity.addOuterBoundary( fp );
            else entity.addInnerBoundary( fp );
        }
        // @ts-ignore
        this._onEntity( this, entity, geojson );

        return true;
    }


    private _getActualValue( valueFromCallback: number | undefined, valueInGeoJSON: number | undefined, defaultValue: number ): number {
        return (
            valueFromCallback != undefined ? valueFromCallback: // value from callback is the most prioritized
            valueInGeoJSON    != undefined ? valueInGeoJSON:    // value in GeoJSON will be used if defined
            defaultValue                                   // default value
        );
    }


    private _flatten( array: number[][], altitude: number | undefined, len: number = array.length ): number[]
    {
        return array.reduce( (arr: number[], v: number[], index: number) => (
                index >= len ? arr :
                arr.concat( v.slice(0, 2), this._getActualValue( altitude, v[2], GeoJSONLoader.defaultAltitude ) )
        ), [] );
    };
}



namespace GeoJSONLoader {



export interface Option {
    /** リソース要求変換関数 */
    transform?: Resource.TransformCallback;

    /** 終了コールバック関数 */
    callback?: Loader.FinishCallback;

    /** 読み込み完了時のコールバック関数 */
    onLoad?: Loader.FinishCallback;

    /** エンティティコールバック関数 */
    onEntity?: Loader.EntityCallback;

    getPointFGColor?: (geojson: GeoJSON.FeatureJson) => Vector3;

    getPointBGColor?: (geojson: GeoJSON.FeatureJson) => Vector3;

    getPointSize?: (geojson: GeoJSON.FeatureJson) => number;

    getPointIconId?: (geojson: GeoJSON.FeatureJson) => string | undefined;

    getLineColor?: (geojson: GeoJSON.FeatureJson) => Vector3 | Vector4;

    getLineWidth?: (geojson: GeoJSON.FeatureJson) => number;

    getFillColor?: (geojson: GeoJSON.FeatureJson) => Vector4;

    getExtrudedHeight?: (geojson: GeoJSON.FeatureJson) => number;

    getAltitudeMode?: (geojson: GeoJSON.FeatureJson) => AltitudeMode;

    getAltitude?: (geojson: GeoJSON.FeatureJson) => number | undefined;
}



export const _defaultHeaders = {};
export const defaultLineColor = [0, 0, 0, 1];
export const defaultFillColor = [0, 0, 0, 1];
export const defaultLineWidth = 1;
export const defaultPointFGColor = [1.0, 1.0, 1.0];
export const defaultPointBGColor = [0.35, 0.61, 0.81];
export const defaultPointSize = 30;
export const defaultPointIconId = undefined;
export const defaultAltitude = 0.0;
export const defaultExtrudedHeight = 0.0;



} // namespace GeoJSONLoader



function defaultGetLineColorCallback( geojson: GeoJSON.FeatureJson )
{
    return GeoJSONLoader.defaultLineColor;
}

function defaultGetLineWidthCallback( geojson: GeoJSON.FeatureJson ) 
{
    return GeoJSONLoader.defaultLineWidth;
}

function defaultGetFillColorCallback( geojson: GeoJSON.FeatureJson )
{
    return GeoJSONLoader.defaultFillColor;
}


function defaultGetPointFGColorCallback( geojson: GeoJSON.FeatureJson )
{
    return GeoJSONLoader.defaultPointFGColor;
}

function defaultGetPointBGColorCallback( geojson: GeoJSON.FeatureJson )
{
    return GeoJSONLoader.defaultPointBGColor;
}

function defaultGetPointSizeCallback( geojson: GeoJSON.FeatureJson )
{
    return GeoJSONLoader.defaultPointSize;
}

function defaultGetPointIconIdCallback( geojson: GeoJSON.FeatureJson )
{
    return GeoJSONLoader.defaultPointIconId;
}


function defaultGetAltitudeModeCallback( geojson: GeoJSON.FeatureJson )
{
    return AltitudeMode.ABSOLUTE;
}
function defaultGetAltitudeCallback( geojson: GeoJSON.FeatureJson )
{
    return undefined;
}

function defaultGetExtrudedHeightCallback( geojson: GeoJSON.FeatureJson )
{
    return GeoJSONLoader.defaultExtrudedHeight;
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
