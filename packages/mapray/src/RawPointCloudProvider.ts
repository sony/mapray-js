import PointCloudProvider from "./PointCloudProvider";
import GeoMath from "./GeoMath";
import Resource, { URLResource } from "./Resource";



class RawPointCloudProvider extends PointCloudProvider {

    constructor( resource: Resource | RawPointCloudProvider.ResourceInfo, option: RawPointCloudProvider.Option = {} ) {
        super( new RawPointCloudProvider.Hook( resource, option ), option );
    }

}



namespace RawPointCloudProvider {



export class Hook implements PointCloudProvider.Hook {

    private _suffix: string;

    private _info_resource: Resource;

    private _resource!: Resource;


    /**
     * resource 点群定義(json)リソース
     * @param resource リソース
     */
    constructor( resource: Resource | RawPointCloudProvider.ResourceInfo, _option: RawPointCloudProvider.Option = {} ) {
        this._suffix = ".xyz";
        if ( resource instanceof Resource ) {
            this._info_resource = resource;
        }
        else if ( resource.url ) {
            this._info_resource = new URLResource( resource.url, resource.option );
        }
        else {
            throw new Error( "unsupported resource" );
        }
    }


    private _createPath( level: number, x: number, y: number, z: number ) {
        return level + "/" + x + "/" + y + "/" + z + this._suffix;
    }


    async init(): Promise<PointCloudProvider.Info> {
        const infoOrCloudInfo = await this._info_resource.loadAsJson() as PointCloudProvider.Info | PointCloudProvider.CloudInfo;

        let info: PointCloudProvider.Info;
        if ( PointCloudProvider.isCloudInfo( infoOrCloudInfo ) ) {
            this._resource = this._info_resource.resolveResource( infoOrCloudInfo.url );
            info = infoOrCloudInfo.fileinfo;
        }
        else {
            info = infoOrCloudInfo;
            if ( info.url ) {
                this._resource = this._info_resource.resolveResource( info.url );
            }
            else {
                this._resource = this._info_resource;
            }
        }

        return info;
    }


    async requestTile( level: number, x: number, y: number, z: number, options?: { signal?: AbortSignal } ): Promise<PointCloudProvider.Data> {
        const path = this._createPath( level, x, y, z );
        const buffer = await this._resource.loadSubResource( path, {
                type: Resource.Type.BINARY,
                signal: options?.signal,
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


    toString() {
        return "RawPointCloudProvider(" + this._resource.toString() + ")";
    }
}



export interface Option extends PointCloudProvider.Option {
}


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
