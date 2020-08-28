/**
 * @summary データセットを表現する抽象クラス
 */
export class AbstractDataset {

    /**
     * @param {MaprayApi} api
     */
    constructor( api ) {
        this._aip = api;
    }

    /**
     * @summary データセットのidを取得
     * @return {string}
     */
    getId() {
        return this._id;
    }

    /**
     * @summary オーナーのidを取得
     * @return {string}
     */
    getOwnerId() {
        return this._owner_id;
    }

    /**
     * @summary 名前を取得
     * @return {string}
     */
    getName() {
        return this._name;
    }

    /* 
     * @summary 名前を設定
     * @return {string} value
     *
    setName( value ) {
        this._name = value;
    }
    */

    /**
     * @summary 説明を取得
     * @return {string}
     */
    getDescription() {
        return this._description;
    }

    /*
     * @summary 説明を設定
     * @param {string} value
     *
    setDescription( value ) {
        this._description = value;
    }
    */

    /**
     * @summary 作成日時を取得
     * @return {Date}
     */
    getCreatedAt() {
        return this._created_at;
    }

    /**
     * @summary 更新日時を取得
     * @return {Date}
     */
    getUpdatedAt() {
        return this._updated_at;
    }

    /**
     * @private
     * @param {json} サーバから返却されたjson
     */
    _restoreFromJson( json ) {
        this._id = json.id;
        this._owner_id = json.owner_id;
        this._name = json.name;
        this._description = json.description;
        this._created_at = new Date(json.created_at);
        this._updated_at = new Date(json.updated_at);
    }
}



/**
 * @summary データセットを表現するクラス
 */
export class Dataset extends AbstractDataset {

    /**
     * @param {MaprayApi} api
     */
    constructor( api ) {
        super( api );
    }

    /**
     * @private
     * @param {json} サーバから返却されたjson
     */
    _restoreFromJson( json ) {
        super._restoreFromJson( json );
    }

    /**
     * @private
     * @param {MaprayApi} api
     * @param {json} サーバから返却されたjson
     * @return {Dataset}
     */
    static createFromJson( api, json ) {
        const dataset = new Dataset( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}



/**
 * @summary 3Dデータセットを表現するクラス
 */
export class Dataset3D extends AbstractDataset {

    /**
     * @param {MaprayApi} api
     */
    constructor( api ) {
        super( api );
    }

    /**
     * @summary モデルが公開されているURL
     */
    getUrl() {
        return this._url;
    }

    getFormat() {
        return this._format;
    }

    getSceneId() {
        return this._scene_id;
    }

    getPath() {
        return this._path;
    }

    getSRID() {
        return this._srid;
    }

    /**
     * @private
     * @param {json} サーバから返却されたjson
     */
    _restoreFromJson( json ) {
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
    }

    /**
     * @private
     * @param {MaprayApi} api
     * @param {json} サーバから返却されたjson
     * @return {Dataset3D}
     */
    static createFromJson( api, json ) {
        const dataset = new Dataset3D( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}



/**
 * @summary 点群データセットを表現するクラス
 */
export class PointCloudDataset extends AbstractDataset {

    /**
     * @param {MaprayApi} api
     */
    constructor( api ) {
        super( api );
    }

    /**
     * @summary 点群ファイルが公開されているURLを取得
     */
    getUrl() {
        return this._url;
    }

    /**
     * @summary 点群のバウンディングボックスを取得
     */
    getBoundingBox() {
        return this._bounding_box;
    }

    /**
     * @summary 1レベルに1ボックスしか存在しないボックスの中で最も高いレベルのボックス。
     * （点群に含まれる全ての点を包含するボックスの中で最も高いレベルのボックス）
     * @return string
     */
    getContentRoot() {
        return this._content_root;
    }

    /**
     * @summary フォーマット（現在はrawのみ対応）
     * @return string
     */
    getFormat() {
        return this._format;
    }

    /**
     * @private
     * @param {json} サーバから返却されたjson
     */
    _restoreFromJson( json ) {
        super._restoreFromJson( json );
        // this._srid = json.srid;
        this._url = json.url;
        this._bounding_box = json.bbox;
        this._content_root = Array.isArray(json.content_root) ? json.content_root.join("/") : json.content_root;
        this._format = json.format;
    }

    /**
     * @private
     * @param {MaprayApi} api
     * @param {json} サーバから返却されたjson
     * @return {PointCloudDataset}
     */
    static createFromJson( api, json ) {
        const dataset = new PointCloudDataset( api );
        dataset._restoreFromJson( json );
        return dataset;
    }
}
