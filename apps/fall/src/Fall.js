import mapray from "@mapray/mapray-js";

const GeoMath = mapray.GeoMath;


const accessToken = "<your access token here>";



/**
 * @summary 下降カメラ
 */
class Fall extends mapray.RenderCallback {

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container )
    {
        super();
        this._viewer = new mapray.Viewer( container, {
            render_callback: this,
            image_provider: this.createImageProvider(),
            dem_provider: new mapray.CloudDemProvider(accessToken),
        });
        this._viewer.attribution_controller.addAttribution({
            display: "国土地理院",
            link: "http://maps.gsi.go.jp/development/ichiran.html"
        });

        const home_pos = { longitude: 138.727778, latitude: 35.360556, height: 0 };
        this._home_to_gocs   = GeoMath.iscs_to_gocs_matrix( home_pos, GeoMath.createMatrix() );

        this._cam_position   = GeoMath.createVector3();
        this._cam_end_pos    = GeoMath.createVector3( [-150, 500, 3900] );
        this._cam_eye_target = GeoMath.createVector3( [1500, -1000, 3200.0] );
        this._cam_up         = GeoMath.createVector3( [0, 0, 1] );
        this._cam_speed      = Math.log( 1 - 0.1 );
    }


    /**
     * アプリを停止してから削除する。
     */
    destroy()
    {
        this._viewer.destroy();
    }


    /**
     * @override
     */
    onStart()
    {
        GeoMath.copyVector3( [0, 100000, 50000], this._cam_position );
    }


    /**
     * @override
     */
    onUpdateFrame( delta_time )
    {
        const camera = this.viewer.camera;

        // _cam_position を更新
        const a = 1 - Math.exp( this._cam_speed * delta_time );
        const e = this._cam_end_pos;
        const p = this._cam_position;
        p[0] = a*(e[0] - p[0]) + p[0];
        p[1] = a*(e[1] - p[1]) + p[1];
        p[2] = a*(e[2] - p[2]) + p[2];

        // _view_to_gocs を更新
        const view_to_home = GeoMath.createMatrix();
        GeoMath.lookat_matrix( p, this._cam_eye_target, this._cam_up, view_to_home );

        const view_to_gocs = camera.view_to_gocs;
        GeoMath.mul_AA( this._home_to_gocs, view_to_home, view_to_gocs );

        // 仮の near, far を設定
        camera.near = 30;
        camera.far  = 500000;
    }


    // 画像プロバイダを生成
    createImageProvider()
    {
        return new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18 );
    }
}


export default Fall;
