import PointCloudProvider from "./PointCloudProvider";
import GeoMath from "./GeoMath";
import Resource, { URLResource, ResourceType } from "./Resource";


let idMax = 1;
const createUniqueId = () => {
    return idMax++;
}

class RawPointCloudProvider extends PointCloudProvider {

    /**
     * resource 点群定義(json)リソース。
     * @param {mapray.Resource} resource
     * @param {object} option
     */
    constructor( resource, option={} ) {
        super( option );
        this._suffix = ".xyz";
        if ( resource instanceof Resource ) {
            this._info_resource = resource;
        }
        else if ( resource.url ) {
            this._info_resource = new URLResource( resource.url, resource.option );
        }
        else {
            throw new Error("unsupported resource");
        }
        this._taskMap = new Map();
        this._requests = 0;
    }

    /**
     * @private
     */
    _createPath( level, x, y, z ) {
        return level + "/" + x + "/" + y + "/" + z + this._suffix;
    }

    /**
     * @override
     */
    async doInit() {
        const info = await this._info_resource.load( { type: ResourceType.JSON } );
        if ( info.url ) {
            this._resource = this._info_resource.resolveResource( info.url );
        }
        else {
            this._resource = this._info_resource;
        }
    }

    /**
     * @override
     */
    async doDestroy() {
    }

    getNumberOfRequests() {
        return this._requests;
    }

    /**
     * @override
     */
    async doLoad( id, level, x, y, z ) {
        this._requests++;
        try {
            const abortController = new AbortController();
            this._taskMap.set(id, { id, abortController });
            const path = this._createPath( level, x, y, z );
            const buffer = await this._resource.loadSubResource( path, {
                    type: ResourceType.BINARY,
                    signal: abortController.signal
            } );

            const header = {};
            let p = 0;
            header.childFlags           = new Uint8Array  (buffer, p, 1)[0]; p += 1;
            header.debug1               = new Int8Array   (buffer, p, 1)[0]; p += 1;
            p += 2; // skip
            header.indices              = new Int32Array  (buffer, p, 8);    p += 32;
            header.average              = new Float32Array(buffer, p, 3);    p += 12;
            header.eigenVector          = [];
            header.eigenVectorLength    = [];
            header.eigenVector[0]       = new Float32Array(buffer, p, 3);    p += 12;
            header.eigenVectorLength[0] = new Float32Array(buffer, p, 1)[0]; p += 4;
            header.eigenVector[1]       = new Float32Array(buffer, p, 3);    p += 12;
            header.eigenVectorLength[1] = new Float32Array(buffer, p, 1)[0]; p += 4;
            header.eigenVector[2]       = new Float32Array(buffer, p, 3);    p += 12;
            header.eigenVectorLength[2] = new Float32Array(buffer, p, 1)[0]; p += 4;

            console.assert(p == 96);
            const buf = new Float32Array(buffer, p);
            this._taskMap.delete(id);
            return {
                header: header,
                body: buf,
            };
        }
        finally {
            this._requests--;
        }
    }

    /**
     * @override
     */
    cancel( id ) {
        const item = this._taskMap.get(id);
        if (item) {
            item.abortController.abort();
        }
    }
}



export default RawPointCloudProvider;
