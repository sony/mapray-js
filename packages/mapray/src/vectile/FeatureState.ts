import type { StyleManager } from "./style_manager";
import { FeatureState as ExprFeatureState } from "./expression";


/**
 * 特定のフィーチャに独自のプロパティを割り当てる。
 *
 * スタイルで `["feature-state", "prop-name"]` のような式を評価すると、
 * そのフィーチャーに対する `FeatureState` インスタンスに設定した
 * `"prop-name"` プロパティの値が得られる。
 *
 * ただし `"prop-name"` プロパティが存在しないとき、またはフィーチャーに
 * 対する `FeatureState` インスタンスが存在しないときは `null` が得られる。
 *
 * `FeatureState` インスタンスは [[StyleManager.ensureFeatureState]]
 * により生成することができる。
 */
export class FeatureState {

    /**
     * 起源となる [[StyleManager]] インスタンス
     */
    public readonly style_manager: StyleManager;


    /**
     * 対応するフィーチャの ID
     */
    public readonly feature_id: number;


    /**
     * プロパティ評価用のフィーチャ状態
     *
     * @internal
     */
    public readonly __content: ExprFeatureState;


    /**
     * 保有するプロパティの数
     */
    get num_properties(): number
    {
        return this._pid_set.size;
    }


    /**
     * プロパティの値を設定する。
     *
     * `pid` に対応するプロパティの値を `value` に設定する。
     *
     * プロパティが存在しないときは、新規にプロパティを生成して値を
     * `value` に設定する。
     *
     * @remarks
     * `value` はそのまま this に保持される (複製されない) ので、`value` が
     * 参照型のときはその内容を変更しないこと。
     */
    setValue( pid:   string,
              value: unknown ): void
    {
        if ( !this._pid_set.has( pid ) ) {
            // プロパティを新規に追加
            this._pid_set.add( pid );
        }

        // プロパティの値を更新
        this.__content[pid] = value;
    }


    /**
     * プロパティの値を取得する。
     *
     * `pid` に対応するプロパティの値を取得する。
     *
     * プロパティが存在しない場合は `undefined` を返す。
     */
    getValue( pid: string ): unknown | undefined
    {
        return this.__content[pid];
    }


    /**
     * 所有するプロパティの ID を列挙するオブジェクトを取得する。
     */
    getPropertyIds(): IterableIterator<string>
    {
        return this._pid_set.values();
    }


    /**
     * 指定したプロパティの所有を確認する。
     *
     * `pid` に対応するプロパティを所有していれば `true`, 所有していな
     * ければ `false` を返す。
     */
    hasProperty( pid: string ): boolean
    {
        return this._pid_set.has( pid );
    }


    /**
     * 所有するすべてのプロパティを削除する。
     */
    clearProperties(): void
    {
        for ( const pid of this._pid_set ) {
            delete this.__content[pid];
        }

        this._pid_set.clear();
    }


    /**
     * 指定したプロパティを削除する。
     *
     * `pid` に対応するプロパティを削除する。
     *
     * そのプロパティが存在しなければ何もしない。
     */
    deleteProperty( pid: string ): void
    {
        if ( this._pid_set.has( pid ) ) {
            delete this.__content[pid];
            this._pid_set.delete( pid );
        }
    }


    /**
     * 内部用のインスタンス生成
     *
     * @internal
     */
    public static __create( owner:      StyleManager,
                            feature_id: number ): FeatureState
    {
        return new FeatureState( owner, feature_id );
    }


    private constructor( owner: StyleManager,
                         feature_id: number )
    {
        this.style_manager = owner;
        this.feature_id    = feature_id;
        this._pid_set      = new Set();
        this.__content     = {};
    }


    private readonly _pid_set: Set<string>;

}
