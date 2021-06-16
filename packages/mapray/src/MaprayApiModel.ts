import MaprayApi from "./MaprayApi";
import GeoPoint from "./GeoPoint";


/**
 * データセットを表現する抽象クラス
 */
class AbstractDataset {

    private _api: MaprayApi;

    // @ts-ignore
    private _id: string;

    // @ts-ignore
    private _owner_id: string;

    // @ts-ignore
    private _name: string;

    // @ts-ignore
    private _description: string;

    // @ts-ignore
    private _created_at: Date;

    // @ts-ignore
    private _updated_at: Date;

    /**
     * @param api
     */
    constructor( api: MaprayApi ) {
        this._api = api;
    }

    /**
     * データセットのidを取得
     */
    getId(): string {
        return this._id;
    }

    /**
     * オーナーのidを取得
     */
    getOwnerId(): string {
        return this._owner_id;
    }

    /**
     * 名前を取得
     */
    getName(): string {
        return this._name;
    }

    /**
     * 説明を取得
     */
    getDescription(): string {
        return this._description;
    }

    /**
     * 作成日時を取得
     */
    getCreatedAt(): Date {
        return this._created_at;
    }

    /**
     * 更新日時を取得
     */
    getUpdatedAt(): Date {
        return this._updated_at;
    }

    /**
     * @param json サーバから返却されたjson
     */
    protected _restoreFromJson( json: AbstractDataset.Json ) {
        this._id = json.id;
        this._owner_id = json.owner_id;
        this._name = json.name;
        this._description = json.description;
        this._created_at = new Date(json.created_at);
        this._updated_at = new Date(json.updated_at);
    }
}



namespace AbstractDataset {


export interface Json {
    id: string;
    owner_id: string;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
}

} // namespace AbstractDataset



/**
 * データセットを表現するクラス
 */
class Dataset extends AbstractDataset {

    /**
     * @param api
     */
    private constructor( api: MaprayApi ) {
        super( api );
    }

    protected override _restoreFromJson( json: Dataset.Json ) {
        super._restoreFromJson( json );
    }

    /**
     * @internal
     * @param api
     * @param サーバから返却されたjson
     */
    static createFromJson( api: MaprayApi, json: Dataset.Json ): Dataset {
        const dataset = new Dataset( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}



namespace Dataset {


export interface Json extends AbstractDataset.Json {
}


} // namespace Dataset



/**
 * 3Dデータセットを表現するクラス
 */
class Dataset3D extends AbstractDataset {

    // @ts-ignore
    private _url: string;

    // @ts-ignore
    private _scene_id: string;

    // @ts-ignore
    private _path: string;

    // @ts-ignore
    private _format: string;

    // @ts-ignore
    private _srid: string;

    // @ts-ignore
    private _origin: GeoPoint;

    /**
     * @param api
     */
    private constructor( api: MaprayApi ) {
        super( api );
    }

    /**
     * 原点位置
     */
    getOrigin(): GeoPoint {
        return this._origin;
    }

    /**
     * モデルが公開されているURL
     */
    getUrl(): string {
        return this._url;
    }

    /**
     * フォーマット
     */
    getFormat(): string {
        return this._format;
    }

    /**
     * シーンID
     */
    getSceneId(): string {
        return this._scene_id;
    }

    /**
     * Path
     */
    getPath(): string {
        return this._path;
    }

    /**
     * SRID
     */
    getSRID(): string {
        return this._srid;
    }

    protected override _restoreFromJson( json: Dataset3D.Json ) {
        /* missing options
        "x": 137.715,
        "y": 34.71111,
        "z": 0,
        "roll": 0,
        "tilt": 0,
        "heading": 0,
        "sx": 1,
        "sy": 1,
        "sz": 1,
        "offset_x": 0,
        "offset_y": 0,
        "offset_z": 0,
        "offset_roll": 0,
        "offset_tilt": 0,
        "offset_heading": 0,
        "offset_sx": 1,
        "offset_sy": 1,
        "offset_sz": 1,
        "altitude_mode": "absolute",
        */
        super._restoreFromJson( json );
        this._url = json.url;
        this._scene_id = json.scene_id;
        this._path = json.path;
        this._format = json.format;
        this._srid = json.srid;
        this._origin = new GeoPoint(json.x, json.y, json.z);
    }

    /**
     * @internal
     * @param {MaprayApi} api
     * @param {json} サーバから返却されたjson
     * @return {Dataset3D}
     */
    static createFromJson( api: MaprayApi, json: Dataset3D.Json ) {
        const dataset = new Dataset3D( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}



namespace Dataset3D {


export interface RequestJson extends AbstractDataset.Json {
    /**
     * glTFファイルのパスを指定します（アップロードする際はディレクトリを指定するため、ディレクトリルートからのglTFファイルへのパスを指定します）
     */
    path: string;

    /**
     * "glTF"を指定します
     */
    format: string;

    /**
     * 現在は4326（WGS 84）を指定します
     */
    srid: string;

    /**
     * 経度
     */
    x: number;

    /**
     * 緯度
     */
    y: number;

    /**
     * 高さ
     */
    z: number;
}


export interface Json extends RequestJson {
    /**
     * データのURL
     */
    url: string;

    /**
     * シーンID
     */
    scene_id: string;
}



} // namespace Dataset3D



/**
 * 点群データセットを表現するクラス
 */
class PointCloudDataset extends AbstractDataset {

    // @ts-ignore
    private _url?: string;

    // @ts-ignore
    private _bounding_box: GeoJson.BBox3d;

    // @ts-ignore
    private _content_root: string;

    // @ts-ignore
    private _format: string;

    /**
     * @param api
     */
    constructor( api: MaprayApi ) {
        super( api );
    }

    /**
     * 点群ファイルが公開されているURLを取得
     */
    getUrl() {
        return this._url;
    }

    /**
     * 点群のバウンディングボックスを取得
     */
    getBoundingBox() {
        return this._bounding_box;
    }

    /**
     * 1レベルに1ボックスしか存在しないボックスの中で最も高いレベルのボックス。
     * （点群に含まれる全ての点を包含するボックスの中で最も高いレベルのボックス）
     */
    getContentRoot(): string {
        return this._content_root;
    }

    /**
     * フォーマット（現在はrawのみ対応）
     */
    getFormat(): string {
        return this._format;
    }

    /**
     * @param json サーバから返却されたJson
     */
    protected override _restoreFromJson( json: PointCloudDataset.Json ) {
        super._restoreFromJson( json );
        // this._srid = json.srid;
        this._url = json.url;
        const bbox = json.bbox;
        this._bounding_box = (
            GeoJson.isBBox3d(bbox) ? bbox:
            [ bbox[0], bbox[1], 0, bbox[2], bbox[3], 0, ]
        );
        this._content_root = Array.isArray(json.content_root) ? json.content_root.join("/") : json.content_root;
        this._format = json.format;
    }

    /**
     * @internal
     * @param api
     * @param サーバから返却されたjson
     */
    static createFromJson( api: MaprayApi, json: PointCloudDataset.Json ): PointCloudDataset {
        const dataset = new PointCloudDataset( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}



namespace PointCloudDataset {


export interface Json extends AbstractDataset.Json {
    url?: string;
    bbox: GeoJson.BBox;
    content_root: [ level: number, x: number, y: number, z: number ];
    format: string;
}


} // namespace PointCloudDataset



namespace GeoJson {


export function isBBox3d(arg: any): arg is BBox3d {
    return arg.length === 6;
}

export type BBox2d = [
    minLng: number, minLat: number,
    maxLng: number, maxLat: number,
];


export type BBox3d = [
    minLng: number, minLat: number, minAlt: number,
    maxLng: number, maxLat: number, maxAlt: number,
];


export type BBox = BBox2d | BBox3d;



} // namespace GeoJson



export { AbstractDataset, Dataset, Dataset3D, PointCloudDataset };
