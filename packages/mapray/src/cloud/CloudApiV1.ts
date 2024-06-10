import { Dataset, Dataset3D, PointCloudDataset, Scene } from "./CloudApiModel";
import SceneLoader from "../SceneLoader";
import GeoJSON from "../GeoJSON";
import CloudApi from "./CloudApi";


/**
 * Version 1 で CloudApi へ接続するためのクラスです。
 * 使い方は継承元クラスの説明も参照。
 *
 * ```ts
 * const cloudApi = new mapray.cloud.CloudApiV1({
 *         userId: "...",
 *         token: "...",
 * });
 *
 * const datasets = await cloudApi.getDatasets();
 * // ...
 * ```
 */
class CloudApiV1 extends CloudApi {

    private _user_id: string;

    constructor( option: CloudApiV1.Option )
    {
        super( 'v1', option.basePath, 'x-api-key', option.token );
        this._user_id = option.userId;
    }


    // RestAPI

    /**
     * データセットリストを取得します
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json[]
     */
    async getDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset.Json[]>
    {
        return await this.get( "datasets", [ this._user_id ], { page, limit } ) as Dataset.Json[];
    }

    /**
     * 登録されているデータセットの数を取得します
     * @returns json
     */
    async countDatasets(): Promise<Dataset.Count>
    {
        return await this.get( "datasets", [ this._user_id, "count" ] ) as Dataset.Count;
    }

    /**
     * get dataset
     * @param datasetId
     * @return json
     */
    async getDataset( datasetId: string ): Promise<Dataset.Json>
    {
        return await this.get( "datasets", [ this._user_id, datasetId ], undefined ) as Dataset.Json;
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
        return await this.post( "datasets", [ this._user_id ], undefined, { name, description, srid: 4326, geoid: "EGM96_15" } ) as Dataset.Json;
    }

    /**
     * @internal
     * データセットを削除します。
     */
    async deleteDataset( datasetId: string/*, option={ wait: true }*/ ): Promise<Dataset.Json>
    {
        return await this.delete( "datasets", [ this._user_id, datasetId ] ) as Dataset.Json;
    }

    /**
     * GeoJSONの内容を取得します。
     * @param datasetId データセットID
     * @return json
     */
    async getFeatures( datasetId: string ): Promise<GeoJSON.FeatureCollectionJson>
    {
        return await this.get( "datasets", [ this._user_id, datasetId, "features" ] );
    }

    /**
     * @internal
     * GeoJSON要素をアップロード（挿入）します。
     * @param datasetId データセットID
     * @return json
     */
    async insertFeature( datasetId: string, feature: CloudApi.FeatureRequestJson ): Promise<GeoJSON.FeatureJson>
    {
        return await this.post( "datasets", [ this._user_id, datasetId, "features" ], undefined, feature ) as GeoJSON.FeatureJson;
    }

    /**
     * @internal
     * GeoJSON要素を更新（上書き）します。
     * @param featureId GeoJSON要素ID
     * @param feature GeoJSON要素
     * @return json
     */
    async updateFeature( featureId: string, feature: GeoJSON.FeatureJson ): Promise<GeoJSON.FeatureJson>
    {
        return await this.patch( "datasets", [ this._user_id, "features", featureId ], undefined, feature );
    }

    /**
     * @internal
     * GeoJSON要素を作事をします。
     * @param datasetId データセットID
     * @param featureId GeoJSON要素ID
     * @return json
     */
    async deleteFeature( featureId: string ): Promise<GeoJSON.FeatureJson>
    {
        return await this.delete( "datasets", [ this._user_id, "features", featureId ] );
    }

    /**
     * 3Dデータセットのリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    async get3DDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset3D.Json[]>
    {
        return await this.get( "3ddatasets", [ this._user_id ], { page, limit } ) as Dataset3D.Json[];
    }

    /**
     * 登録されている3Dデータセットの数を取得します
     * @returns json
     */
    async count3DDatasets(): Promise<Dataset3D.Count>
    {
        return await this.get( "3ddatasets", [ this._user_id, "count" ] ) as Dataset3D.Count;
    }

    /**
     * @internal
     * 3D datastを作成します。
     * @param name 名前
     * @param description 説明
     * @param option
     * @return json
     */
    async create3DDataset( name: string, description: string, option: Dataset3D.Json ): Promise<Dataset3D.Json>
    {
        const body = {
            name,
            description,
            path: option.path,
            srid: option.srid,
            x: option.x,
            y: option.y,
            z: option.z,
            src_file_type: option.src_file_type,
            dst_file_type: option.dst_file_type,
            extensions: option.extensions
        };
        return await this.post( "3ddatasets", [ this._user_id ], undefined, body ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットを更新します。
     * @param datasetId データセットId
     * @param name 名前
     * @param description 説明
     * @return json
     */
    async update3DDataset( datasetId: string, name: string, description: string, option: Dataset3D.RequestJson ): Promise<Dataset3D.Json>
    {
        const body = {
            name,
            description,
            path: option.path,
            srid: option.srid,
            x: option.x,
            y: option.y,
            z: option.z,
            src_file_type: option.src_file_type,
            dst_file_type: option.dst_file_type,
            extensions: option.extensions
        };
        return await this.patch( "3ddatasets", [ this._user_id, datasetId ], undefined, body ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットアップロード用URLを取得します。
     * @param datasetId データセットId
     * @return json
     */
    async create3DDatasetUploadUrl( datasetId: string, fileInfo: Dataset3D.UploadFileInfo[] ): Promise<Dataset3D.UploadUrlInfo>
    {
        return await this.post( "3ddatasets", [ this._user_id, "uploads", datasetId ], undefined, fileInfo );
    }

    /**
     * @internal
     * 3DデータセットのConvertを開始します。
     * @param datasetId データセットId
     * @return json
     */
    async convert3DDataset( datasetId: string ): Promise<Dataset3D.Json>
    {
        return await this.post( "3ddatasets", [ "convert", datasetId ], undefined ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3DデータセットのConvertStatusを取得します。
     * @param datasetId データセットId
     * @return json
     */
    async retrieve3DDatasetConvertStatus( datasetId: string ): Promise<Dataset3D.Json>
    {
        return await this.get( "3ddatasets", [ "convert/status", datasetId ], undefined ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセット情報を取得します。
     * データセットが保持するデータにアクセスするには、get3DDatasetScene()を利用します。
     * @param datasetId データセットId
     * @return json
     */
    async get3DDataset( datasetId: string ): Promise<Dataset3D.Json>
    {
        return await this.get( "3ddatasets", [ this._user_id, datasetId ], undefined ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットを削除します。
     * @param datasetId データセットId
     * @return json
     */
    async delete3DDataset( datasetId: string ): Promise<Dataset3D.Json>
    {
        return await this.delete( "3ddatasets", [ this._user_id, datasetId ] ) as Dataset3D.Json;
    }

    /**
     * 3Dデータセットに含まれる scene情報 を取得します。
     * @param datasetIds
     * @return シーンファイルの実体
     */
    async get3DDatasetScene( datasetIds: string | string[] ): Promise<SceneLoader.SceneJson>
    {
        const datasetIdsText = Array.isArray(datasetIds) ? datasetIds.join(",") : datasetIds;
        const response = await this.get( "3ddatasets", [ "scene", this._user_id ], { "3ddatasets_ids": datasetIdsText } ) as SceneLoader.SceneJson;
        response.entity_list.forEach(( entity: any ) => {
                const indexStr = entity.index;
                const index = parseInt( indexStr );
                if ( index.toString() !== indexStr ) {
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
    async getPointCloudDatasets( page: number = 1, limit: number = 5 ): Promise<PointCloudDataset.Json[]>
    {
        return await this.get( "pcdatasets", [ this._user_id ], { page, limit } ) as PointCloudDataset.Json[];
    }

    /**
     * 登録されている点群データセットの数を取得します
     * @returns json
     */
    async countPointCloudDatasets(): Promise<PointCloudDataset.Count>
    {
        return await this.get( "pcdatasets", [ this._user_id, "count" ] ) as PointCloudDataset.Count;
    }

    /**
     * 点群データセットを取得します。
     * @param datasetId データセットId
     * @return json
     */
    async getPointCloudDataset( datasetId: string ): Promise<PointCloudDataset.Json>
    {
        return await this.get( "pcdatasets", [ this._user_id, datasetId ] ) as PointCloudDataset.Json;
    }

    /**
     * @hidden CloudApiV1では非対応
     * シーンリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    async getScenes( page: number = 1, limit: number = 5 ): Promise<Scene.Json[]>
    {
        throw new Error("getScenes is not supported in CloudApiV1");
    }

    /**
     * @hidden CloudApiV1では非対応
     * シーンを取得します。
     * @param sceneId シーンId
     * @return json
     */
    async getScene( sceneId: string ): Promise<Scene.Json>
    {
        throw new Error("getScene is not supported in CloudApiV1");
    }

    /**
     * @hidden CloudApiV1では非対応
     * シーンファイルを取得します。
     * @param sceneId シーンId
     * @return json
     */
    async getSceneContent( sceneId: string ): Promise<SceneLoader.SceneJson>
    {
        throw new Error("getSceneContent is not supported in CloudApiV1");
    }
}



namespace CloudApiV1 {

export interface Option {
    /** Mapray CloudのURLを指定します。通常は省略します。 */
    basePath?: string;

    /** Mapray Cloud アカウントの User ID を指定します。 */
    userId: string;

    /** Mapray Cloud で生成した Token を指定します。 */
    token: string;
}

} // namespace CloudApiV1



export default CloudApiV1;
