import HTTP, { FetchError } from "./HTTP";
import { Dataset, Dataset3D, PointCloudDataset } from "./MaprayApiModel";
import { DatasetResource, Dataset3DSceneResource, PointCloudDatasetResource,  }  from "./MaprayApiResource";



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



/**
 * MaprayApi
 * 
 * @classdesc
 * <p>MaprayApiへアクセスする手段を提供します。</p>
 *
 * @memberof mapray
 * @example
 * const maprayApi = new mapray.MaprayApi({
 *         basePath: "https://api.mapray.com",
 *         version: "v1",
 *         userId: "...",
 *         token: "..."
 * });
 * maprayApi.getDatasets();
 */
class MaprayApi extends HTTP {

    /**
     * @param {object} option Option
     * @param {string} [option.basePath]
     * @param {string} option.version
     * @param {string} option.userId
     * @param {string} option.token
     */
    constructor( option = {} )
    {
        super();
        var basePath = option.basePath.endsWith("/") ? option.basePath.slice(0, -1) : option.basePath;
        this._option = {
            basePath: basePath || DEFAULT_BASE_PATH,
            version: option.version,
            token: option.token,
            userId: option.userId
        };
    }


    // Dataset, 3DDataset, PointCloudDataset

    /**
     * @summary データセットのリストを取得します。
     * @return {Promise<Dataset[]>}
     */
    async loadDatasets() {
        const datasets_json = await this.getDatasets();
        return datasets_json.map( dataset_json => Dataset.createFromJson( this, dataset_json ) );
    }

    /**
     * @summary 指定したIDのデータセットを取得します。
     * @param {string} datasetId
     * @return {Promise<Dataset>}
     */
    async loadDataset( datasetId ) {
        const dataset_json = await this.getDataset( datasetId );
        return Dataset.createFromJson( this, dataset_json );
    }

    /**
     * @summary 3Dデータセットのリストを取得します。
     * @return {Promise<Dataset3D[]>}
     */
    async load3DDatasets() {
        const datasets_json = await this.get3DDatasets();
        return datasets_json.map( dataset_json => Dataset3D.createFromJson( this, dataset_json ) );
    }

    /**
     * @summary 指定したIDの3Dデータセットを取得します。
     * @param {string} datasetId
     * @return {Promise<Dataset3D>}
     */
    async load3DDataset( datasetId ) {
        const dataset_json = await this.get3DDataset( datasetId );
        return Dataset3D.createFromJson( this, dataset_json )
    }

    /**
     * @summary 点群データセットのリストを取得します。
     * @return {Promise<PointCloudDataset[]>}
     */
    async loadPointCloudDatasets() {
        const datasets_json = await this.getPointCloudDatasets();
        return datasets_json.map( dataset_json => PointCloudDataset.createFromJson( this, dataset_json ) );
    }

    /**
     * @summary 指定したIDの点群データセットを取得します。
     * @param {string} datasetId
     * @return {Promise<PointCloudDataset>}
     */
    async loadPointCloudDataset( datasetId ) {
        const dataset_json = await this.getPointCloudDataset( datasetId );
        return PointCloudDataset.createFromJson( this, dataset_json );
    }


    // Resources

    /**
     * @summary 指定したIDのデータセットをリソースとして取得します。
     * @param {string} datasetId
     * @return {Resource}
     */
    getDatasetAsResource( datasetId ) {
        return new DatasetResource( this, datasetId );
    }

    /**
     * @summary 指定したIDの3Dデータセットのシーンファイルをリソースとして取得します。
     * @param {string} datasetId
     * @return {Resource}
     */
    get3DDatasetAsResource( datasetIds ) {
        return new Dataset3DSceneResource( this, datasetIds );
    }

    /**
     * @summary 指定したIDの点群データセットの定義ファイルをリソースとして取得します。
     * @param {string} datasetId
     * @return {Resource}
     */
    getPointCloudDatasetAsResource( datasetId ) {
        return new PointCloudDatasetResource( this, datasetId );
    }


    // RestAPI

    /**
     * @summary get datasets
     * @return {Promise<object>} json
     */
    getDatasets()
    {
        var opt = this._option;
        return this.get( "datasets", [ opt.userId ], null );
    }

    /**
     * @summary get dataset
     * @param {string} datasetId
     * @return {Promise<object>} json
     */
    getDataset( datasetId )
    {
        var opt = this._option;
        return this.get( "datasets", [ opt.userId, datasetId ], null );
    }

    /**
     * @summary create a dataset
     * @param {string} name
     * @param {string} description
     * @return {Promise<object>} json
     */
    createDataset( name, description )
    {
        var opt = this._option;
        var body = {
            name,
            description
        };
        return this.post( "datasets", [ opt.userId ], null, body );
    }

    /**
     * @summary Delete a dataset
     * @return {Promise<object>} json
     */
    deleteDataset( datasetId/*, option={ wait: true }*/ )
    {
        var opt = this._option;
        return this.delete( "datasets", [ opt.userId, datasetId ] );
    }

    /**
     * @summary get Features
     * @param {string} datasetId
     * @return {Promise<object>} json
     */
    getFeatures( datasetId ) {
        var opt = this._option;
        return this.get( "datasets", [ opt.userId, datasetId, "features" ] );
    }

    /**
     * @summary Insert feature
     * @return {Promise<object>} json
     */
    insertFeature( datasetId, feature ) {
        var opt = this._option;
        return this.post( "datasets", [ opt.userId, datasetId, "features" ], null, feature );
    }

    /**
     * @summary Update feature
     * @return {Promise<object>} json
     */
    updateFeature( datasetId, featureId, feature )
    {
        var opt = this._option;
        return this.put( "datasets", [ opt.userId, "features", featureId ], null, feature );
    }

    /**
     * @summary get 3D datasts
     * @return {Promise<object>} json
     */
    get3DDatasets() {
        const opt = this._option;
        return this.get( "3ddatasets", [ opt.userId ] );
    }

    /**
     * @summary create 3D datasts
     * @return {Promise<object>} json
     */
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

    /**
     * @summary update 3D datasts
     * @return {Promise<object>} json
     */
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

    /**
     * @summary create 3D datast upload url
     * @return {Promise<object>} json
     */
    create3DDatasetUploadUrl( datasetId ) {
        const opt = this._option;
        return this.post( "3ddatasets", [ "uploads", opt.userId, datasetId ], null, {} );
    }

    /**
     * @summary get 3D datast
     * @return {Promise<object>} json
     */
    get3DDataset( datasetId ) {
        const opt = this._option;
        return this.get( "3ddatasets", [ opt.userId, datasetId ], null );
    }

    /**
     * @summary delete 3D datast
     * @return {Promise<object>} json
     */
    delete3DDataset( datasetId ) {
        const opt = this._option;
        return this.delete( "3ddatasets", [ opt.userId, datasetId ] );
    }

    /**
     * @summary get 3D dataset scene
     * @param {string|string[]} datasetIds
     * @return {object} シーンファイルの実体
     */
    get3DDatasetScene( datasetIds ) {
        const opt = this._option;
        return this.get( "3ddatasets", [ "scene", opt.userId ], { "3ddatasets_ids": Array.isArray(datasetIds) ? datasetIds.join(",") : datasetIds } )
        .then(response => {
            response.entity_list.forEach(entity => {
                const indexStr = entity.index;
                const index = parseInt(indexStr);
                if (index.toString() !== indexStr) {
                  throw new Error("Internal Error: ID couldn't be convert to 'number'");
                }
                entity.index = index;
            });
            return response;
        });
    }

    /**
     * @summary Get Point cloud datasts
     * @return {Promise<object>} json
     */
    getPointCloudDatasets() {
        const opt = this._option;
        return this.get( "pcdatasets", [ opt.userId ] );
    }

    /**
     * @summary Get Point cloud datast
     * @return {Promise<object>} json
     */
    getPointCloudDataset( datasetId ) {
        const opt = this._option;
        return this.get( "pcdatasets", [ opt.userId, datasetId ] )
    }

    /**
     * @protected
     * @return {Promise<object>} json
     */
    get( api, args, query, option={} )
    {
        return this.fetchAPI( HTTP.METHOD.GET, api, args, query, null, option );
    }

    /**
     * @protected
     * @return {Promise<object>} json
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
     * @return {Promise<object>} json
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
     * @return {Promise<object>} json
     */
    async put( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return await this.fetchAPI( HTTP.METHOD.PUT, api, args, query, body, option );
    }

    /**
     * @protected
     * @return {Promise<object>} json
     */
    async delete( api, args, query, option={} )
    {
        return await this.fetchAPI( HTTP.METHOD.DELETE, api, args, query, null, option );
    }

    /**
     * @protected
     * @return {Promise<object>} json
     */
    async fetchAPI( method, api, args, query, body, option={} )
    {
        var opt = this._option;
        var url = opt.basePath + "/" + api + "/" + opt.version + (args.length > 0 ? "/" + args.join("/") : "");
        // console.log( "MaprayAPI: " + method + " " + api + " (" + args.join("/") + ")" );
        const response = await this.fetch( method, url, query, body, option );
        return await response.json();
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



MaprayApi.DEFAULT_BASE_PATH = "https://cloud.mapray.com";



export default MaprayApi;
