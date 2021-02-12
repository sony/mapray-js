import HTTP, { FetchError } from "./HTTP";
import { Dataset, Dataset3D, PointCloudDataset, B3dDataset } from "./MaprayApiModel";
import { DatasetResource, Dataset3DSceneResource, PointCloudDatasetResource, B3dDatasetResource  }  from "./MaprayApiResource";



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
 * @summary Mapray Cloudへアクセスするためのクラスです。
 * @classdesc
 * <p>
 * このクラスを利用するには事前にMapray Cloudアカウントを作成する必要があります。
 * <a href="https://cloud.mapray.com/">https://cloud.mapray.com</a>からサインアップすることができます。
 * </p>
 * <p>
 * 事前に下記の情報を調べておきます。
 * </p>
 * <dl>
 * <dt>User ID
 * <dd>Mapray Cloudの<a href="https://cloud.mapray.com/settings" target="_blank">ユーザー情報ページ</a>から確認します。
 * 右上メニューのAccountメニューからこのページを開くことができます。
 * <dt>Token
 * <dd>Mapray Cloudの<a href="https://cloud.mapray.com/dashboard" target="_blank">Tokenページ</a>でトークンを作成します。
 * 上部のTokensタブからこのページを開くことができます。
 * <dt>データセット等のID
 * <dd>Mapray Cloudへデータをアップロードし、そのデータを使用するには、<a href="https://cloud.mapray.com/datasetslist">データセットページ</a>
 * からGeoJsonやglTFデータをアップロードしておき、表中のIDを確認します。
 * </dl>
 *
 * @memberof mapray
 * @example
 * const maprayApi = new mapray.MaprayApi({
 *         basePath: "https://api.mapray.com",
 *         version: "v1",
 *         userId: "...",
 *         token: "..."
 * });
 * const datasets = await maprayApi.getDatasets();
 * ...
 */
class MaprayApi extends HTTP {

    /**
     * @param {object} option
     * @param {string} [option.basePath=https://cloud.mapray.com] Mapray CloudのURLを指定します。通常は省略します。
     * @param {string} option.version Mapray Cloud の APIバージョン "v1" のように指定します。
     * @param {string} option.userId Mapray Cloud アカウントの User ID を指定します。
     * @param {string} option.token Mapray Cloud で生成した Token を指定します。
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
     * ページごとにデータセットリストを取得します。
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {Dataset[]}
     */
    async loadDatasets( page=1, limit=5 ) {
        const datasets_json = await this.getDatasets( page, limit );
        return datasets_json.map( dataset_json => Dataset.createFromJson( this, dataset_json ) );
    }

    /**
     * @summary 指定したIDのデータセットを取得します。
     * @param {string} datasetId データセットのID
     * @return {Dataset}
     */
    async loadDataset( datasetId ) {
        const dataset_json = await this.getDataset( datasetId );
        return Dataset.createFromJson( this, dataset_json );
    }

    /**
     * @summary 3Dデータセットのリストを取得します。
     * ページごとにデータセットリストを取得します。
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {Dataset3D[]}
     */
    async load3DDatasets( page=1, limit=5 ) {
        const datasets_json = await this.get3DDatasets( page, limit );
        return datasets_json.map( dataset_json => Dataset3D.createFromJson( this, dataset_json ) );
    }

    /**
     * @summary 指定したIDの3Dデータセットを取得します。
     * @param {string} datasetId
     * @return {Dataset3D}
     */
    async load3DDataset( datasetId ) {
        const dataset_json = await this.get3DDataset( datasetId );
        return Dataset3D.createFromJson( this, dataset_json )
    }

    /**
     * @summary 点群データセットのリストを取得します。
     * ページごとにデータセットリストを取得します。
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {PointCloudDataset[]}
     */
    async loadPointCloudDatasets( page=1, limit=5 ) {
        const datasets_json = await this.getPointCloudDatasets( page, limit );
        return datasets_json.map( dataset_json => PointCloudDataset.createFromJson( this, dataset_json ) );
    }

    /**
     * @summary 指定したIDの点群データセットを取得します。
     * @param {string} datasetId データセットID
     * @return {PointCloudDataset}
     */
    async loadPointCloudDataset( datasetId ) {
        const dataset_json = await this.getPointCloudDataset( datasetId );
        return PointCloudDataset.createFromJson( this, dataset_json );
    }

    /**
     * @summary 街データセットのリストを取得します。
     * ページごとにデータセットリストを取得します。
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {B3dDataset[]}
     */
    async loadB3dDatasets( page=1, limit=5 ) {
        const datasets_json = await this.getB3dDatasets( page, limit );
        return datasets_json.map( dataset_json => B3dDataset.createFromJson( this, dataset_json ) );
    }

    /**
     * @summary 指定したIDの街データセットを取得します。
     * @param {string} datasetId データセットID
     * @return {B3dDataset}
     */
    async loadB3dDataset( datasetId ) {
        const dataset_json = await this.getB3dDataset( datasetId );
        return B3dDataset.createFromJson( this, dataset_json );
    }

    // Resources

    /**
     * @summary 指定したIDのデータセットをリソースとして取得します。
     * @param {string} datasetId データセットID
     * @return {Resource}
     */
    getDatasetAsResource( datasetId ) {
        return new DatasetResource( this, datasetId );
    }

    /**
     * @summary 指定したIDの3Dデータセットのシーンファイルをリソースとして取得します。
     * @param {string[]} datasetId データセットIDのリスト
     * @return {Resource}
     */
    get3DDatasetAsResource( datasetIds ) {
        return new Dataset3DSceneResource( this, datasetIds );
    }

    /**
     * @summary 指定したIDの点群データセットの定義ファイルをリソースとして取得します。
     * @param {string} datasetId データセットID
     * @return {Resource}
     */
    getPointCloudDatasetAsResource( datasetId ) {
        return new PointCloudDatasetResource( this, datasetId );
    }

    /**
     * @summary 指定したIDの街データセットの定義ファイルをリソースとして取得します。
     * @param {string} datasetId データセットID
     * @return {Resource}
     */
    getB3dDatasetAsResource( datasetId ) {
        return new B3dDatasetResource( this, datasetId );
    }


    // RestAPI

    /**
     * @summary データセットリストを取得します
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {object} json
     */
    async getDatasets( page=1, limit=5 )
    {
        var opt = this._option;
        return await this.get( "datasets", [ opt.userId ], { page, limit } );
    }

    /**
     * @summary get dataset
     * @param {string} datasetId
     * @return {object} json
     */
    async getDataset( datasetId )
    {
        var opt = this._option;
        return await this.get( "datasets", [ opt.userId, datasetId ], null );
    }

    /**
     * @summary データセットを作成します。
     * @param {string} name 名前
     * @param {string} description 説明
     * @return {object}
     */
    async createDataset( name, description )
    {
        var opt = this._option;
        var body = {
            name,
            description
        };
        return await this.post( "datasets", [ opt.userId ], null, body );
    }

    /**
     * @summary データセットを削除します。
     * @return {object} json
     */
    async deleteDataset( datasetId/*, option={ wait: true }*/ )
    {
        var opt = this._option;
        return await this.delete( "datasets", [ opt.userId, datasetId ] );
    }

    /**
     * @summary GeoJSONの内容を取得します。
     * @param {string} datasetId データセットID
     * @return {object} json
     */
    async getFeatures( datasetId ) {
        var opt = this._option;
        return await this.get( "datasets", [ opt.userId, datasetId, "features" ] );
    }

    /**
     * @summary GeoJSON要素をアップロード（挿入）します。
     * @param {string} datasetId データセットID
     * @return {object} json
     */
    async insertFeature( datasetId, feature ) {
        var opt = this._option;
        return await this.post( "datasets", [ opt.userId, datasetId, "features" ], null, feature );
    }

    /**
     * @summary GeoJSON要素を更新（上書き）します。
     * @param {string} datasetId データセットID
     * @param {string} featureId GeoJSON要素ID
     * @param {object} feature GeoJSON要素
     * @return {object} json
     */
    async updateFeature( datasetId, featureId, feature )
    {
        var opt = this._option;
        return await this.put( "datasets", [ opt.userId, "features", featureId ], null, feature );
    }

    /**
     * @summary 3Dデータセットのリストを取得します。
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {object} json
     */
    async get3DDatasets( page=1, limit=5 ) {
        const opt = this._option;
        return await this.get( "3ddatasets", [ opt.userId ], { page, limit } );
    }

    /**
     * @summary 3D datastを作成します。
     * @param {string} name 名前
     * @param {string} description 説明
     * @param {object} option
     * @param {string} option.path glTFファイルのパスを指定します（アップロードする際はディレクトリを指定するため、ディレクトリルートからのglTFファイルへのパスを指定します）
     * @param {string} option.format "glTF"を指定します
     * @param {string} option.srid 現在は4326（WGS 84）を指定します
     * @param {number} option.x 経度
     * @param {number} option.y 緯度
     * @param {number} option.z 高さ
     * @return {object} json
     */
    async create3DDataset( name, description, option ) {
        const opt = this._option;
        const body = {
            name,
            description,
            path: option.path,
            format: option.format,
            srid: option.srid,
            x: option.x,
            y: option.y,
            z: option.z
        };
        return await this.post( "3ddatasets", [ opt.userId ], null, body );
    }

    /**
     * @summary 3Dデータセットを更新します。
     * @param {string} datasetId データセットId
     * @param {string} name 名前
     * @param {string} description 説明
     * @param {object} option
     * @param {string} option.path glTFファイルのパスを指定します（アップロードする際はディレクトリを指定するため、ディレクトリルートからのglTFファイルへのパスを指定します）
     * @param {string} option.format "glTF"を指定します
     * @param {string} option.srid 現在は4326（WGS 84）を指定します
     * @param {number} option.x 経度
     * @param {number} option.y 緯度
     * @param {number} option.z 高さ
     * @return {object} json
     */
    async update3DDataset( datasetId, name, description, option ) {
        const opt = this._option;
        const body = {
            name,
            description,
            path: option.path,
            format: option.format,
            srid: option.srid,
            x: option.x,
            y: option.y,
            z: option.z
        };
        return await this.patch( "3ddatasets", [ opt.userId, datasetId ], null, body );
    }

    /**
     * @summary 3Dデータセットアップロード用URLを取得します。
     * @param {string} datasetId データセットId
     * @return {object} json
     */
    async create3DDatasetUploadUrl( datasetId ) {
        const opt = this._option;
        return await this.post( "3ddatasets", [ "uploads", opt.userId, datasetId ], null, {} );
    }

    /**
     * @summary 3Dデータセット情報を取得します。
     * データセットが保持するデータにアクセスするには、get3DDatasetScene()を利用します。
     * @param {string} datasetId データセットId
     * @return {object} json
     */
    async get3DDataset( datasetId ) {
        const opt = this._option;
        return await this.get( "3ddatasets", [ opt.userId, datasetId ], null );
    }

    /**
     * @summary 3Dデータセットを削除します。
     * @param {string} datasetId データセットId
     * @return {object} json
     */
    async delete3DDataset( datasetId ) {
        const opt = this._option;
        return await this.delete( "3ddatasets", [ opt.userId, datasetId ] );
    }

    /**
     * @summary 3Dデータセットに含まれる scene情報 を取得します。
     * @param {string|string[]} datasetIds
     * @return {object} シーンファイルの実体
     */
    async get3DDatasetScene( datasetIds ) {
        const opt = this._option;
        const response = await this.get( "3ddatasets", [ "scene", opt.userId ], { "3ddatasets_ids": Array.isArray(datasetIds) ? datasetIds.join(",") : datasetIds } );
        response.entity_list.forEach(entity => {
                const indexStr = entity.index;
                const index = parseInt(indexStr);
                if (index.toString() !== indexStr) {
                    throw new Error("Internal Error: ID couldn't be convert to 'number'");
                }
                entity.index = index;
        });
        return response;
    }

    /**
     * @summary 点群データセットリストを取得します。
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {object} json
     */
    async getPointCloudDatasets( page=1, limit=5 ) {
        const opt = this._option;
        return await this.get( "pcdatasets", [ opt.userId ], { page, limit } );
    }

    /**
     * @summary 点群データセットを取得します。
     * @param {string} datasetId データセットId
     * @return {object} json
     */
    async getPointCloudDataset( datasetId ) {
        const opt = this._option;
        return await this.get( "pcdatasets", [ opt.userId, datasetId ] )
    }

    /**
     * @summary 街データセットリストを取得します。
     * @param {number} [page=1] 取得する要素のページ番号
     * @param {number} [limit=5] 1ページに含まれる要素数。最大100まで指定することができます。
     * @return {object} json
     */
    async getB3dDatasets( page=1, limit=5 ) {
        const opt = this._option;
        return await this.get( "b3ddatasets", [ opt.userId ], { page, limit } );
    }

    /**
     * @summary 街データセットを取得します。
     * @param {string} datasetId データセットId
     * @return {object} json
     */
    async getB3dDataset( datasetId ) {
        const opt = this._option;
        return await this.get( "b3ddatasets", [ opt.userId, datasetId ] )
    }

    /**
     * @private
     * @return {object} json
     */
    async get( api, args, query, option={} )
    {
        return await this.fetchAPI( HTTP.METHOD.GET, api, args, query, null, option );
    }

    /**
     * @private
     * @return {object} json
     */
    async post( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return await this.fetchAPI( HTTP.METHOD.POST, api, args, query, body, option );
    }

    /**
     * @private
     * @return {object} json
     */
    async patch( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return await this.fetchAPI( HTTP.METHOD.PATCH, api, args, query, body, option );
    }

    /**
     * @private
     * @return {object} json
     */
    async put( api, args, query, body, option={} )
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return await this.fetchAPI( HTTP.METHOD.PUT, api, args, query, body, option );
    }

    /**
     * @private
     * @return {object} json
     */
    async delete( api, args, query, option={} )
    {
        return await this.fetchAPI( HTTP.METHOD.DELETE, api, args, query, null, option );
    }

    /**
     * @private
     * @return {object} json
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
     * @private
     */
    async fetch( method, url, query, body, option={} )
    {
        var opt = this._option;
        var headers = option.headers || (option.headers={});
        headers["x-api-key"] = opt.token;

        let response;
        try {
            response = await HTTP.fetch( method, url, query, body, option );
        }
        catch( error ) {
            if ( error.name === "FetchError" && error.response ) {
                let errorResponseJson;
                try {
                    errorResponseJson = await error.response.json();
                }
                catch( additionalError ) {
                    // Couldn't get additional info of the error.
                    // throw original error.
                    throw new MaprayApiError( -1, "Failed to fetch", url, null, error );
                }
                throw new MaprayApiError( errorObject.code, errorObject.error, url, error.response, error );
            }
            else {
                throw new MaprayApiError( -1, "Failed to fetch", url, null, error );
            }
        }
        return response;
    }
}



MaprayApi.DEFAULT_BASE_PATH = "https://cloud.mapray.com";



export default MaprayApi;
