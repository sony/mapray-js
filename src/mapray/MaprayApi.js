import HTTP from "./HTTP";
import Resource from "./Resource";


class FetchError extends Error {
    constructor( message, response, cause )
    {
        super( message );
        if ( Error.captureStackTrace ) {
            Error.captureStackTrace( this, FetchError );
        }
        this.name = "FetchError";
        this.response = response;
        this.cause = cause;
        if ( cause ) {
            this.stack += "\nCausedBy: " + cause.stack;
        }
    }
}



class MaprayApiError extends FetchError {
    constructor( code, message, response, cause )
    {
        super( message + " [" + code + "]" );
        if ( Error.captureStackTrace ) {
            Error.captureStackTrace( this, MaprayApiError );
        }
        this.name = "MaprayApiError";
        this.code = code;
        this.resonse = response;
        this.cause = cause;
        if (cause) {
            this.stack += "\nCausedBy: " + cause.stack;
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
        return this.get( "datasets", [ opt.userId ] );
    }

    createDataset( name, description )
    {
        var opt = this._option;
        var body = {
            name,
            description
        };
        return this.post( "datasets", [ opt.userId ], body );
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
        return this.post( "datasets", [ opt.userId, datasetId, "features" ], feature );
    }

    updateFeature( datasetId, featureId, feature )
    {
        var opt = this._option;
        return this.put( "datasets", [ opt.userId, "features", featureId ], feature );
    }

// ======

    get( api, args, option={} )
    {
        return this.fetch( HTTP.METHOD.GET, api, args, null, option );
    }

    post( api, args, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return this.fetch( HTTP.METHOD.POST, api, args, body, option );
    }

    put( api, args, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return this.fetch( HTTP.METHOD.PUT, api, args, body, option );
    }

    delete( api, args, option={} )
    {
        return this.fetch( HTTP.METHOD.DELETE, api, args, null, option );
    }

    fetch( method, api, args, body, option={} )
    {
        var opt = this._option;
        var headers = option.headers || (option.headers={});
        headers["x-api-key"] = opt.token;
        var url = opt.basePath + "/" + api + "/" + opt.version + (args.length > 0 ? "/" + args.join("/") : "");
        // console.log( "MaprayAPI: " + method + " " + api + " (" + args.join("/") + ")" );
        console.log( "MaprayAPI: " + method + " " + url );
        return (
            HTTP.fetch( method, url, body, option )
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
                    if ( error.name === "FetchError" ) {
                        return (
                            error.response.json()
                            .catch( additionalError => {
                                    // Couldn't get additional info of the error.
                                    // throw original error.
                                    throw error;
                            } )
                            .then( errorObject => {
                                    throw new MaprayApiError( errorObject.code, errorObject.error, error.response, error );
                            } )
                        );
                    }
                    throw error;
            } )
        );
    }
}



// MaprayApi.BASE_PATH = "https://api.mapray.com";
// MaprayApi.BASE_PATH = "https://cloud.mapray.com";
MaprayApi.CLOUD_BASE_PATH = "http://localhost:8080";


export default MaprayApi;
