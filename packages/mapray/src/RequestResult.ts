/**
 * 非同期データ要求で返されるオブジェクトの型
 * [[RequestResult]] と、それに関連する型を定義する。
 *
 * @module
 */


/**
 * 非同期データ要求で返されるオブジェクトの型
 *
 * [[promise]] プロパティは通常の `Promise` と同じように利用できる。
 *
 * [[canceller]] プロパティの関数を呼び出すことにより、要求を取り消す
 * ことができる。
 *
 * @typeParam T - データ要求で返されるデータの型
 *
 * @remarks
 *
 * [[promise]] の状態が変化するタイミングと `then` 関数などに与えたコール
 * バックが呼び出されるタイミングにはタイムラグがあるので、利用者は
 * [[canceller]] を呼出した後に、履行のコールバック (`onFulfilled`) が呼び
 * 出されたり、拒否コールバック (`onRejected`) が呼び出されない可能性を
 * 考慮しなければならない。
 */
export interface RequestResult<T> {

    /**
     * 要求されたデータを受け取るための `Promise` インスタンスである。
     *
     * 要求したデータが取得できたとき `T` 型の値で履行状態になり、デー
     * タの取得に失敗したとき拒否状態になる。
     *
     * [[canceller]] プロパティの関数が呼び出されたとき、その時点で履
     * 行状態でも拒否状態でもないとき、拒否状態になる。
     */
    promise: Promise<T>;


    /**
     * フレームワークが要求を取り消すときに呼び出す関数である。
     *
     * 取り消す方法がないときは、取り消す処理を行わなくてもよい。
     *
     * ただし [[promise]] が履行状態でも拒否状態でもないときは、
     * 拒否状態にしなければならない。
     *
     * この関数を呼出している間の `this` は未定義である。
     */
    canceller: RequestCanceller;

}


/**
 * 要求取り消し関数の型
 *
 * @see [[RequestResult.canceller]]
 */
export interface RequestCanceller {

    (): void;

}


/**
 * 取り消しを補助するクラス
 */
export class CancelHelper {

    private           _cancelled: boolean;
    private readonly _cancellers: RequestCanceller[];


    constructor()
    {
        this._cancelled  = false;
        this._cancellers = [];
    }


    cancel(): void
    {
        for ( const canceller of this._cancellers ) {
            canceller();
        }

        this._cancelled = true;
        this._cancellers.length = 0;
    }


    addCanceller( canceller: RequestCanceller ): void
    {
        if ( this._cancelled ) {
            canceller();
        }
        else {
            this._cancellers.push( canceller );
        }
    }

}
