import { Dataset, Dataset3D, PointCloudDataset, Scene } from "./CloudApiModel";
import SceneLoader from "../SceneLoader";
import GeoJSON from "../GeoJSON";
import CloudApi from "./CloudApi";


/**
 * Version 2 で CloudApi へ接続するためのクラスです。
 * 使い方は継承元クラスの説明も参照。
 *
 * ```ts
 * const cloudApi = new mapray.cloud.CloudApiV2({
 *         tokenType: CloudApi.TokenType.API_KEY,
 *         userId: "...",
 *         token: "...",
 * });
 *
 * const datasets = await cloudApi.getDatasets();
 * // ...
 * ```
 */
class CloudApiV2 extends CloudApi {

    constructor( option: CloudApiV2.Option )
    {
        super( 'v2', option.basePath,
            option.tokenType === CloudApi.TokenType.API_KEY ? 'x-api-key' : 'Authorization',
            option.tokenType === CloudApi.TokenType.API_KEY ? option.token : 'Bearer ' + option.token
        );
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
        return await this.get( "datasets", [], { page, limit } ) as Dataset.Json[];
    }

    /**
     * 登録されているデータセットの数を取得します
     * @returns json
     */
    async countDatasets(): Promise<Dataset.Count>
    {
        return await this.get( "datasets", [ "count" ] ) as Dataset.Count;
    }

    /**
     * get dataset
     * @param datasetId
     * @return json
     */
    async getDataset( datasetId: string ): Promise<Dataset.Json>
    {
        return await this.get( "datasets", [ datasetId ], undefined ) as Dataset.Json;
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
        return await this.post( "datasets", [], undefined, { name, description } ) as Dataset.Json;
    }

    /**
     * @internal
     * データセットを削除します。
     */
    async deleteDataset( datasetId: string/*, option={ wait: true }*/ ): Promise<Dataset.Json>
    {
        return await this.delete( "datasets", [ datasetId ] ) as Dataset.Json;
    }

    /**
     * GeoJSONの内容を取得します。
     * @param datasetId データセットID
     * @return json
     */
    async getFeatures( datasetId: string ): Promise<GeoJSON.FeatureCollectionJson>
    {
        return await this.get( "datasets", [ datasetId, "features" ] );
    }

    /**
     * @internal
     * GeoJSON要素をアップロード（挿入）します。
     * @param datasetId データセットID
     * @return json
     */
    async insertFeature( datasetId: string, feature: CloudApi.FeatureRequestJson ): Promise<GeoJSON.FeatureJson>
    {
        return await this.post( "datasets", [ datasetId, "features" ], undefined, feature ) as GeoJSON.FeatureJson;
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
        return await this.patch( "datasets", [ "features", featureId ], undefined, feature );
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
        return await this.delete( "datasets", [ "features", featureId ] );
    }

    /**
     * 3Dデータセットのリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    async get3DDatasets( page: number = 1, limit: number = 5 ): Promise<Dataset3D.Json[]>
    {
        return await this.get( "3ddatasets", [ ], { page, limit } ) as Dataset3D.Json[];
    }

    /**
     * 登録されている3Dデータセットの数を取得します
     * @returns json
     */
    async count3DDatasets(): Promise<Dataset3D.Count>
    {
        return await this.get( "3ddatasets", [ "count" ] ) as Dataset3D.Count;
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
        return await this.post( "3ddatasets", [ ], undefined, body ) as Dataset3D.Json;
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
        return await this.patch( "3ddatasets", [ datasetId ], undefined, body ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットアップロード用URLを取得します。
     * @param datasetId データセットId
     * @return json
     */
    async create3DDatasetUploadUrl( datasetId: string, fileInfo: Dataset3D.UploadFileInfo[] ): Promise<Dataset3D.UploadUrlInfo>
    {
        return await this.post( "3ddatasets", [ "uploads", datasetId ], undefined, fileInfo );
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
        return await this.get( "3ddatasets", [ datasetId ], undefined ) as Dataset3D.Json;
    }

    /**
     * @internal
     * 3Dデータセットを削除します。
     * @param datasetId データセットId
     * @return json
     */
    async delete3DDataset( datasetId: string ): Promise<Dataset3D.Json>
    {
        return await this.delete( "3ddatasets", [ datasetId ] ) as Dataset3D.Json;
    }

    /**
     * 3Dデータセットに含まれる scene情報 を取得します。
     * @param datasetIds
     * @return シーンファイルの実体
     */
    async get3DDatasetScene( datasetIds: string | string[] ): Promise<SceneLoader.SceneJson>
    {
        const datasetIdsText = Array.isArray(datasetIds) ? datasetIds.join(",") : datasetIds;
        const response = await this.get( "3ddatasets", [ "scene" ], { "3ddatasets_ids": datasetIdsText } ) as SceneLoader.SceneJson;
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
        return await this.get( "pcdatasets", [ ], { page, limit } ) as PointCloudDataset.Json[];
    }

    /**
     * 登録されている点群データセットの数を取得します
     * @returns json
     */
    async countPointCloudDatasets(): Promise<PointCloudDataset.Count>
    {
        return await this.get( "pcdatasets", [ "count" ] ) as PointCloudDataset.Count;
    }

    /**
     * 点群データセットを取得します。
     * @param datasetId データセットId
     * @return json
     */
    async getPointCloudDataset( datasetId: string ): Promise<PointCloudDataset.Json>
    {
        return await this.get( "pcdatasets", [ datasetId ] ) as PointCloudDataset.Json;
    }

    /**
     * シーンリストを取得します。
     * @param page 取得する要素のページ番号
     * @param limit 1ページに含まれる要素数。最大100まで指定することができます。
     * @return json
     */
    async getScenes( page: number = 1, limit: number = 5 ): Promise<Scene.Json[]>
    {
        return await this.get( "scenes", [ ], { page, limit } ) as Scene.Json[];
    }

    /**
     * シーンを取得します。
     * @param sceneId シーンId
     * @return json
     */
    async getScene( sceneId: string ): Promise<Scene.Json>
    {
        return await this.get( "scenes", [ sceneId ] ) as Scene.Json;
    }

    /**
     * シーンファイルを取得します。
     * @param sceneId シーンId
     * @return json
     */
    async getSceneContent( sceneId: string ): Promise<SceneLoader.SceneJson>
    {
        const response = await this.get( "scenes", [ "file", sceneId ] ) as Scene.FileJson;
        response.scene_file.entity_list.forEach(( entity: any ) => {
                const indexStr = entity.index;
                const index = parseInt( indexStr );
                if ( index.toString() !== indexStr ) {
                    throw new Error("Internal Error: ID couldn't be convert to 'number'");
                }
                entity.index = index;
        });
        return response.scene_file;
    }
}



namespace CloudApiV2 {

export interface Option {
    /** Mapray CloudのURLを指定します。通常は省略します。 */
    basePath?: string;

    /** Mapray Cloud で生成した Token を指定します。 */
    token: string;

    /** Token の種別( API_KEY / ACCESS_TOKEN )を指定します。 */
    tokenType: CloudApi.TokenType;
}

} // namespace CloudApi.CloudApiV2



export default CloudApiV2;
