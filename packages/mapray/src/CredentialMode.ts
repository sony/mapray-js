/**
 * クレデンシャルモード
 *
 * HTTP リクエストのクレデンシャルモードを表現する型である。
 *
 * @see https://developer.mozilla.org/docs/Web/API/Request/credentials
 * @see [[StandardDemProvider]]
 *
 * @privateRemark
 *
 * 定義している個々の列挙子の値は既存のコードを変更しなくて済むように
 * 選んだ文字列である。新規のコードはこの文字列に依存しないように記述
 * すること。
 */
const enum CredentialMode {

    /**
     * 決してクッキーを送信しない
     */
    OMIT = "omit",

    /**
     * URL が呼び出し元のスクリプトと同一オリジンだった場合のみ、クッキーを送信
     */
    SAME_ORIGIN = "same-origin",

    /**
     * クロスオリジンの呼び出しであっても、常にクッキーを送信
     */
    INCLUDE = "include",

}


/**
 * クレデンシャルモードを fetch 関数用の値に変換する。
 *
 * `mode` の値を
 * [fetch](https://developer.mozilla.org/ja/docs/Web/API/fetch) 関数の
 * `credentials` 引数に与える文字列に変換する。
 */
export function convertCredentialModeToString( mode: CredentialMode ): RequestCredentials
{
    switch ( mode ) {
    case CredentialMode.OMIT:        return "omit";
    case CredentialMode.SAME_ORIGIN: return "same-origin";
    case CredentialMode.INCLUDE:     return "include";
    }
}


export default CredentialMode;
