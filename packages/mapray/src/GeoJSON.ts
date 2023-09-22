namespace GeoJSON {



export interface NodeJson {
    id: string;
    type: string;
}



export interface FeatureCollectionJson extends NodeJson {
    type: FeatureType.FeatureCollection;
    features: FeatureJson[];
}



export function isFeatureCollectionJson( node: NodeJson ): node is FeatureCollectionJson {
    return node.type === FeatureType.FeatureCollection;
}



export interface FeatureJson extends NodeJson {
    type: FeatureType.Feature;
    geometry: GeometryJson;
    properties?: PropertiesJson;
    /** @internal **/
    mapray?: MaprayJson;
}



export function isFeatureJson( node: NodeJson ): node is FeatureJson {
    return node.type === FeatureType.Feature;
}



export interface PropertiesJson {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}



export interface MaprayJson {
    version: string,
    id: string,
    visibility?: boolean;
    altitudeMode?: "CLAMP" | "RELATIVE" | "ABSOLUTE";
}



export interface GeometryJson extends NodeJson {
    type: string;
}



export interface LineStringGeometryJson extends GeometryJson {
    type: "LineString";
    coordinates: CoordinatesJson[];
}



export interface MultiLineStringGeometryJson extends GeometryJson {
    type: "MultiLineString";
    coordinates: CoordinatesJson[][];
}



export interface PolygonGeometryJson extends GeometryJson {
    type: "Polygon";
    coordinates: CoordinatesJson[][];
}



export interface MultiPolygonGeometryJson extends GeometryJson {
    type: "MultiPolygon";
    coordinates: CoordinatesJson[][][];
}



export interface PointGeometryJson extends GeometryJson {
    type: GeometryType.Point;
    coordinates: CoordinatesJson;
}



export function isPointGeometryJson( node: NodeJson ): node is PointGeometryJson {
    return node.type === GeometryType.Point;
}



export interface MultiPointGeometryJson extends GeometryJson {
    type: "MultiPoint";
    coordinates: CoordinatesJson[];
}



export enum FeatureType {
    Feature = "Feature",
    FeatureCollection = "FeatureCollection",
}



export enum GeometryType {
    Point = "Point",
}



export type CoordinatesJson = Coordinates2DJson | Coordinates3DJson;

export type Coordinates2DJson = [ lng: number, lat: number ];

export type Coordinates3DJson = [ lng: number, lat: number, alt: number ];


export function isCoordinatesJson( point: number[] ): point is CoordinatesJson
{
    // A position is an array of numbers. There MUST be two or more elements.
    if ( !Array.isArray( point ) ) return false;
    if ( point.length < 2 ) return false;
    for ( const coord of point ) {
        if ( typeof coord !== "number" ) return false;
    }
    return true;
}


export function isCoordinatesArrayJson( points: number[][] ): points is CoordinatesJson[]
{
    if ( !Array.isArray( points ) ) return false;
    for ( const point of points ) {
        if ( !Array.isArray( point ) ) return false;
    }
    return true;
}



} // namespace GeoJSON



export default GeoJSON;
