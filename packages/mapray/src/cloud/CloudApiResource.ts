import HTTP from "../HTTP";
import Dom from "../util/Dom";
import Resource from "../Resource";
import CloudApi from "./CloudApi";
import { PointCloudDataset } from "./CloudApiModel";



/**
 * @internal
 * Mapray Cloudに登録されたデータにおいて、URLアクセスを要するリソースを表現する。
 *
 * - index.htmlのように基準となるファイルを指定し、そのファイルからの相対パスでサブリソースへアクセスする。<br>
 *    コンストラクタで基準となるファイルを指定し、load()はこのファイルを読み込む。
 *    loadSubResource( sub_url )は、sub_urlが相対パスの場合は基準となるファイルからの相対パスとして解釈される。
 *
 * - ルートパスを指定し配下のリソースへアクセスする。<br>
 *    コンストラクタで基準となるURLを指定する。この時、URLは必ず/で終了する必要があり、load()は動作が定義されない。
 *    loadSubResource( sub_url )は、sub_urlが相対パスの場合は基準となるURLからの相対パスとして解釈される。
 *
 */
class ApiUrlResource extends Resource {

    private _api: CloudApi;

    private _url: string;

    private _base_url: string;

    /**
     * @param api
     * @param url
     */
    constructor( api: CloudApi, url: string ) {
        const index = url.lastIndexOf( "/" );
        if ( index === -1 ) throw new Error( "invalid url" );
        //super( api, url.substr( 0, index + 1 ) );
        super();
        this._api = api;
        this._url = url;
        this._base_url = url.substr( 0, index + 1 );
    }

    /**
     * @param {object} options
     */
    override async load( options: Resource.Option = {} ) {
        // @ts-ignore
        const response = await this._api.fetch( HTTP.METHOD.GET, this._url );
        return (
          options.type === Resource.Type.JSON ? await response.json():
          response
        );
    }

    override loadSubResourceSupported() {
        return true;
    }

    /**
     * リソースにアクセスする。sub_urlは相対・絶対の両方に対応。
     * @param {string} sub_url
     * @return {Resource}
     */
    override async loadSubResource( sub_url: string, options: Resource.Option = {} ) {
        const url = Dom.resolveUrl( this._base_url, sub_url );
        // @ts-ignore
        const response = await this._api.fetch( HTTP.METHOD.GET, url );
        if ( !response.ok ) throw new Error( response.statusText );
        return (
            options.type === Resource.Type.BINARY ? await response.arrayBuffer():
            options.type === Resource.Type.IMAGE  ? await Dom.loadImage( await response.blob() ):
            response
        );
    }
}



/**
 * @internal
 * Mapray Cloudに登録されたDatasetを表現するリソース。
 */
export class DatasetResource extends Resource {

    private _api: CloudApi;

    private _datasetId: string;

    constructor( api: CloudApi, datasetId: string ) {
        super();
        this._api = api;
        this._datasetId = datasetId;
    }

    /**
     * @return {Promise(object)} データ(geojson)
     */
    override async load() {
        return await this._api.getFeatures( this._datasetId );
    }
}



/**
 * @internal
 * Mapray Cloudに登録された3DDatasetのモデルを表現するリソース。
 */
export class Dataset3DSceneResource extends Resource {

    private _api: CloudApi;

    private _datasetIds: string[];

    /**
     * @param {CloudApi} api
     * @param {string|string[]} datasetIds データセットのid。複数指定する場合は配列を指定する。
     */
    constructor( api: CloudApi, datasetIds: string | string[] ) {
        super();
        this._api = api;
        this._datasetIds = Array.isArray( datasetIds ) ? datasetIds : [ datasetIds ];
    }

    override async load() {
        return await this._api.get3DDatasetScene( this._datasetIds );
    }

    override resolveResourceSupported() {
      return true;
    }

    /**
     * シーンファイルに含まれるモデル及びモデルに関連づけられたリソースへアクセス際に利用されるResource。
     * @param sub_url モデルURL
     */
    override resolveResource( sub_url: string ): Resource {
        return new ApiUrlResource( this._api, sub_url );
    }
}



/**
 * @internal
 * Mapray Cloudに登録されたPoint Cloud Datasetを表現するリソース。
 */
export class PointCloudDatasetResource extends Resource {

    private _api: CloudApi;

    private _datasetId: string;

    /**
     * @param api
     * @param datasetId データセットのid
     */
    constructor( api: CloudApi, datasetId: string ) {
        super();
        this._api = api;
        this._datasetId = datasetId;
    }

    override async load(): Promise<PointCloudDataset.Json> {
        return await this._api.getPointCloudDataset( this._datasetId );
    }

    override resolveResourceSupported(): boolean {
      return true;
    }

    /**
     * @param {string} sub_url 点群が公開されているURLへアクセスするためのResource。
     * @return 点群ファイルリソース
     */
    override resolveResource( sub_url: string ): Resource {
        return new ApiUrlResource( this._api, sub_url );
    }
}
