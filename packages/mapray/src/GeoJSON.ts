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



} // namespace GeoJSON


export default GeoJSON;
