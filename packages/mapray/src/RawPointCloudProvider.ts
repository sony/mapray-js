import PointCloudProvider from "./PointCloudProvider";
import GeoMath from "./GeoMath";
import Resource, { URLResource } from "./Resource";


let idMax = 1;
const createUniqueId = () => {
    return idMax++;
}

class RawPointCloudProvider extends PointCloudProvider {

    private _suffix: string;

    private _info_resource: Resource;

    private _resource!: Resource;

    private _taskMap: Map<number, RawPointCloudProvider.Task>;

    private _requests: number;


    /**
     * resource 点群定義(json)リソース。
     * @param {mapray.Resource} resource
     * @param {object} option
     */
    constructor( resource: Resource | RawPointCloudProvider.ResourceInfo, option={} ) {
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
        this._taskMap = new Map<number, RawPointCloudProvider.Task>();
        this._requests = 0;
    }


    private _createPath( level: number, x: number, y: number, z: number ) {
        return level + "/" + x + "/" + y + "/" + z + this._suffix;
    }


    override async doInit() {
        const info = await this._info_resource.load( { type: Resource.Type.JSON } );
        if ( info.url ) {
            this._resource = this._info_resource.resolveResource( info.url );
        }
        else {
            this._resource = this._info_resource;
        }
    }


    override async doDestroy() {
    }


    override getNumberOfRequests() {
        return this._requests;
    }


    override async doLoad( id: number, level: number, x: number, y: number, z: number ): Promise<PointCloudProvider.Data> {
        this._requests++;
        try {
            const abortController = new AbortController();
            this._taskMap.set(id, { id, abortController });
            const path = this._createPath( level, x, y, z );
            const buffer = await this._resource.loadSubResource( path, {
                    type: Resource.Type.BINARY,
                    signal: abortController.signal
            } );

            let p = 0;
            const childFlags        = new Uint8Array  (buffer, p, 1)[0]; p += 1;
            const debug1            = new Int8Array   (buffer, p, 1)[0]; p += 1;
            p += 2; // skip
            const indices           = new Int32Array  (buffer, p, 8);    p += 32;
            const average           = new Float32Array(buffer, p, 3);    p += 12;
            const eigenVector       = [];
            const eigenVectorLength = [];
            const ev1               = new Float32Array(buffer, p, 3);    p += 12;
            const ev1len            = new Float32Array(buffer, p, 1)[0]; p += 4;
            const ev2               = new Float32Array(buffer, p, 3);    p += 12;
            const ev2len            = new Float32Array(buffer, p, 1)[0]; p += 4;
            const ev3               = new Float32Array(buffer, p, 3);    p += 12;
            const ev3len            = new Float32Array(buffer, p, 1)[0]; p += 4;

            console.assert(p == 96);
            const buf = new Float32Array(buffer, p);
            this._taskMap.delete(id);
            return {
                header: {
                    childFlags,
                    debug1,
                    indices,
                    average,
                    eigenVector: [ ev1, ev2, ev3 ],
                    eigenVectorLength: [ ev1len, ev2len, ev3len ],
                },
                body: buf,
            };
        }
        finally {
            this._requests--;
        }
    }

    override doCancel( id: number ) {
        const item = this._taskMap.get(id);
        if (item) {
            item.abortController.abort();
        }
    }
}



namespace RawPointCloudProvider {



export interface ResourceInfo {
    url: string;

    option?: Resource.Option;
}



export interface Task {
    id: number;

    abortController: AbortController;
}



} // namespace RawPointCloudProvider




export default RawPointCloudProvider;
