import Loader from "./Loader";
import GeoMath, { Vector3, Vector4 } from "./GeoMath";
import Scene from "./Scene";
import GeoPoint from "./GeoPoint";
import MarkerLineEntity from "./MarkerLineEntity";
import PolygonEntity from "./PolygonEntity";
import PinEntity from "./PinEntity";
import Resource, { URLResource } from "./Resource";
import AltitudeMode from "./AltitudeMode";
import GeoJSON from "./GeoJSON";
import Color from "./util/Color";



/**
 * GeoJSON形式（[rfc7946](https://tools.ietf.org/html/rfc7946)）のデータをシーンに読み込みます。
 */
class GeoJSONLoader extends Loader {

    private _getPointFGColor: ( geojson: GeoJSON.FeatureJson ) => Vector3 | undefined;

    private _getPointBGColor: ( geojson: GeoJSON.FeatureJson ) => Vector3 | undefined;

    private _getPointSize: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    private _getPointIconId: ( geojson: GeoJSON.FeatureJson ) => string | undefined;

    private _getLineColor: ( geojson: GeoJSON.FeatureJson ) => Vector3 | Vector4 | undefined;

    private _getLineWidth: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    private _getFillColor: ( geojson: GeoJSON.FeatureJson ) => Vector3 | Vector4 | undefined;

    private _getExtrudedHeight: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    private _getAltitudeMode: ( geojson: GeoJSON.FeatureJson ) => AltitudeMode | undefined;

    private _getAltitude: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    private _getVisibility: ( geojson: GeoJSON.FeatureJson ) => boolean | undefined;

    private _ignoreFeatureError: boolean;

    private _featuresLoadSuccess: boolean;


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
        const res = (
            resource instanceof Resource ? resource:
            typeof resource === "string" ? new URLResource( resource, {
                type: Resource.Type.JSON,
                transform: options.transform
            } ):
            undefined
        );
        if ( !res )  throw new Error( "Unsupported Resource: " + resource );

        super( scene, res, {
            onEntity: options.onEntity,
            onLoad: options.onLoad
        } );

        // PinEntity
        this._getPointFGColor = options.getPointFGColor ?? emptyCallback;
        this._getPointBGColor = options.getPointBGColor ?? emptyCallback;
        this._getPointSize    = options.getPointSize    ?? emptyCallback;
        this._getPointIconId  = options.getPointIconId  ?? emptyCallback;

        // MarkerLineEntity
        this._getLineColor = options.getLineColor ?? emptyCallback;
        this._getLineWidth = options.getLineWidth ?? emptyCallback;

        // PolygonEntity
        this._getFillColor      = options.getFillColor      ?? emptyCallback;
        this._getExtrudedHeight = options.getExtrudedHeight ?? emptyCallback;

        // Common
        this._getAltitudeMode = options.getAltitudeMode ?? emptyCallback;
        this._getAltitude     = options.getAltitude     ?? emptyCallback;
        this._getVisibility   = options.getVisibility   ?? emptyCallback;

        this._ignoreFeatureError = GeoJSONLoader.defaultIgnoreFeatureError;
        this._featuresLoadSuccess = true;

    }


    getFeaturesLoadSuccess(): boolean { return this._featuresLoadSuccess; }


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
                this._featuresLoadSuccess = this._load_geojson_object( geoJson as ( GeoJSON.FeatureCollectionJson | GeoJSON.FeatureJson | GeoJSON.GeometryJson ) );
            } )
        );
    }


    /**
     * Load GeoJSON Object
     */
    private _load_geojson_object( geojson: GeoJSON.FeatureCollectionJson | GeoJSON.FeatureJson | GeoJSON.GeometryJson ): boolean
    {
        if ( GeoJSON.isFeatureCollectionJson( geojson ) ) {
            if ( !Array.isArray( geojson.features ) ) { // The 'features' member MUST be an array of GeoJSON Feature objects.
                return this._handleException( "Invalid FeatureCollection: The 'features' member MUST be an array of GeoJSON Feature objects." );
            }

            let success = true;
            for ( let i = 0; i < geojson.features.length; i++ ) {
                const feature = geojson.features[i];
                const s = this._load_geojson_object( feature );
                if ( success ) success = s;
            }
            return success;
        }
        else if ( GeoJSON.isFeatureJson( geojson ) ) {
            return this._load_geometry_object( geojson.geometry, geojson );
        }
        else { // geojson is GeoJSON.GeometryJson
            return this._load_geometry_object( geojson, undefined );
        }
    }


    /**
     * Load Geometry Object
     */
    private _load_geometry_object( geometry: GeoJSON.GeometryJson, geojson?: GeoJSON.FeatureJson ): boolean
    {
        if ( !geometry ) {
            return this._handleException( "Geometry not Found" );
        }

        const vGeojson = geojson ?? {
            id: "",
            type: "Feature",
            geometry: geometry,
        } as GeoJSON.FeatureJson;

        switch ( geometry.type ) {
            case GEOMETRY_TYPES.POINT:
            case GEOMETRY_TYPES.MULTI_POINT:
                return this._loadPoint( geometry as ( GeoJSON.PointGeometryJson | GeoJSON.MultiPointGeometryJson ), vGeojson );

            case GEOMETRY_TYPES.LINE_STRING:
            case GEOMETRY_TYPES.MULTI_LINE_STRING:
                return this._loadLines( geometry as ( GeoJSON.LineStringGeometryJson | GeoJSON.MultiLineStringGeometryJson ), vGeojson );

            case GEOMETRY_TYPES.POLYGON:
            case GEOMETRY_TYPES.MULTI_POLYGON:
                return this._loadPolygons( geometry as ( GeoJSON.PolygonGeometryJson | GeoJSON.MultiPolygonGeometryJson ), vGeojson );

            case GEOMETRY_TYPES.GEOMETRY_COLLECTION: {
                console.warn( "Unsupported GeoJSON type: " + geometry.type );
                return false;
            }

            default:  // The "type" member of a geometry object MUST be one of the seven geometry types listed above.
                return this._handleException( "Invalid GeoJSON type: " + geometry.type );
        }
    }


    /**
     * Load Line and LineString
     */
    private _loadLines( geometry: GeoJSON.LineStringGeometryJson | GeoJSON.MultiLineStringGeometryJson, geojson: GeoJSON.FeatureJson ): boolean
    {
        if ( !geometry.coordinates ) {
            return this._handleException( "Coordinates not Found" );
        }

        const color4 = Color.createColor( this._getLineColor( geojson ) ?? GeoJSONLoader.defaultLineColor );
        const width = this._getLineWidth( geojson ) ?? GeoJSONLoader.defaultLineWidth;

        const altitude_mode = this._getAltitudeMode( geojson ) ?? getMaprayAltitudeMode( geojson ) ?? GeoJSONLoader.defaultAltitudeMode;
        const altitude = this._getAltitude( geojson );
        const visibility = this._getVisibility( geojson ) ?? getMaprayVisibility( geojson ) ?? GeoJSONLoader.defaultVisibility;

        const type = geometry.type;
        const rgb = Color.copyOpaqueColor( color4, GeoMath.createVector3() );
        const alpha = color4[3];

        // If multiline, split entity
        if ( type === GEOMETRY_TYPES.MULTI_LINE_STRING ) {
            const multiLineStringGeometry = geometry as GeoJSON.MultiLineStringGeometryJson;
            if ( !Array.isArray( geometry.coordinates ) || !geometry.coordinates.length ) { // For type 'MultiLineString', the 'coordinates' member must be an array of LineString coordinate arrays.
                return this._handleException( "Invalid coordinates: For type 'MultiLineString', the 'coordinates' member MUST be an array of LineString coordinate arrays." );
            }
            let noError = true;
            multiLineStringGeometry.coordinates.forEach( points => {
                const flag = this._generateLine( points, width, rgb, alpha, altitude_mode, altitude, visibility, geojson );
                if ( !flag ) noError = false;
            } );
            return noError;
        }
        else { // type === GEOMETRY_TYPES.LINE_STRING
            const lineStringGeometry = geometry as GeoJSON.LineStringGeometryJson;
            return this._generateLine( lineStringGeometry.coordinates, width, rgb, alpha, altitude_mode, altitude, visibility, geojson );
        }
    }


    /**
     * Create MarkerLineEntity
     */
    private _generateLine( points: GeoJSON.CoordinatesJson[], width: number, color: Vector3, opacity: number, altitude_mode: AltitudeMode, altitude: number | undefined, visibility: boolean, geojson: GeoJSON.FeatureJson ): boolean
    {
        if ( !GeoJSON.isCoordinatesArrayJson( points ) ) { // A position is an array of numbers. There MUST be two or more elements.
            return this._handleException( "Invalid coordinates: A position is an array of numbers. There MUST be two or more elements." );
        }
        if ( points.length < 2 ) { // For type 'LineString', the 'Coordinates' member must be an array of two or more positions
            return this._handleException( "Invalid coordinates: For type 'LineString', the 'coordinates' member MUST be an array of two or more positions." );
        }

        const entity = new MarkerLineEntity( this._scene );
        entity.altitude_mode = altitude_mode;
        entity.addPoints( this._flatten( points, altitude ) );
        entity.setLineWidth( width );
        entity.setColor( color );
        entity.setOpacity( opacity );
        entity.setVisibility( visibility );
        this._onEntity( this, entity, geojson );

        return true;
    }


    /**
     * Load Point and MultiPoint
     */
    private _loadPoint( geometry: GeoJSON.PointGeometryJson | GeoJSON.MultiPointGeometryJson, geojson: GeoJSON.FeatureJson ): boolean
    {
        if ( !geometry.coordinates ) {
            return this._handleException( "Coordinates not Found" );
        }

        const fgColor = this._getPointFGColor( geojson ) ?? GeoJSONLoader.defaultPointFGColor;
        const bgColor = this._getPointBGColor( geojson ) ?? GeoJSONLoader.defaultPointBGColor;
        const iconId = this._getPointIconId( geojson ) ?? GeoJSONLoader.defaultPointIconId;
        const size = this._getPointSize( geojson ) ?? GeoJSONLoader.defaultPointSize;
        const altitude = this._getAltitude( geojson );

        const props = {
            "fg_color": fgColor,
            "bg_color": bgColor,
            "size": size,
        };

        const entity = new PinEntity( this._scene );
        entity.altitude_mode = this._getAltitudeMode( geojson ) ?? getMaprayAltitudeMode( geojson ) ?? GeoJSONLoader.defaultAltitudeMode;
        entity.setVisibility( this._getVisibility( geojson ) ?? getMaprayVisibility( geojson ) ?? GeoJSONLoader.defaultVisibility );

        let noError = true;
        if ( GeoJSON.isPointGeometryJson( geometry ) ) {
            noError = this._addPin( entity, geometry.coordinates, iconId, altitude, props );
        }
        else { // type === GEOMETRY_TYPES.MULTI_POINT
            if ( !Array.isArray( geometry.coordinates ) || !geometry.coordinates.length ) { // For type "MultiPoint", the "coordinates" member must be an array of positions.
                return this._handleException( "Invalid coordinates: For type 'MultiPoint', the 'coordinates' member MUST be an array of positions." );
            }
            geometry.coordinates.forEach( points => {
                const flag = this._addPin( entity, points, iconId, altitude, props );
                if ( noError ) noError = flag;
            } );
        }
        if ( noError ) this._onEntity( this, entity, geojson );
        return noError;
    }


    /**
     * Create PinEntity
     */
    private _addPin( entity: PinEntity, point: GeoJSON.CoordinatesJson, iconId: string | undefined, altitude: number | undefined, props: PinEntity.MakiIconPinEntryOption ): boolean
    {
        if ( !GeoJSON.isCoordinatesJson( point ) ) { // A position is an array of numbers. There MUST be two or more elements.
            return this._handleException( "Invalid coordinates: A position is an array of numbers. There MUST be two or more elements." );
        }
        const coords = new GeoPoint( point[0], point[1], altitude ?? point[2] ?? GeoJSONLoader.defaultAltitude );
        if ( iconId ) {
            entity.addMakiIconPin( iconId, coords, props );
        }
        else {
            entity.addPin( coords, props );
        }
        return true;
    }


    /**
     * Load Polygon and MultiPolygon
     */
    private _loadPolygons( geometry: GeoJSON.PolygonGeometryJson | GeoJSON.MultiPolygonGeometryJson, geojson: GeoJSON.FeatureJson ): boolean
    {
        if ( !geometry.coordinates ) {
            return this._handleException( "Coordinates not Found" );
        }

        const color4 = Color.createColor( this._getFillColor( geojson ) ?? GeoJSONLoader.defaultFillColor );
        const extruded_height = this._getExtrudedHeight( geojson ) ?? GeoJSONLoader.defaultExtrudedHeight;

        const altitude_mode = this._getAltitudeMode( geojson ) ?? getMaprayAltitudeMode( geojson ) ?? GeoJSONLoader.defaultAltitudeMode;
        const altitude = this._getAltitude( geojson );
        const visibility = this._getVisibility( geojson ) ?? getMaprayVisibility( geojson ) ?? GeoJSONLoader.defaultVisibility;

        const type = geometry.type;
        const rgb = Color.copyOpaqueColor( color4, GeoMath.createVector3() );
        const alpha = color4[3];

        // If multiline, split entity
        if ( type === GEOMETRY_TYPES.MULTI_POLYGON ) {
            const multiPolygonGeometry = geometry as GeoJSON.MultiPolygonGeometryJson;
            if ( !Array.isArray( geometry.coordinates ) || !geometry.coordinates.length ) { // For type "MultiPolygon", the "coordinates" member must be an array of Polygon coordinate arrays.
                return this._handleException( "Invalid coordinates: For type 'MultiPolygon', the 'coordinates' member MUST be an array of Polygon coordinate arrays." );
            }
            let noError = true;
            multiPolygonGeometry.coordinates.forEach( points => {
                const flag = this._generatePolygon( points, rgb, alpha, altitude_mode, altitude, extruded_height, visibility, geojson );
                if ( !flag ) noError = false;
            } );
            return noError;
        }
        else { // type === GEOMETRY_TYPES.POLYGON
            const polygonGeometry = geometry as GeoJSON.PolygonGeometryJson;
            return this._generatePolygon( polygonGeometry.coordinates, rgb, alpha, altitude_mode, altitude, extruded_height, visibility, geojson );
        }
    }


    /**
     * Create Polygon
     */
    private _generatePolygon( pointsList: GeoJSON.CoordinatesJson[][], color: Vector3, opacity: number, altitude_mode: AltitudeMode, altitude: number | undefined, extruded_height: number, visibility: boolean, geojson: GeoJSON.FeatureJson ): boolean
    {
        const entity = new PolygonEntity( this._scene );
        entity.altitude_mode = altitude_mode;
        entity.extruded_height = extruded_height;
        entity.setColor( color );
        entity.setOpacity( opacity );
        entity.setVisibility( visibility );
        for ( let i = 0; i < pointsList.length; i++ ) {
            if ( !GeoJSON.isCoordinatesArrayJson( pointsList[i] ) ) { // A position is an array of numbers. There MUST be two or more elements.
                return this._handleException( "Invalid coordinates: A position is an array of numbers. There MUST be two or more elements." );
            }
            if ( pointsList[i].length < 4 ) { // For type "Polygon", the "coordinates" member MUST be an array of linear ring coordinate arrays. A linear ring is a closed LineString with four or more positions.
                return this._handleException( "Invalid coordinates: For type 'Polygon', the 'coordinates' member MUST be an array of linear ring coordinate arrays. A linear ring is a closed LineString with four or more positions." );
            }
            const fp = this._flatten( pointsList[i], altitude, pointsList[i].length-1 );
            if ( i === 0 ) entity.addOuterBoundary( fp );
            else entity.addInnerBoundary( fp );
        }
        this._onEntity( this, entity, geojson );

        return true;
    }


    private _flatten( array: GeoJSON.CoordinatesJson[], altitude: number | undefined, len: number = array.length ): number[]
    {
        return array.reduce( ( arr: number[], v: GeoJSON.CoordinatesJson, index: number ) => (
            index >= len ? arr :
            arr.concat( v.slice( 0, 2 ), ( altitude ?? v[2] ?? GeoJSONLoader.defaultAltitude ) )
        ), [] );
    }


    private _handleException( message: string ): false
    {
        if ( !this._ignoreFeatureError ) throw new Error( message );
        console.warn( message );
        return false;
    }
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

    getPointFGColor?: ( geojson: GeoJSON.FeatureJson ) => Vector3 | undefined;

    getPointBGColor?: ( geojson: GeoJSON.FeatureJson ) => Vector3 | undefined;

    getPointSize?: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    getPointIconId?: ( geojson: GeoJSON.FeatureJson ) => string | undefined;

    getLineColor?: ( geojson: GeoJSON.FeatureJson ) => Vector3 | Vector4 | undefined;

    getLineWidth?: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    getFillColor?: ( geojson: GeoJSON.FeatureJson ) => Vector3 | Vector4 | undefined;

    getExtrudedHeight?: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    getAltitudeMode?: ( geojson: GeoJSON.FeatureJson ) => AltitudeMode | undefined;

    getAltitude?: ( geojson: GeoJSON.FeatureJson ) => number | undefined;

    getVisibility?: ( geojson: GeoJSON.FeatureJson ) => boolean | undefined;

}



export const defaultPointFGColor = GeoMath.createVector3( [1.0, 1.0, 1.0] );

export const defaultPointBGColor = GeoMath.createVector3( [0.35, 0.61, 0.81] );

export const defaultPointSize = 30;

export const defaultPointIconId = undefined;

export const defaultLineColor = GeoMath.createVector4( [0, 0, 0, 1] );

export const defaultLineWidth = 1;

export const defaultFillColor = GeoMath.createVector4( [0, 0, 0, 1] );

export const defaultExtrudedHeight = 0.0;

export const defaultAltitudeMode = AltitudeMode.ABSOLUTE;

export const defaultAltitude = 0.0;

export const defaultVisibility = true;

export const defaultIgnoreFeatureError = false;


} // namespace GeoJSONLoader



const emptyCallback = () => undefined;



function getMaprayAltitudeMode( geojson: GeoJSON.FeatureJson ): AltitudeMode | undefined
{
    const altitude_mode = geojson.mapray?.altitudeMode;
    return (
        altitude_mode === "CLAMP"    ? AltitudeMode.CLAMP:
        altitude_mode === "RELATIVE" ? AltitudeMode.RELATIVE:
        altitude_mode === "ABSOLUTE" ? AltitudeMode.ABSOLUTE:
        undefined
    );
}


function getMaprayVisibility( geojson: GeoJSON.FeatureJson ): boolean | undefined
{
    return geojson.mapray?.visibility ?? undefined;
}


// const TYPES = {
//     FEATURE: "Feature",
//     FEATURE_COLLECTION: "FeatureCollection",
// };

const GEOMETRY_TYPES = {
    POINT: "Point",
    MULTI_POINT: "MultiPoint",
    LINE_STRING: "LineString",
    MULTI_LINE_STRING: "MultiLineString",
    POLYGON: "Polygon",
    MULTI_POLYGON: "MultiPolygon",
    GEOMETRY_COLLECTION: "GeometryCollection",
    FEATURE: "Feature"
};

// const SUPPORTED_GEOMETRY_TYPES = Object.values( GEOMETRY_TYPES );



export default GeoJSONLoader;
