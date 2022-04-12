/**
 * 制御フロー分析可能なアサーション関数 [[cfa_assert]] を提供する。
 *
 * @module
 */


/**
 * アサーションに関連するエラー
 */
export class AssertionError extends Error {

    /**
     * @param message  エラーの説明
     */
    constructor( message?: string )
    {
        super( message );
        this.name = "mapray.AssertionError";
    }

}


/**
 * 制御フロー分析可能なアサーション
 *
 * `condition` が真値 (truthy) のときは何もせず、偽値 (falsy) のときは
 * [[AssertionError]] インスタンスをスローする。
 *
 * スローされる [[AssertionError]] インスタンスのエラーメッセージとし
 * て `message` を指定することができる。
 *
 * `console.assert()` と違い、この関数の呼び出しに続くフローでは、
 * `condition` に与えた式が真値(truthy) であったとして制御フロー分析
 * (CFA = Control Flow Analysis) が行われる。
 *
 * この関数の呼び出しは `production` ビルドのとき、TypeScript から
 * JavaScript のコードに変換された後にコードから削除される。
 *
 * @throws [[AssertionError]]
 *
 * 引数 `condition` が偽値 (falsy) のとき
 *
 * @remarks
 *
 * コードの削除は関数名だけで判断しているので、関数のインポート時に
 * `as` により名前を変えると正しく削除されない。
 *
 * @remarks
 *
 * `condition` に副作用のある式を与えると、`production` ビルドとそれ以
 * 外のビルドで動作が変わる可能性がある。
 *
 * @remarks
 *
 * 制御フロー分析の実現は (Assertion Functions)
 * [https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions]
 * により実現している。
 */
export function cfa_assert( condition: unknown,
                            message?:  string ): asserts condition
{
    if ( !condition ) {
        throw new AssertionError( message );
    }
}
