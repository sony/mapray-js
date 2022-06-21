import HTTP from "../HTTP";
import { Dataset, Dataset3D, PointCloudDataset, Scene } from "./CloudApiModel";
import Resource from "../Resource";
import SceneLoader from "../SceneLoader";
import { DatasetResource, Dataset3DSceneResource, PointCloudDatasetResource } from "./CloudApiResource";
import GeoJSON from "../GeoJSON";
import { cfa_assert } from "../util/assertion";



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
 * MaprayCloudバージョンごとに具象クラスが定義されています。
 * 利用するバージョンのクラスを利用します。
 *
 * | Version | Class           |
 * |---------|-----------------|
 * | v1      | [mapray.cloud.CloudApiV1](mapray.cloud.CloudApiV1-1.html) |
 * | v2      | [mapray.cloud.CloudApiV2](mapray.cloud.CloudApiV2-1.html) |
 *
 * MaprayCloudへアクセスする関数は下記のように分類されます。
 *
 * - `get***AsResource()`:<br>
 *     Maprayの各種ローダは、Resourceクラスを受け取るようになっています。[[mapray.GeoJSONLoader]]
 *
 * - `load***()`:<br>
 *    適切なクラスのインスタンスを返却します。
 *
 * - `get***()`:<br>
 *     最も低レベルのAPI呼び出しを行う。返却値はJSONです。
 */
abstract class CloudApi {

    public readonly version: string;
    public readonly basePath: string;

    private _header_key: string;
    private _header_value: string;

    /**
     * @param version 
     * @param basePath 
     * @param header_key header key for cloud api
     * @param header_value header value for cloud api
     */
    constructor( version: string, basePath: string | undefined, header_key: string, header_value:string )
    {
        this.version = version;
        this.basePath = !basePath ? DEFAULT_BASE_PATH:
                        basePath.endsWith("/") ? basePath.slice(0, -1):
                        basePath;
        this._header_key = header_key;
        this._header_value = header_value;
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
    async loadDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset[]>
    {
        const datasets_json = await this.getDatasets( page, limit );
        return datasets_json.map( (dataset_json: Dataset.Json) => Dataset.createFromJson( this, dataset_json ) );
    }

    /**
     * 指定したIDのデータセットを取得します。
     * @param datasetId データセットのID
     * @return データセット
     */
    async loadDataset( datasetId: string ): Promise<Dataset>
    {
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
    async load3DDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset3D[]>
    {
        const datasets_json = await this.get3DDatasets( page, limit );
        return datasets_json.map( (dataset_json: Dataset3D.Json) => Dataset3D.createFromJson( this, dataset_json ) );
    }

    /**
     * 指定したIDの3Dデータセットを取得します。
     * @param datasetId
     * @return 3Dデータセット
     */
    async load3DDataset( datasetId: string ): Promise<Dataset3D>
    {
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
    async loadPointCloudDatasets( page: number = 1, limit: number = 5 )
    {
        const datasets_json = await this.getPointCloudDatasets( page, limit );
        return datasets_json.map( (dataset_json: PointCloudDataset.Json) => PointCloudDataset.createFromJson( this, dataset_json ) );
    }

    /**
     * 指定したIDの点群データセットを取得します。
     * @param datasetId データセットID
     * @return 点群データセット
     */
    async loadPointCloudDataset( datasetId: string )
    {
        const dataset_json = await this.getPointCloudDataset( datasetId );
        return PointCloudDataset.createFromJson( this, dataset_json );
    }

    /**
     * シーンのリストを取得します。
     * ページごとにシーンリストを取得します。
     * 
     * *CloudApiV2でのみ対応しています。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return シーンの配列
     */
    async loadScenes( page: number = 1, limit: number = 5 ): Promise<Scene[]>
    {
        const scenes_json = await this.getScenes( page, limit );
        return scenes_json.map( (scene_json: Scene.Json) => Scene.createFromJson( this, scene_json ) );
    }

    /**
     * 指定したIDのシーンを取得します。
     * 
     * *CloudApiV2でのみ対応しています。
     * @param sceneId シーンのID
     * @return シーン
     */
    async loadScene( sceneId: string ): Promise<Scene>
    {
        const scene_json = await this.getScene( sceneId );
        return Scene.createFromJson( this, scene_json );
    }


    // Resources

    /**
     * 指定したIDのデータセットをリソースとして取得します。
     * @param datasetId データセットID
     * @return データセットのリソース
     */
    getDatasetAsResource( datasetId: string ): Resource
    {
        return new DatasetResource( this, datasetId );
    }

    /**
     * 指定したIDの3Dデータセットのシーンファイルをリソースとして取得します。
     * @param datasetId データセットIDのリスト
     * @return 3Dデータセットのリソース
     */
    get3DDatasetAsResource( datasetIds: string[] ): Resource
    {
        return new Dataset3DSceneResource( this, datasetIds );
    }

    /**
     * 指定したIDの点群データセットの定義ファイルをリソースとして取得します。
     * @param datasetId データセットID
     * @return 点群データのリソース
     */
    getPointCloudDatasetAsResource( datasetId: string ): Resource
    {
        return new PointCloudDatasetResource( this, datasetId );
    }


    // RestAPI

    /**
     * データセットリストを取得します
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json[]
     */
    abstract getDatasets( page: number, limit: number ): Promise<Dataset.Json[]>;

    /**
     * 登録されているデータセットの数を取得します
     * @returns json
     */
    abstract countDatasets(): Promise<Dataset.Count>;

    /**
     * get dataset
     * @param datasetId
     * @return json
     */
    abstract getDataset( datasetId: string ): Promise<Dataset.Json>;

    /**
     * @internal
     * データセットを作成します。
     * @param name 名前
     * @param description 説明
     * @return json
     */
    abstract createDataset( name: string, description: string ): Promise<Dataset.Json>;

    /**
     * @internal
     * データセットを削除します。
     */
    abstract deleteDataset( datasetId: string/*, option={ wait: true }*/ ): Promise<Dataset.Json>;

    /**
     * GeoJSONの内容を取得します。
     * @param datasetId データセットID
     * @return json
     */
    abstract getFeatures( datasetId: string ): Promise<GeoJSON.FeatureCollectionJson>;

    /**
     * @internal
     * GeoJSON要素をアップロード（挿入）します。
     * @param datasetId データセットID
     * @return json
     */
    abstract insertFeature( datasetId: string, feature: CloudApi.FeatureRequestJson ): Promise<GeoJSON.FeatureJson>;

    /**
     * @internal
     * GeoJSON要素を更新（上書き）します。
     * @param featureId GeoJSON要素ID
     * @param feature GeoJSON要素
     * @return json
     */
    abstract updateFeature( featureId: string, feature: GeoJSON.FeatureJson ): Promise<GeoJSON.FeatureJson>;

    /**
     * @internal
     * GeoJSON要素を作事をします。
     * @param datasetId データセットID
     * @param featureId GeoJSON要素ID
     * @return json
     */
     abstract deleteFeature( featureId: string ): Promise<GeoJSON.FeatureJson>;

    /**
     * 3Dデータセットのリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    abstract get3DDatasets( page: number, limit: number ): Promise<Dataset3D.Json[]>;

    /**
     * 登録されている3Dデータセットの数を取得します
     * @returns json
     */
    abstract count3DDatasets(): Promise<Dataset3D.Count>;
 
    /**
     * @internal
     * 3D datastを作成します。
     * @param name 名前
     * @param description 説明
     * @param option
     * @return json
     */
    abstract create3DDataset( name: string, description: string, option: Dataset3D.Json ): Promise<Dataset3D.Json>;

    /**
     * @internal
     * 3Dデータセットを更新します。
     * @param datasetId データセットId
     * @param name 名前
     * @param description 説明
     * @return json
     */
    abstract update3DDataset( datasetId: string, name: string, description: string, option: Dataset3D.RequestJson ): Promise<Dataset3D.Json>;

    /**
     * @internal
     * 3Dデータセットアップロード用URLを取得します。
     * @param datasetId データセットId
     * @return json
     */
    abstract create3DDatasetUploadUrl( datasetId: string, fileInfo: Dataset3D.UploadFileInfo[] ): Promise<Dataset3D.UploadUrlInfo>;

    /**
     * @internal
     * 3Dデータセット情報を取得します。
     * データセットが保持するデータにアクセスするには、get3DDatasetScene()を利用します。
     * @param datasetId データセットId
     * @return json
     */
    abstract get3DDataset( datasetId: string ): Promise<Dataset3D.Json>;

    /**
     * @internal
     * 3Dデータセットを削除します。
     * @param datasetId データセットId
     * @return json
     */
    abstract delete3DDataset( datasetId: string ): Promise<Dataset3D.Json>;

    /**
     * 3Dデータセットに含まれる scene情報 を取得します。
     * @param datasetIds
     * @return シーンファイルの実体
     */
    abstract get3DDatasetScene( datasetIds: string | string[] ): Promise<SceneLoader.SceneJson>;

    /**
     * 点群データセットリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    abstract getPointCloudDatasets( page: number, limit: number ): Promise<PointCloudDataset.Json[]>;

    /**
     * 登録されている点群データセットの数を取得します
     * @returns json
     */
    abstract countPointCloudDatasets(): Promise<PointCloudDataset.Count>;

    /**
     * 点群データセットを取得します。
     * @param datasetId データセットId
     * @return json
     */
    abstract getPointCloudDataset( datasetId: string ): Promise<PointCloudDataset.Json>;

    /**
     * シーンリストを取得します。
     * 
     * *CloudApiV2でのみ対応しています。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    abstract getScenes( page: number, limit: number ): Promise<Scene.Json[]>;

    /**
     * シーンを取得します。
     * 
     * *CloudApiV2でのみ対応しています。
     * @param sceneId シーンId
     * @return json
     */
    abstract getScene( sceneId: string ): Promise<Scene.Json>;

    /**
     * シーンファイルを取得します。
     * 
     * *CloudApiV2でのみ対応しています。
     * @param sceneId シーンId
     * @return json
     */
    abstract getSceneContent( sceneId: string ): Promise<SceneLoader.SceneJson>

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
        const url = this.basePath + "/" + api + "/" + this.version + (args.length > 0 ? "/" + args.join("/") : "");
        // console.log( "CloudApi: " + method + " " + api + " (" + args.join("/") + ")" );
        const response = await this.fetch( method, url, query, body, option );
        return await response.json() as T;
    }


    /**
     * 低レベルAPI。このクラスの別関数から呼び出される。
     * @return json
     */
    protected async fetch( method: string, url: string, query?: HTTP.Query, body?: HTTP.Body, option: RequestInit = {} ): Promise<Response>
    {
        const headers = option.headers || (option.headers = {});

        // @ts-ignore
        headers[this._header_key] = this._header_value;

        let response;
        try {
            response = await HTTP.fetch( method, url, query, body, option );
        }
        catch( error: any ) {
            cfa_assert( error instanceof Error );
            if ( error instanceof HTTP.FetchError && error.response ) {
                let errorResponseJson;
                try {
                    errorResponseJson = await error.response.json();
                }
                catch( additionalError ) {
                    // Couldn't get additional info of the error.
                    // throw original error.
                    throw new CloudApiError( -1, "Failed to fetch", url, undefined, error );
                }
                throw new CloudApiError( errorResponseJson.code, errorResponseJson.error, url, error.response, error );
            }
            else {
                throw new CloudApiError( -1, "Failed to fetch", url, undefined, error );
            }
        }
        return response;
    }
}



namespace CloudApi {

export interface FeatureRequestJson {
}


export interface LoadDatasetsJson {
}


export enum TokenType {
    /** api key */
    API_KEY      = "@@_CloudApi.TokenType.API_KEY",

    /** access token */
    ACCESS_TOKEN = "@@_CloudApi.TokenType.ACCESS_TOKEN",
}


} // namespace CloudApi



/**
 * CloudApiへのアクセスに関わるエラー
 */
class CloudApiError extends HTTP.FetchError {

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
            Error.captureStackTrace( this, CloudApiError );
        }
        this.name = "CloudApiError";
        this.code = code;
        this.response = response;
        this.cause = cause;
        if ( cause ) {
            this.stack += "\nCaused-By: " + cause.stack;
        }
    }
}


const DEFAULT_BASE_PATH = "https://cloud.mapray.com";



export default CloudApi;
