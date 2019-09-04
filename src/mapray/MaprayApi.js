import HTTP from "./HTTP";
import Resource from "./Resource";
import { FetchError } from "./HTTP";


class MaprayApiError extends FetchError {
    constructor( code, message, url, response, cause )
    {
        super( message + " [" + code + "]", url );
        if ( Error.captureStackTrace ) {
            Error.captureStackTrace( this, MaprayApiError );
        }
        this.name = "MaprayApiError";
        this.code = code;
        this.resonse = response;
        this.cause = cause;
        if (cause) {
            this.stack += "\nCaused-By: " + cause.stack;
        }
    }
}



export class MaprayResource extends Resource {
    constructor( api ) {
        super();
        this._api = api;
    }

    get type() {
        throw new Error( "Not Implemented" );
    }
}

export class DatasetResource extends MaprayResource {
    constructor( api, datasetId )
    {
        super( api );
        this._datasetId = datasetId;
    }

    get type() {
        return "Dataset";
    }

    load() {
        return this._api.listFeatures( this._datasetId );
    }
}



/**
 * MaprayApi
 * 
 * @classdesc
 * <p>視点を表現するカメラである。</p>
 * <p>インスタンスは {@link mapray.Viewer#camera} から得ることができる。</p>
 *
 * @hideconstructor
 * @memberof mapray
 * @see mapray.Viewer
 * @example
 * var api = new mapray.MaprayApi( { token: "..." } );
 * api.
 */
class MaprayApi extends HTTP {

    /**
     * 
     */
    constructor( option = {} )
    {
        super();
        var basePath = option.basePath.endsWith("/") ? option.basePath.slice(0, -1) : option.basePath;
        this._option = {
            token: option.token,
            version: option.version,
            basePath: basePath,
            userId: option.userId
        };
    }

    getDatasetAsResource( datasetId ) {
        return new DatasetResource( this, datasetId );
    }

// =====

    getDatasets()
    {
        var opt = this._option;
        return this.get( "datasets", [ opt.userId ], null );
    }

    createDataset( name, description )
    {
        var opt = this._option;
        var body = {
            name,
            description
        };
        return this.post( "datasets", [ opt.userId ], null, body );
    }

    deleteDataset( datasetId )
    {
        var opt = this._option;
        return this.delete( "datasets", [ opt.userId, datasetId ] );
    }

    listFeatures( datasetId ) {
        var opt = this._option;
        return this.get( "datasets", [ opt.userId, datasetId, "features" ] );
    }

    insertFeature( datasetId, feature ) {
        var opt = this._option;
        return this.post( "datasets", [ opt.userId, datasetId, "features" ], null, feature );
    }

    updateFeature( datasetId, featureId, feature )
    {
        var opt = this._option;
        return this.put( "datasets", [ opt.userId, "features", featureId ], null, feature );
    }

    list3DDatasets() {
        const opt = this._option;
        return this.get( "3ddatasets", [ opt.userId ] );
    }

    create3DDataset( name, description, coordinateSystem ) {
        const opt = this._option;
        const body = {
            name,
            description,
            path: coordinateSystem.path,
            format: coordinateSystem.format,
            srid: coordinateSystem.srid,
            x: coordinateSystem.x,
            y: coordinateSystem.y,
            z: coordinateSystem.z
        };
        return this.post( "3ddatasets", [ opt.userId ], null, body );
    }

    create3DDatasetUploadUrl( datasetId ) {
        const opt = this._option;
        return this.post( "3ddatasets", [ "uploads", opt.userId, datasetId ], null, {} );
    }

    get3DDataset( datasetId ) {
        const opt = this._option;
        return this.get( "3ddatasets", [ opt.userId, datasetId ], null );
    }

    delete3DDataset( datasetId ) {
        const opt = this._option;
        return this.delete( "3ddatasets", [ opt.userId, datasetId ] );
    }

    get3DDatasetScene( datasetId ) {
        const opt = this._option;
        return this.get( "3ddatasets", [ "scene", opt.userId ], { "3DdatasetsID": datasetId } );
    }

// ======

    get( api, args, query, option={} )
    {
        return this.fetch( HTTP.METHOD.GET, api, args, query, null, option );
    }

    post( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return this.fetch( HTTP.METHOD.POST, api, args, query, body, option );
    }

    put( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return this.fetch( HTTP.METHOD.PUT, api, args, query, body, option );
    }

    delete( api, args, query, option={} )
    {
        return this.fetch( HTTP.METHOD.DELETE, api, args, query, null, option );
    }

    fetch( method, api, args, query, body, option={} )
    {
        var opt = this._option;
        var headers = option.headers || (option.headers={});
        headers["x-api-key"] = opt.token;
        var url = opt.basePath + "/" + api + "/" + opt.version + (args.length > 0 ? "/" + args.join("/") : "");
        // console.log( "MaprayAPI: " + method + " " + api + " (" + args.join("/") + ")" );
        console.log( "MaprayAPI: " + method + " " + url + (query ? "?" + JSON.stringify(query) : "" ) );
        return (
            HTTP.fetch( method, url, query, body, option )
            .then( response => {
                    if ( response.status === HTTP.RESPONSE_STATUS.NO_CONTENT ) {
                        return;
                    }
                    var mimeType = response.headers.get( HTTP.CONTENT_TYPE );
                    if ( HTTP.isJson( mimeType ) ) {
                        return response.json();
                    }
                    else {
                        console.log( "Unsupported Mime Type: " + mimeType );
                    }
            })
            .catch( error => {
                    if ( error.name === "FetchError" && error.response ) {
                        return (
                            error.response.json()
                            .catch( additionalError => {
                                    // Couldn't get additional info of the error.
                                    // throw original error.
                                    throw new MaprayApiError( -1, "Failed to fetch", url, null, error );
                            } )
                            .then( errorObject => {
                                    throw new MaprayApiError( errorObject.code, errorObject.error, url, error.response, error );
                            } )
                        );
                    }
                    else {
                        throw new MaprayApiError( -1, "Failed to fetch", url, null, error );
                    }
            } )
        );
    }
}



// MaprayApi.BASE_PATH = "https://api.mapray.com";
// MaprayApi.BASE_PATH = "https://cloud.mapray.com";
MaprayApi.CLOUD_BASE_PATH = "http://localhost:8080";


export default MaprayApi;
