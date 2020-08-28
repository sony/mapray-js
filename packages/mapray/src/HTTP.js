class HTTP {

    static get( url, query, option={} )
    {
        return this.fetch( HTTP.METHOD.GET, url, query, null, option );
    }

    static post( url, query, body, option={} )
    {
        return this.fetch( HTTP.METHOD.POST, url, query, body, option );
    }

    static patch( url, query, body, option={} )
    {
        return this.fetch( HTTP.METHOD.PATCH, url, query, body, option );
    }

    static put( url, query, body, option={} )
    {
        return this.fetch( HTTP.METHOD.PUT, url, query, body, option );
    }

    static delete( url, query, option={} )
    {
        return this.fetch( HTTP.METHOD.DELETE, url, query, null, option );
    }

    static fetch( method, url, query, body, option={} )
    {
        const queryText = !query ? "" : "?" + Object.keys( query ).map( k => k + "=" + query[k] ).join("&");
        option.method = method;
        if (body) option.body = body;
        return (
            fetch( url + queryText, option )
            .catch( error => {
                    throw new FetchError( "Failed to fetch", url, null, error );
            } )
            .then( response => {
                    if ( !response.ok ) {
                        throw new FetchError( "Failed to fetch: " + response.statusText, url, response );
                    }
                    return response;
            } )
        );
    }

    static isJson( mimeType ) {
        return (
            mimeType.startsWith( "application/json" ) ||
            mimeType === "model/gltf+json"
        );
    }
}

HTTP.METHOD = {
    GET: "GET",
    POST: "POST",
    PATCH: "PATCH",
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
        let is_aborted = false;
        if ( cause ) {
            is_aborted = cause.message === "The user aborted a request.";
            this.stack += "\nCaused-By: " + ( cause.stack || cause );
        }
        this.is_aborted = is_aborted;
    }
}

export { FetchError };
export default HTTP;
