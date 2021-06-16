/**
 * クレデンシャルモード
 *
 * HTTP リクエストのクレデンシャルモードを表現する型である。
 * @see https://developer.mozilla.org/docs/Web/API/Request/credentials
 * @see [[mapray.StandardDemProvider]]
 */
enum CredentialMode {

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

};


export default CredentialMode;
