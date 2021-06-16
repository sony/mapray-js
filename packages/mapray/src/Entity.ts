import AltitudeMode from "./AltitudeMode";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import BindingBlock from "./animation/BindingBlock";
import Scene from "./Scene";
import ModelContainer from "./ModelContainer";
import RenderStage from "./RenderStage";
import Mesh from "./Mesh";
import GeoRegion from "./GeoRegion";
import Primitive from "./Primitive";
import EntityRegion from "./EntityRegion";
import EntityMaterial from "./EntityMaterial";
import AreaUtil from "./AreaUtil";


/**
 * シーン・エンティティ
 *
 * シーン・エンティティの基底クラスである。
 * @see {@link mapray.Scene}
 */
abstract class Entity {

    /**
     * 所属可能シーン
     */
    readonly scene: Scene;

    /**
     * 高度モード
     */
    protected _altitude_mode: AltitudeMode = AltitudeMode.ABSOLUTE;

    /**
     * 再生成が必要であることを示すフラグ
     */
    protected _need_to_create_regions: boolean = false;

    /**
     * 今のところ Entity (基底クラス) 自体のアニメーション可能パラメータと
     * 子孫は存在しないので animation には何も追加しない
     */
    protected _animation: any = new EasyBindingBlock();

    /**
     * 表示状態を示すフラグ
     */
    protected _visibility: boolean = true;


    /**
     * インスタンス生成後に、それを scene に追加することができる。
     *
     * @param scene  所属可能シーン
     * @param opts   オプション集合
     */
    constructor( scene: Scene, opts?: Entity.Option )
    {
        this.scene = scene;

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupEntityByJson( opts.json );
        }
    }


    /**
     * 可視性フラグを取得
     */
    get visibility(): boolean { return this._visibility; }


    /**
     * 可視性フラグを設定
     * @param visibility  可視性フラグ
     */
    setVisibility( visibility: boolean )
    {
        this._visibility = visibility;
    }


    /**
     * アンカーモード。
     *
     * 隠面処理により本来表示されない状況であっても、何らかの描画を行い位置や角度を確認でき、マウスピック可能となるようにする描画モード。
     * 現在は、{@link mapray.ModelEntity}のみサポートされ、隠面処理により表示されない部分が半透明で描画される。
     *
     * このプロパティを有効にする場合は、下記の問題点に注意する必要があります。
     * - 透明・半透明モデルに適用することは想定されていません。透明・半透明モデルに対してこのプロパティを有効にすると表示が乱れる可能性があります。
     * - アンカーモードのエンティティどうしの前後判定はzソートにより実装されており、ピクセル単位の前後判定は行われません。
     * @internal
     */
    get anchor_mode(): boolean { return false; }


    /**
     * アニメーションパラメータ設定
     */
    get animation(): any { return this._animation; } // BindingBlock


    /**
     * 高度モード設定
     */
    set altitude_mode( value: AltitudeMode )
    {
        if ( this._altitude_mode !== value ) {
            var prev_mode = this._altitude_mode;
            this._altitude_mode = value;
            this.onChangeAltitudeMode( prev_mode );
        }
    }


    /**
     * 高度モード取得
     */
    get altitude_mode(): AltitudeMode
    {
        return this._altitude_mode;
    }


    /**
     * バウンディングボックスを算出
     */
    abstract getBounds(): GeoRegion;


    /**
     * 高度モードが変更された後の通知
     *
     * this.altitude_mode が変更されたときに呼び出される。
     * 既定の実装は何もしない。
     *
     * @param prev_mode  直前のモード
     */
    protected onChangeAltitudeMode( prev_mode: AltitudeMode )
    {
    }


    /**
     * PrimitiveProducer インタフェースを取得
     *
     * PrimitiveProducer インタフェースを取得するためにシーンレンダラーが呼び出す。
     * PrimitiveProducer インタフェースが実装されていなければ undefined を返す。
     * 既定の実装は undefined を返す。
     * @return PrimitiveProducer インタフェース
     */
    getPrimitiveProducer(): Entity.PrimitiveProducer | undefined
    {
        return undefined;
    }


    /**
     * FlakePrimitiveProducer インタフェースを取得
     *
     * FlakePrimitiveProducer インタフェースを取得するためにシーンレンダラーが呼び出す。
     * FlakePrimitiveProducer インタフェースが実装されていなければ undefined を返す。
     *
     * 既定の実装は undefined を返す。
     *
     * @return FlakePrimitiveProducer インタフェース
     */
    getFlakePrimitiveProducer(): Entity.FlakePrimitiveProducer | undefined
    {
        return undefined;
    }


    /**
     * JSON データによる Entity 共通の初期化
     */
    private _setupEntityByJson( json: Entity.Json )
    {
        if ( json.altitude_mode ) {
            switch ( json.altitude_mode ) {
            case "absolute":
                this._altitude_mode = AltitudeMode.ABSOLUTE;
                break;
            case "relative":
                this._altitude_mode = AltitudeMode.RELATIVE;
                break;
            case "clamp":
                this._altitude_mode = AltitudeMode.CLAMP;
                break;
            default:
                console.error( "unrecognized altitude_mode: " + json.altitude_mode );
            }
        }

        if ( json.visibility !== undefined ) this.setVisibility( json.visibility );
    }

}



namespace Entity {



/** Entity Option */
export interface Option {
    /**
     * 生成情報
     */
    json?: Entity.Json;

    /** 参照辞書 */
    refs?: Entity.ReferenceMap;

}



/** Entity Json */
export interface Json {

    id?: string;

    type: string;

    /** 高度モード */
    altitude_mode?: "absolute" | "relative" | "clamp";

    /** 可視性 */
    visibility?: boolean;

}



export interface ReferenceMap {
    [key: string]: ModelContainer | Entity;
}



/**
 * エンティティのプリミティブを生成
 *
 * シーンレンダラーにエンティティのプリミティブを与える。
 * @internal
 */
export abstract class PrimitiveProducer {

    private _need_to_create_regions: boolean = false;

    private _entity: Entity;


    /**
     */
    constructor( entity: Entity )
    {
        this._entity = entity;
    }


    /**
     * エンティティ
     */
    getEntity(): Entity {
        return this._entity;
    }


    /**
     * 領域が更新されたとき呼び出す
     *
     * 領域を変更したい場合に PrimitiveProducer の実装者が呼び出す必要がある。
     */
    needToCreateRegions()
    {
        this._need_to_create_regions = true;
    }


    /**
     * need_to_create_regions を取得
     *
     * エンティティの領域を変更する (createRegions() を呼び出す) 必要があるかどうかを確認するためにシーンレンダラーが呼び出す。
     *
     * @return 領域を変更する必要があるとき true, それ以外のとき false
     *
     * @see {@link mapray.EntityPrimitiveProducer.needToCreateRegions}
     */
    checkToCreateRegions()
    {
        var result = this._need_to_create_regions;
        this._need_to_create_regions = false;
        return result;
    }


    /**
     * エンティティに標高値は必要か？
     *
     * エンティティが標高値を必要としているかどうかを確認するためレンダラーが呼び出す。
     * 既定の実装では entity.altitude_mode が AltitudeMode.ABSOLUTE なら false, それ以外なら true を返す。
     *
     * @return   エンティティに標高値が必要なら true, それ以外なら false
     */
    needsElevation()
    {
        return (this.getEntity().altitude_mode !== AltitudeMode.ABSOLUTE);
    }


    /**
     * エンティティ領域を生成
     *
     * エンティティの領域を確認するためレンダラーが呼び出す。
     * 既定の実装では `[]` を返す。
     *
     * @return エンティティ領域の配列
     */
    createRegions(): EntityRegion[]
    {
        return [];
    }


    /**
     * 更新されたエンティティ領域の通知
     *
     * エンティティの領域の標高が変化したことを通知するためレンダラーが呼び出す。regions は標高が更新されたエンティティ領域を含む配列である。
     * 既定の実装では何もしない。
     *
     * @param regions  エンティティ領域の配列
     */
    onChangeElevation( regions: EntityRegion[] )
    {
    }


    /**
     * プリミティブ配列を取得
     *
     * レンダリング時にこのエンティティを描画するための 0 個以上のプリミティブを含む配列を返す。
     * このメソッドが呼び出されたフレームのレンダリングが終了するまで、返した配列とそれに含まれるプリミティブは変更してはならない。
     *
     * @param   stage  レンダリングステージ
     * @return         プリミティブ配列
     */
    abstract getPrimitives( stage: RenderStage ): Primitive[];
}



/**
 * 地表断片エンティティのプリミティブを生産
 *
 * シーンレンダラーに地表断片エンティティのプリミティブを与える。
 * @internal
 */
export abstract class FlakePrimitiveProducer {

    private _entity: Entity;

    private _updated: boolean = false;

    /**
     * @param {mapray.Entity} entity  FlakePrimitiveProducer に対応するエンティティ
     */
    constructor( entity: Entity )
    {
        this._entity  = entity;
    }


    /**
     * エンティティ
     */
    getEntity(): Entity {
        return this._entity;
    }


    /**
     * 位置や形状の変化を通知
     */
    notifyForUpdate()
    {
        this._updated = true;
    }


    /**
     * 領域状態を取得
     *
     * area が示す領域の状態を取得する。
     * @param  area  確認する領域
     * @return       領域の状態
     */
    getAreaStatus( area: AreaStatus )
    {
        return AreaStatus.EMPTY;
    }


    /**
     * メッシュを生成
     *
     * area の領域に対応するメッシュを取得する。
     * area に形状がないときは null を返す。
     *
     * @param area  メッシュの領域
     * @param dpows  領域の分割指数
     * @param dem  DEM バイナリ
     * @return
     */
    createMesh( area: AreaUtil.Area, dpows: number[], dem: any ): Mesh | null // DemBinary
    {
        return null;
    }


    /**
     * マテリアルとプロパティを取得
     *
     * @param  stage  レンダリングステージ
     * @return マテリアル及びプロパティ
     */
    abstract getMaterialAndProperties( stage: RenderStage ): { material: any, properties: any }; // PropSet


    /**
     * 更新状態を確認
     *
     * レンダラーが呼び出す。
     * 更新状態を返してから、更新なし状態に設定する。
     *
     * @return  更新ありのとき true, それ以外のとき false
     */
    checkForUpdate()
    {
        let updated = this._updated;

        this._updated = false;

        return updated;
    }

}



/**
 * 領域状態の列挙型
 */
export enum AreaStatus {

    /**
     * 何もない領域
     */
    EMPTY,


    /**
     * 完全に満たされた領域
     */
    FULL,


    /**
     * 部分領域または領域不明
     */
    PARTIAL,

}

} // namespace Entity



export default Entity;
