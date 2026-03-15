import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

type FocusTarget = {
  longitude: number;
  latitude: number;
  height: number;
  cameraHeight: number;
};


const DEFAULT_CAMERA_POSITION: mapray.GeoPointData = {
  longitude: 139.7671,
  latitude: 35.6812,
  height: 1800,
};

const DEFAULT_LOOK_AT_POSITION: mapray.GeoPointData = {
  longitude: 139.7671,
  latitude: 35.6812,
  height: 0,
};


class UndergroundViewer extends maprayui.StandardUIViewer {

  private readonly _has_access_token: boolean;

  private readonly _cloud_api?: mapray.cloud.CloudApiV2;

  private readonly _dataset_3d_id?: string;

  private readonly _dataset_point_cloud_id?: string;

  private readonly _loaded_model_entities: mapray.ModelEntity[] = [];

  private readonly _loaded_point_clouds: mapray.PointCloud[] = [];

  private _dataset_3d_status = "not requested";

  private _point_cloud_status = "not requested";

  private _dataset_3d_focus_target?: FocusTarget;

  private _point_cloud_focus_target?: FocusTarget;

  private _auto_focused = false;


  constructor( container: string | HTMLElement )
  {
    const access_token = process.env.MAPRAY_ACCESS_TOKEN;
    const has_access_token = typeof access_token === "string" && access_token.length > 0;

    super( container, access_token ?? "", {
      dem_provider: has_access_token ?
        undefined :
        new mapray.FlatDemProvider( { max_level: 9, rho: 8, height: 0 } ),
      camera_position: DEFAULT_CAMERA_POSITION,
      lookat_position: DEFAULT_LOOK_AT_POSITION,
      camera_parameter: {
        fov: 50,
        near: 0.2,
        far: 3000000,
        speed_factor: 240,
      },
    } );

    this._has_access_token = has_access_token;
    this._dataset_3d_id = process.env.DATASET_3D_ID;
    this._dataset_point_cloud_id = process.env.DATASET_POINT_CLOUD_ID;

    if ( access_token ) {
      this._cloud_api = new mapray.cloud.CloudApiV2( {
        basePath: "https://cloud.mapray.com",
        tokenType: mapray.cloud.CloudApi.TokenType.API_KEY,
        token: access_token,
      } );
    }
    else {
      this._dataset_3d_status = "skipped: MAPRAY_ACCESS_TOKEN missing";
      this._point_cloud_status = "skipped: MAPRAY_ACCESS_TOKEN missing";
    }

    void this._loadCloudDatasets();
  }


  override destroy(): void
  {
    this._loaded_point_clouds.forEach( pointCloud => {
      this.viewer.point_cloud_collection.remove( pointCloud );
    } );
    this._loaded_model_entities.forEach( entity => {
      this.viewer.scene.removeEntity( entity );
    } );
    super.destroy();
  }


  private async _loadCloudDatasets(): Promise<void>
  {
    if ( !this._cloud_api ) {
      return;
    }

    await Promise.all( [
      this._loadModelDataset(),
      this._loadPointCloudDataset(),
    ] );

    this.updateCamera();
  }


  private async _loadModelDataset(): Promise<void>
  {
    if ( !this._dataset_3d_id ) {
      this._dataset_3d_status = "skipped: DATASET_3D_ID missing";
      return;
    }

    this._dataset_3d_status = `loading: ${this._dataset_3d_id}`;

    try {
      const dataset3d = await this._cloud_api!.load3DDataset( this._dataset_3d_id );
      const origin = dataset3d.getOrigin();
      this._dataset_3d_focus_target = {
        longitude: origin.longitude,
        latitude: origin.latitude,
        height: origin.altitude,
        cameraHeight: Math.max( origin.altitude + 450, 450 ),
      };

      const resource = this._cloud_api!.get3DDatasetAsResource( [this._dataset_3d_id] );
      const loader = new mapray.SceneLoader( this.viewer.scene, resource, {
        onEntity: ( scene_loader, entity ) => {
          if ( !(entity instanceof mapray.ModelEntity) ) {
            return;
          }
          this._loaded_model_entities.push( entity );
          scene_loader.scene.addEntity( entity );
        },
      } );
      await loader.load();
      this._dataset_3d_status = `loaded: ${this._dataset_3d_id}`;
      this._applyAutoFocus();
    }
    catch ( error ) {
      this._dataset_3d_status = `error: ${this._formatError( error )}`;
    }
  }


  private async _loadPointCloudDataset(): Promise<void>
  {
    if ( !this._dataset_point_cloud_id ) {
      this._point_cloud_status = "skipped: DATASET_POINT_CLOUD_ID missing";
      return;
    }

    this._point_cloud_status = `loading: ${this._dataset_point_cloud_id}`;

    try {
      const resource = this._cloud_api!.getPointCloudDatasetAsResource( this._dataset_point_cloud_id );
      const point_cloud = this.viewer.point_cloud_collection.add(
        new mapray.StandardPointCloudProvider( resource )
      );
      this._loaded_point_clouds.push( point_cloud );
      this._point_cloud_status = `loaded: ${this._dataset_point_cloud_id}`;

      const dataset = await this._cloud_api!.loadPointCloudDataset( this._dataset_point_cloud_id );
      const bbox = dataset.getBoundingBox();
      if ( bbox ) {
        this._point_cloud_focus_target = this._createPointCloudFocusTarget( bbox );
      }
      this._applyAutoFocus();
    }
    catch ( error ) {
      this._point_cloud_status = `error: ${this._formatError( error )}`;
    }
  }


  private _createPointCloudFocusTarget( bbox: [number, number, number, number, number, number] ): FocusTarget
  {
    const [minLongitude, minLatitude, minHeight, maxLongitude, maxLatitude, maxHeight] = bbox;
    const center_longitude = ( minLongitude + maxLongitude ) * 0.5;
    const center_latitude = ( minLatitude + maxLatitude ) * 0.5;
    const center_height = ( minHeight + maxHeight ) * 0.5;
    const extent = Math.max(
      250,
      maxHeight - minHeight,
      new mapray.GeoPoint( minLongitude, minLatitude, 0 ).getGeographicalDistance(
        new mapray.GeoPoint( maxLongitude, maxLatitude, 0 )
      )
    );

    return {
      longitude: center_longitude,
      latitude: center_latitude,
      height: center_height,
      cameraHeight: center_height + Math.max( extent * 0.5, 250 ),
    };
  }


  private _applyAutoFocus(): void
  {
    if ( this._auto_focused ) {
      return;
    }

    const target = this._dataset_3d_focus_target ?? this._point_cloud_focus_target;
    if ( !this._isValidFocusTarget( target ) ) {
      return;
    }

    this._auto_focused = true;
    this.setCameraPosition( {
      longitude: target.longitude,
      latitude: target.latitude,
      height: target.cameraHeight,
    } );
    this.setLookAtPosition( {
      longitude: target.longitude,
      latitude: target.latitude,
      height: target.height,
    } );
    this.updateCamera();
  }


  private _isValidFocusTarget( target: FocusTarget | undefined ): target is FocusTarget
  {
    if ( !target ) {
      return false;
    }

    if (
      !Number.isFinite( target.longitude ) ||
      !Number.isFinite( target.latitude ) ||
      !Number.isFinite( target.height ) ||
      !Number.isFinite( target.cameraHeight )
    ) {
      return false;
    }

    if ( target.longitude < -180 || target.longitude > 180 || target.latitude < -90 || target.latitude > 90 ) {
      return false;
    }

    // Cloud metadata が取れないケースでは 0,0 が返ることがあるので避ける。
    if ( Math.abs( target.longitude ) < 1e-9 && Math.abs( target.latitude ) < 1e-9 ) {
      return false;
    }

    return true;
  }


  private _formatError( error: unknown ): string
  {
    return error instanceof Error ? error.message : String( error );
  }

}


export default UndergroundViewer;
