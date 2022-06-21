import CloudApi from "./CloudApi";
import GeoPoint from "../GeoPoint";


/**
 * データセットを表現する抽象クラス
 */
class AbstractDataset {

    private _api: CloudApi;

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
    constructor( api: CloudApi ) {
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

export interface Count {
    /**
     * データセット数
     */
    count: number;
}

} // namespace AbstractDataset



/**
 * データセットを表現するクラス
 */
class Dataset extends AbstractDataset {

    /**
     * @param api
     */
    private constructor( api: CloudApi ) {
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
    static createFromJson( api: CloudApi, json: Dataset.Json ): Dataset {
        const dataset = new Dataset( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}



namespace Dataset {


export interface Json extends AbstractDataset.Json {
}

export interface Count extends AbstractDataset.Count {
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
    private _srid: string;

    // @ts-ignore
    private _origin: GeoPoint;

    // @ts-ignore
    private _src_file_type: string;

    // @ts-ignore
    private _dst_file_type: string;

    // @ts-ignore
    private _extensions: object;

    /**
     * @param api
     */
    private constructor( api: CloudApi ) {
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

    /**
     * ソースファイルの形式
     */
     getSrcFileType(): string {
        return this._src_file_type;
    }

    /**
     * 変換後ファイルの形式
     */
     getDstFileType(): string {
        return this._dst_file_type;
    }

    /**
     * 拡張指定
     */
     getExtensions(): object {
        return this._extensions;
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
        this._srid = json.srid;
        this._origin = new GeoPoint(json.x, json.y, json.z);
        this._src_file_type = json.src_file_type;
        this._dst_file_type = json.dst_file_type;
        this._extensions = json.extensions;
    }

    /**
     * @internal
     * @param {CloudApi} api
     * @param {json} サーバから返却されたjson
     * @return {Dataset3D}
     */
    static createFromJson( api: CloudApi, json: Dataset3D.Json ) {
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

    /**
     * アップロードするファイル種類 ("glTF"等) を指定します
     */
    src_file_type: string;

    /**
     * "glTF"を指定します
     */
    dst_file_type: string;

    /**
     * 拡張指定
     */
    extensions: object
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


export interface UploadFileInfo {
    /**
     * ファイル名
     */
    filename: string;

    /**
     * ファイルタイプ
     */
    content_type: string;
}


export interface UploadUrlInfo extends UploadFileInfo {
    /**
     * URL
     */
    url: string;
}


export interface Count extends AbstractDataset.Count {
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
    constructor( api: CloudApi ) {
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
        const bbox = json.fileinfo.bbox;
        this._bounding_box = (
            GeoJson.isBBox3d(bbox) ? bbox:
            [ bbox[0], bbox[1], 0, bbox[2], bbox[3], 0, ]
        );
        this._content_root = Array.isArray(json.fileinfo.content_root) ? json.fileinfo.content_root.join("/") : json.fileinfo.content_root;
        this._format = json.fileinfo.format;
    }

    /**
     * @internal
     * @param api
     * @param サーバから返却されたjson
     */
    static createFromJson( api: CloudApi, json: PointCloudDataset.Json ): PointCloudDataset {
        const dataset = new PointCloudDataset( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}



namespace PointCloudDataset {

export interface Json extends AbstractDataset.Json {
    url?: string;
    fileinfo: PointCloudDataset.FileInfo;
}

export interface FileInfo {
    bbox: GeoJson.BBox;
    content_root: [ level: number, x: number, y: number, z: number ];
    format: string;
}

export interface Count extends AbstractDataset.Count {
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



/**
 * シーンを表現するクラス
 */
class Scene extends AbstractDataset {
    // @ts-ignore
    private _x: number;

    // @ts-ignore
    private _y: number;

    // @ts-ignore
    private _z: number;

    /**
     * @param api
     */
    private constructor( api: CloudApi ) {
        super( api );
    }

    /**
     * @param json サーバから返却されたJson
     */
    protected override _restoreFromJson( json: Scene.Json ) {
        super._restoreFromJson( json );
        this._x = json.x;
        this._y = json.y;
        this._z = json.z;
    }

    /**
     * @internal
     * @param {CloudApi} api
     * @param {json} json サーバから返却されたjson
     * @return {Scene}
     */
    static createFromJson( api: CloudApi, json: Scene.Json ) : Scene {
        const dataset = new Scene( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}


namespace Scene {

export interface Json extends AbstractDataset.Json {
    x: number;
    y: number;
    z: number;
}

} // namespace Scene


export { AbstractDataset, Dataset, Dataset3D, PointCloudDataset, Scene };
