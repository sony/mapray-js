import HTTP from "./HTTP";


class Resource {

    load( resourceType ) {
        return Promise.reject( new Error( "Not Implemented" ) );
    }

    cancel() {
    }

    isSubResourceSupported() {
        return false;
    }

    loadSubResource( url, resourceType ) {
    }
}

export default Resource;



class URLResource extends Resource {

    constructor(url, options={}) {
        super();
        this._url = url;
        this._type = options.type || "json";
        this._transform = options.transform || defaultTransformCallback;
        this._abort_ctrl = new AbortController();
    }

    load( resourceType ) {
        const tr = this._transform( this._url, resourceType );
        return (
            HTTP.get( tr.url, this._make_fetch_params( tr ) )
            .then( response => {
                    if ( !response.ok ) throw new Error( response.statusText );
                    if ( this._type === "json" ) {
                        return response.json();
                    }
                    else throw new Error( "unsupported type: " + this._type );
            })
        );
    }

    cancel() {
        this._abort_ctrl.abort();
    }

    isSubResourceSupported() {
        return true;
    }

    loadSubResource( url, resourceType ) {
        const tr = this._transform( url, resourceType );
        return (
            HTTP.get( tr.url, this._make_fetch_params( tr ) )
            .then( response => {
                    if ( !response.ok ) throw new Error( response.statusText );
                    if ( this._type === "json" ) {
                        return response.json();
                    }
                    else throw new Error( "unsupported type: " + this._type );
            })
        );
    }

    /**
     * fetch() の init 引数に与えるオブジェクトを生成
     * @private
     */
    _make_fetch_params( tr )
    {
        var init = {
            signal:      this._abort_ctrl.signal,
            credentials: (tr.credentials || HTTP.CREDENTIAL_MODE.OMIT).credentials
        };

        if ( tr.headers ) {
            init.headers = tr.headers;
        }

        return init;
    }

}
export {URLResource};




function defaultTransformCallback( url, type )
{
    return { url: url };
}
