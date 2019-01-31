/**
 * @summary クレデンシャルモード
 * @desc
 * <p>HTTP リクエストのクレデンシャルモードを表現する型である。<p>
 * @enum {object}
 * @memberof mapray
 * @constant
 * @see https://developer.mozilla.org/docs/Web/API/Request/credentials
 * @see mapray.StandardDemProvider
 */
var CredentialMode = {

    /**
     * 決してクッキーを送信しない
     */
    OMIT: { id: "OMIT", credentials: "omit" },

    /**
     * URL が呼び出し元のスクリプトと同一オリジンだった場合のみ、クッキーを送信
     */
    SAME_ORIGIN: { id: "SAME_ORIGIN", credentials: "same-origin" },

    /**
     * クロスオリジンの呼び出しであっても、常にクッキーを送信
     */
    INCLUDE: { id: "INCLUDE", credentials: "include" }

};


export default CredentialMode;
