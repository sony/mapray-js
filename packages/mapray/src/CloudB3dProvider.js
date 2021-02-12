import B3dProvider from "./B3dProvider";
import CredentialMode from "./CredentialMode";
import Resource, { URLResource, ResourceType } from "./Resource";

class CloudB3dProvider extends B3dProvider {

    /**
     * resource 街データ定義(json)リソース。
     * @param {mapray.Resource} resource
     */
    constructor( resource )
    {
        super();

        if ( resource instanceof Resource ) {
            this._info_resource = resource;
        }
        else if ( resource.url ) {
            this._info_resource = new URLResource( resource.url, resource.option );
        }
        else {
            throw new Error("unsupported resource");
        }

        this._suffix = ".bin";
    }


    /**
     * @override
     */
    requestMeta( callback )
    {
        var actrl = new AbortController();

        this._info_resource.load( { type: ResourceType.JSON } )
        .then( (info) => {
          if ( info.url ) {
              this._resource = this._info_resource.resolveResource( info.url );
          }
          else {
              this._resource = this._info_resource;
          }

          callback( info.fileinfo );
        });

        return actrl;
    }


    /**
     * @override
     */
    requestTile( area, callback )
    {
        var actrl = new AbortController();

        const path = this._makeTileURL( area );
        this._resource.loadSubResource( path, {
                type: ResourceType.BINARY,
                signal: actrl.signal
        } ).then( (buffer) => {
          callback( buffer );
        })
        .catch( () => {
            // データ取得に失敗または取り消し
            callback( null );
        } );

        return actrl;
    }


    /**
     * @override
     */
    cancelRequest( id )
    {
        var actrl = id;  // 要求 ID を AbortController に変換
        actrl.abort();   // 取り消したので要求を中止
    }


    /**
     * タイルデータの URL を作成
     * @private
     */
    _makeTileURL( area )
    {
        let c = area.coords;

        return area.level + '/' + c[0] + '/' + c[1] + '/' + c[2] + this._suffix;
    }

}


export default CloudB3dProvider;
