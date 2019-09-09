import HTTP from "./HTTP";
import Resource from "./Resource";
import Dom from "./util/Dom";
import { FetchError } from "./HTTP";
import SceneLoader from "./SceneLoader";



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

export class Dataset3DSceneResource extends MaprayResource {
    constructor( api, datasetIds )
    {
        super( api );
        if ( !Array.isArray( datasetIds ) ) {
            datasetIds = [ datasetIds ];
        }
        this._datasetIds = datasetIds;
    }

    get type() {
        return "3DDatasetScene";
    }

    load() {
        return (
            this._api.get3DDatasetScene( this._datasetIds )
            .then( response => {
                    return response;
            } )
        );
    }

    loadSubResourceSupported() {
        return true;
    }

    loadSubResource( subUrl, resourceType ) {
        const url = Dom.resolveUrl( this._base_url, subUrl );
        return this._api.fetch( HTTP.METHOD.GET, url )
    }

    resolveResourceSupported() {
      return true;
    }

    resolveResource( subUrl ) {
        return new Dataset3DSceneBlobResource( this._api, subUrl, {
                transform: this._transform
        });
    }

}


export class Dataset3DSceneBlobResource extends MaprayResource {
    constructor( api, url )
    {
        super( api );
        this._url = url;
        const index = url.lastIndexOf( "/" );
        if ( index === -1 ) throw new Error( "invalid url" );
        this._base_url = this._url.substr( 0, index + 1 );
    }

    get type() {
        return "3DDatasetSceneBlob";
    }

    load() {
        return this._api.fetch( HTTP.METHOD.GET, this._url );
    }

    loadSubResourceSupported() {
        return true;
    }

    loadSubResource( subUrl, resourceType ) {
        const url = Dom.resolveUrl( this._base_url, subUrl );
        
        if ( resourceType === SceneLoader.ResourceType.BINARY ) {
            return (
                this._api.fetch( HTTP.METHOD.GET, url )
                .then( response => {
                        if ( !response.ok ) throw new Error( response.statusText );
                        return response.arrayBuffer();
                })
            );
        }
        else if ( resourceType === SceneLoader.ResourceType.IMAGE ) {
            return (
                this._api.fetch( HTTP.METHOD.GET, url )
                .then( response => {
                        if ( !response.ok ) throw new Error( response.statusText );
                        return response.blob();
                } )
                .then( Dom.loadImage )
            );
        }
        return this._api.fetch( HTTP.METHOD.GET, subUrl )
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

    get3DDatasetAsResource( datasetIds ) {
        return new Dataset3DSceneResource( this, datasetIds );
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

    update3DDataset( datasetId, name, description, coordinateSystem ) {
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
        return this.patch( "3ddatasets", [ opt.userId, datasetId ], null, body );
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

    get3DDatasetScene( datasetIds ) {
        const opt = this._option;
        return this.get( "3ddatasets", [ "scene", opt.userId ], { "3ddatasets_ids": Array.isArray(datasetIds) ? datasetIds.join(",") : datasetIds } );
    }

// ======

    /**
     * @protected
     */
    get( api, args, query, option={} )
    {
        return this.fetchAPI( HTTP.METHOD.GET, api, args, query, null, option );
    }

    /**
     * @protected
     */
    post( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return this.fetchAPI( HTTP.METHOD.POST, api, args, query, body, option );
    }

    /**
     * @protected
     */
    patch( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return this.fetchAPI( HTTP.METHOD.PATCH, api, args, query, body, option );
    }

    /**
     * @protected
     */
    put( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return this.fetchAPI( HTTP.METHOD.PUT, api, args, query, body, option );
    }

    /**
     * @protected
     */
    delete( api, args, query, option={} )
    {
        return this.fetchAPI( HTTP.METHOD.DELETE, api, args, query, null, option );
    }

// ======

    /**
     * @protected
     */
    fetchAPI( method, api, args, query, body, option={} )
    {
        var opt = this._option;
        var url = opt.basePath + "/" + api + "/" + opt.version + (args.length > 0 ? "/" + args.join("/") : "");
        // console.log( "MaprayAPI: " + method + " " + api + " (" + args.join("/") + ")" );
        console.log( "MaprayAPI: " + method + " " + url + (query ? "?" + JSON.stringify(query) : "" ) );
        return this.fetch( method, url, query, body, option );
    }

    /**
     * @protected
     */
    fetch( method, url, query, body, option={} )
    {
        var opt = this._option;
        var headers = option.headers || (option.headers={});
        headers["x-api-key"] = opt.token;
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
                        return response;
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
MaprayApi.CLOUD_BASE_PATH = "http://localhost:8080"; // @ToDo remove this


export default MaprayApi;
