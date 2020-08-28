import PointCloudProvider from "./PointCloudProvider";
import GeoMath from "./GeoMath";

let idMax = 1;
const createUniqueId = () => {
    return idMax++;
}

class RawPointCloudProvider extends PointCloudProvider {
    constructor(option={}) {
        super(option);
        const resource = option.resource;
        if (resource.prefix) {
            const prefix = resource.prefix.endsWith("/") ? resource.prefix.slice(0, -1) : resource.prefix;
            const suffix = resource.suffix || ".xyz";
            this._urlGenerator = ( level, x, y, z ) => prefix + "/" + level + "/" + x + "/" + y + "/" + z + suffix;
        }
        else {
            throw new Error("unsupported resource");
        }
        this._taskMap = new Map();
        this._requests = 0;
    }

    /**
     * @override
     */
    async doInit() {
    }

    /**
     * @override
     */
    async doDestroy() {
    }

    toString() {
        return this._urlGenerator( 0, 0, 0, 0 );
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
            const url = this._urlGenerator( level, x, y, z );
            const response = await fetch(url, { signal: abortController.signal });
            if (!response.ok) {
                throw new Error("couldn't fetch: " + url);
            }
            const buffer = await response.arrayBuffer();

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
