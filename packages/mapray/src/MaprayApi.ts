import HTTP from "./HTTP";
import { Dataset, Dataset3D, PointCloudDataset } from "./MaprayApiModel";
import Resource from "./Resource";
import SceneLoader from "./SceneLoader";
import { DatasetResource, Dataset3DSceneResource, PointCloudDatasetResource,  }  from "./MaprayApiResource";
import GeoJSON from "./GeoJSON";


/**
 * MaprayApiへのアクセスに関わるエラー
 */
class MaprayApiError extends HTTP.FetchError {

    /** エラーコード */
    code: number;

    /** エラー名 */
    name: string;

    /** レスポンスオブジェクト */
    response?: Response;

    /** エラーの原因となったエラー */
    cause?: Error;

    constructor( code: number, message: string, url: string, response?: Response, cause?: Error )
    {
        super( message + " [" + code + "]", url );
        if ( Error.captureStackTrace ) {
            Error.captureStackTrace( this, MaprayApiError );
        }
        this.name = "MaprayApiError";
        this.code = code;
        this.response = response;
        this.cause = cause;
        if (cause) {
            this.stack += "\nCaused-By: " + cause.stack;
        }
    }
}



/**
 * Mapray Cloudへアクセスするためのクラスです。
 *
 * このクラスを利用するには事前にMapray Cloudアカウントを作成する必要があります。
 * [https://cloud.mapray.com](https://cloud.mapray.com/) からサインアップすることができます。
 *
 * 事前に下記の情報を調べておきます。
 *
 * - User ID:<br>
 *   Mapray Cloudの[ユーザー情報ページ](https://cloud.mapray.com/settings)から確認します。
 *   右上メニューのAccountメニューからこのページを開くことができます。
 *
 * - Token:<br>
 *   Mapray Cloudの[Tokenページ](https://cloud.mapray.com/dashboard)でトークンを作成します。
 *   上部のTokensタブからこのページを開くことができます。
 *
 * - データセット等のID:<br>
 *   Mapray Cloudへデータをアップロードし、そのデータを使用するには、[データセットページ](https://cloud.mapray.com/datasetslist)
 *   からGeoJsonやglTFデータをアップロードしておき、アップロードしたデータのIDを確認します。
 *
 * ```ts
 * const maprayApi = new mapray.MaprayApi({
 *         basePath: "https://api.mapray.com",
 *         version: "v1",
 *         userId: "...",
 *         token: "..."
 * });
 *
 * const datasets = await maprayApi.getDatasets();
 * // ...
 * ```
 *
 * MaprayCloudへアクセスする関数は下記のように分類される。
 *
 * - `get***AsResource()`:<br>
 *     Maprayの各種ローダは、Resourceクラスを受け取るようになっている。[[mapray.GeoJSONLoader]]
 *
 * - `load***()`:<br>
 *    適切なクラスのインスタンスを返却する。
 *
 * - `get***()`:<br>
 *     最も低レベルのAPI呼び出しを行う。返却値はJSONです。
 */
class MaprayApi {

    private _option: MaprayApi.InnerOption;

    /**
     * @param option
     */
    constructor( option: MaprayApi.Option )
    {
        const basePath = option.basePath;
        this._option = {
            basePath: (
                !basePath ? MaprayApi.DEFAULT_BASE_PATH:
                basePath.endsWith("/") ? basePath.slice(0, -1):
                basePath
            ),
            version: option.version,
            token: option.token,
            userId: option.userId
        };
    }


    // Dataset, 3DDataset, PointCloudDataset

    /**
     * データセットのリストを取得します。
     * ページごとにデータセットリストを取得します。
     *
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return データセットの配列
     */
    async loadDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset[]> {
        const datasets_json = await this.getDatasets( page, limit );
        return datasets_json.map( (dataset_json: Dataset.Json) => Dataset.createFromJson( this, dataset_json ) );
    }

    /**
     * 指定したIDのデータセットを取得します。
     * @param datasetId データセットのID
     * @return データセット
     */
    async loadDataset( datasetId: string ): Promise<Dataset> {
        const dataset_json = await this.getDataset( datasetId );
        return Dataset.createFromJson( this, dataset_json );
    }

    /**
     * 3Dデータセットのリストを取得します。
     * ページごとにデータセットリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return 3Dデータセットの配列
     */
    async load3DDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset3D[]> {
        const datasets_json = await this.get3DDatasets( page, limit );
        return datasets_json.map( (dataset_json: Dataset3D.Json) => Dataset3D.createFromJson( this, dataset_json ) );
    }

    /**
     * 指定したIDの3Dデータセットを取得します。
     * @param datasetId
     * @return 3Dデータセット
     */
    async load3DDataset( datasetId: string ): Promise<Dataset3D> {
        const dataset_json = await this.get3DDataset( datasetId );
        return Dataset3D.createFromJson( this, dataset_json )
    }

    /**
     * 点群データセットのリストを取得します。
     * ページごとにデータセットリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return 点群データセットの配列
     */
    async loadPointCloudDatasets( page: number = 1, limit: number = 5 ) {
        const datasets_json = await this.getPointCloudDatasets( page, limit );
        return datasets_json.map( (dataset_json: PointCloudDataset.Json) => PointCloudDataset.createFromJson( this, dataset_json ) );
    }

    /**
     * 指定したIDの点群データセットを取得します。
     * @param datasetId データセットID
     * @return 点群データセット
     */
    async loadPointCloudDataset( datasetId: string ) {
        const dataset_json = await this.getPointCloudDataset( datasetId );
        return PointCloudDataset.createFromJson( this, dataset_json );
    }


    // Resources

    /**
     * 指定したIDのデータセットをリソースとして取得します。
     * @param datasetId データセットID
     * @return データセットのリソース
     */
    getDatasetAsResource( datasetId: string ): Resource {
        return new DatasetResource( this, datasetId );
    }

    /**
     * 指定したIDの3Dデータセットのシーンファイルをリソースとして取得します。
     * @param datasetId データセットIDのリスト
     * @return 3Dデータセットのリソース
     */
    get3DDatasetAsResource( datasetIds: string[] ): Resource {
        return new Dataset3DSceneResource( this, datasetIds );
    }

    /**
     * 指定したIDの点群データセットの定義ファイルをリソースとして取得します。
     * @param datasetId データセットID
     * @return 点群データのリソース
     */
    getPointCloudDatasetAsResource( datasetId: string ): Resource {
        return new PointCloudDatasetResource( this, datasetId );
    }


    // RestAPI

    /**
     * データセットリストを取得します
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    async getDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset.Json[]>
    {
        var opt = this._option;
        return await this.get( "datasets", [ opt.userId ], { page, limit } ) as Dataset.Json[];
    }

    /**
     * get dataset
     * @param datasetId
     * @return json
     */
    async getDataset( datasetId: string ): Promise<Dataset.Json>
    {
        var opt = this._option;
        return await this.get( "datasets", [ opt.userId, datasetId ], undefined ) as Dataset.Json;
    }

    /**
     * @internal
     * データセットを作成します。
     * @param name 名前
     * @param description 説明
     * @return json
     */
    async createDataset( name: string, description: string ): Promise<Dataset.Json>
    {
        var opt = this._option;
        var body = {
            name,
            description
        };
        return await this.post( "datasets", [ opt.userId ], undefined, body ) as Dataset.Json;
    }

    /**
     * @internal
     * データセットを削除します。
     */
    async deleteDataset( datasetId: string/*, option={ wait: true }*/ ): Promise<void>
    {
        var opt = this._option;
        return await this.delete<void>( "datasets", [ opt.userId, datasetId ] );
    }

    /**
     * GeoJSONの内容を取得します。
     * @param datasetId データセットID
     * @return json
     */
    async getFeatures( datasetId: string ): Promise<GeoJSON.FeatureCollectionJson> {
        var opt = this._option;
        return await this.get( "datasets", [ opt.userId, datasetId, "features" ] );
    }

    /**
     * @internal
     * GeoJSON要素をアップロード（挿入）します。
     * @param datasetId データセットID
     * @return json
     */
    async insertFeature( datasetId: string, feature: MaprayApi.FeatureRequestJson ): Promise<GeoJSON.FeatureJson> {
        var opt = this._option;
        return await this.post( "datasets", [ opt.userId, datasetId, "features" ], undefined, feature ) as GeoJSON.FeatureJson;
    }

    /**
     * @internal
     * GeoJSON要素を更新（上書き）します。
     * @param datasetId データセットID
     * @param featureId GeoJSON要素ID
     * @param feature GeoJSON要素
     * @return json
     */
    async updateFeature( datasetId: string, featureId: string, feature: GeoJSON.FeatureJson )
    {
        var opt = this._option;
        return await this.put( "datasets", [ opt.userId, "features", featureId ], undefined, feature );
    }

    /**
     * 3Dデータセットのリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    async get3DDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset3D.Json[]> {
        const opt = this._option;
        return await this.get( "3ddatasets", [ opt.userId ], { page, limit } ) as Dataset3D.Json[];
    }

    /**
     * @internal
     * 3D datastを作成します。
     * @param name 名前
     * @param description 説明
     * @param option
     * @return json
     */
    async create3DDataset( name: string, description: string, option: Dataset3D.Json ): Promise<Dataset3D.Json> {
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
        return await this.post( "3ddatasets", [ opt.userId ], undefined, body ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットを更新します。
     * @param datasetId データセットId
     * @param name 名前
     * @param description 説明
     * @return json
     */
    async update3DDataset( datasetId: string, name: string, description: string, option: Dataset3D.RequestJson ): Promise<Dataset3D.Json> {
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
        return await this.patch( "3ddatasets", [ opt.userId, datasetId ], undefined, body ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットアップロード用URLを取得します。
     * @param datasetId データセットId
     * @return json
     */
    async create3DDatasetUploadUrl( datasetId: string ) {
        const opt = this._option;
        return await this.post( "3ddatasets", [ "uploads", opt.userId, datasetId ], undefined, {} );
    }

    /**
     * @internal
     * 3Dデータセット情報を取得します。
     * データセットが保持するデータにアクセスするには、get3DDatasetScene()を利用します。
     * @param datasetId データセットId
     * @return json
     */
    async get3DDataset( datasetId: string ): Promise<Dataset3D.Json> {
        const opt = this._option;
        return await this.get( "3ddatasets", [ opt.userId, datasetId ], undefined ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットを削除します。
     * @param datasetId データセットId
     * @return json
     */
    async delete3DDataset( datasetId: string ) {
        const opt = this._option;
        return await this.delete( "3ddatasets", [ opt.userId, datasetId ] );
    }

    /**
     * 3Dデータセットに含まれる scene情報 を取得します。
     * @param datasetIds
     * @return シーンファイルの実体
     */
    async get3DDatasetScene( datasetIds: string | string[] ): Promise<SceneLoader.SceneJson> {
        const opt = this._option;
        const datasetIdsText = Array.isArray(datasetIds) ? datasetIds.join(",") : datasetIds;
        const response = await this.get( "3ddatasets", [ "scene", opt.userId ], { "3ddatasets_ids": datasetIdsText } ) as SceneLoader.SceneJson;
        response.entity_list.forEach((entity: any) => {
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
     * 点群データセットリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    async getPointCloudDatasets( page: number = 1, limit: number = 5 ): Promise<PointCloudDataset.Json[]> {
        const opt = this._option;
        return await this.get( "pcdatasets", [ opt.userId ], { page, limit } ) as PointCloudDataset.Json[];
    }

    /**
     * 点群データセットを取得します。
     * @param datasetId データセットId
     * @return json
     */
    async getPointCloudDataset( datasetId: string ): Promise<PointCloudDataset.Json> {
        const opt = this._option;
        return await this.get( "pcdatasets", [ opt.userId, datasetId ] ) as PointCloudDataset.Json;
    }

    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async get<T>( api: string, args: string[], query?: HTTP.Query, option={} ): Promise<T>
    {
        return await this.fetchAPI( HTTP.METHOD.GET, api, args, query, undefined, option );
    }

    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async post<T>( api: string, args: string[], query?: HTTP.Query, body?: HTTP.Body, option={} ): Promise<T>
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return await this.fetchAPI( HTTP.METHOD.POST, api, args, query, body, option );
    }

    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async patch<T>( api: string, args: string[], query?: HTTP.Query, body?: HTTP.Body, option={} ): Promise<T>
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return await this.fetchAPI( HTTP.METHOD.PATCH, api, args, query, body, option );
    }

    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async put<T>( api: string, args: string[], query?: HTTP.Query, body?: HTTP.Body, option={} ): Promise<T>
    {
        if ( typeof( body ) !== "string" ) {
            body = JSON.stringify(body);
        }
        return await this.fetchAPI( HTTP.METHOD.PUT, api, args, query, body, option );
    }

    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async delete<T>( api: string, args: string[], query?: HTTP.Query, option={} ): Promise<T>
    {
        return await this.fetchAPI( HTTP.METHOD.DELETE, api, args, query, undefined, option );
    }

    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async fetchAPI<T>( method: string, api: string, args: string[], query?: HTTP.Query, body?: HTTP.Body, option={} ): Promise<T>
    {
        var opt = this._option;
        var url = opt.basePath + "/" + api + "/" + opt.version + (args.length > 0 ? "/" + args.join("/") : "");
        // console.log( "MaprayAPI: " + method + " " + api + " (" + args.join("/") + ")" );
        const response = await this.fetch( method, url, query, body, option );
        return await response.json() as T;
    }

    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async fetch( method: string, url: string, query?: HTTP.Query, body?: HTTP.Body, option: RequestInit = {} ): Promise<Response>
    {
        var opt = this._option;
        var headers = option.headers || (option.headers = {});
        // @ts-ignore
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
                    throw new MaprayApiError( -1, "Failed to fetch", url, undefined, error );
                }
                throw new MaprayApiError( errorResponseJson.code, errorResponseJson.error, url, error.response, error );
            }
            else {
                throw new MaprayApiError( -1, "Failed to fetch", url, undefined, error );
            }
        }
        return response;
    }
}



namespace MaprayApi {



export interface Option {
    /** Mapray CloudのURLを指定します。通常は省略します。 */
    basePath?: string;

    /** Mapray Cloud の APIバージョン "v1" のように指定します。 */
    version: string;

    /** Mapray Cloud アカウントの User ID を指定します。 */
    userId: string;

    /** Mapray Cloud で生成した Token を指定します。 */
    token: string;
}



export interface InnerOption {
    basePath: string;
    version: string;
    token: string;
    userId: string;
}


export interface FeatureRequestJson {
}



export interface LoadDatasetsJson {
}



export const DEFAULT_BASE_PATH = "https://cloud.mapray.com";



} // namespace MaprayApi



export default MaprayApi;
