/**
 * @private
 */
class HTTP {

    static async get( url: string, query?: HTTP.Query, option = {} )
    {
        return await this.fetch( HTTP.METHOD.GET, url, query, undefined, option );
    }

    static async post( url: string, query?: HTTP.Query, body?: HTTP.Body, option = {} )
    {
        return await this.fetch( HTTP.METHOD.POST, url, query, body, option );
    }

    static async patch( url: string, query?: HTTP.Query, body?: HTTP.Body, option = {} )
    {
        return await this.fetch( HTTP.METHOD.PATCH, url, query, body, option );
    }

    static async put( url: string, query?: HTTP.Query, body?: HTTP.Body, option = {} )
    {
        return await this.fetch( HTTP.METHOD.PUT, url, query, body, option );
    }

    static async delete( url: string, query?: HTTP.Query, option = {} )
    {
        return await this.fetch( HTTP.METHOD.DELETE, url, query, undefined, option );
    }

    /**
     * @summary call fetch
     *
     * <pre>
     * query = {
     *     key1: value1,
     *     key2: value2,
     * };
     * URL: url?key1=value1&key2=value2
     * </pre>
     * window.fetch();
     *
     * @private
     * @param method
     * @param url
     * @param {object} query
     * @param {object|string} body
     * @param {object} [option] second argument of window.fetch(url, [init]).
     */
    static async fetch( method: string, url: string, query?: HTTP.Query, body?: HTTP.Body, option: RequestInit = {} )
    {
        const queryText = !query ? "" : "?" + Object.keys( query ).map( k => k + "=" + query[k] ).join("&");
        option.method = method;
        if (body) option.body = typeof(body) === "object" ? JSON.stringify(body) : body;

        let response;
        try {
            response = await fetch( url + queryText, option);
        }
        catch( error: unknown ) {
            if ( error instanceof Error) {
                throw new HTTP.FetchError("Failed to fetch", url, undefined, error);
            } else {
                throw new HTTP.FetchError("Failed to fetch", url, undefined, undefined);
            }
        }
        if ( !response.ok ) {
            throw new HTTP.FetchError( "Failed to fetch: " + response.statusText, url, response );
        }
        return response;
    }

    static isJson( mimeType: string ) {
        return (
            mimeType.startsWith( "application/json" ) ||
            mimeType === "model/gltf+json"
        );
    }
}


namespace HTTP {


export interface Query {
    [key: string]: string | number;
}

export type Body = object | string;


export enum METHOD {
    GET = "GET",
    POST = "POST",
    PATCH = "PATCH",
    PUT = "PUT",
    DELETE = "DELETE",
};

export const CONTENT_TYPE = "Content-Type";

export enum RESPONSE_STATUS {
    NO_CONTENT = 204,
};


/**
 * @private
 */
export class FetchError extends Error {

    name: string;

    url: string;

    response?: Response;

    cause?: Error;

    stack?: string;

    is_aborted: boolean;

    constructor( message: string, url: string, response?: Response, cause?: Error )
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



} // namespace HTTP


export default HTTP;
