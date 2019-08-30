class HTTP {

    static get( url, option={} )
    {
        return this.fetch( HTTP.METHOD.GET, url, null, option );
    }

    static post( url, body, option={} )
    {
        return this.fetch( HTTP.METHOD.POST, url, body, option );
    }

    static delete( url, option={} )
    {
        return this.fetch( HTTP.METHOD.DELETE, url, null, option );
    }

    static fetch( method, url, body, option={} )
    {
        option.method = method;
        if (body) option.body = body;
        return (
            fetch( url, option )
            .then( response => {
                    if ( !response.ok ) {
                        throw new FetchError( "Failed to fetch: " + response.statusText, url, response );
                    }
                    return response;
            } )
            .catch( error => {
                    throw new FetchError( "Failed to fetch", url, null, error );
            } )
        );
    }

    static isJson( mimeType ) {
        return mimeType.startsWith( "application/json" );
    }
}

HTTP.METHOD = {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
};

HTTP.CONTENT_TYPE = "Content-Type";

HTTP.RESPONSE_STATUS = {
    NO_CONTENT: 204
};

HTTP.CREDENTIAL_MODE = {
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

class FetchError extends Error {
    constructor( message, url, response, cause )
    {
        super( message + " " + url );
        if ( Error.captureStackTrace ) {
            Error.captureStackTrace( this, FetchError );
        }
        this.name = "FetchError";
        this.url = url;
        this.response = response;
        this.cause = cause;
        if ( cause ) {
            this.stack += "\nCaused-By: " + cause.stack;
        }
    }
}

export { FetchError };
export default HTTP;
