import mapray from "../../../packages/mapray/dist/es/mapray.js";
var GeoMath = mapray.GeoMath;


/**
 */
class FallRenderCallback extends mapray.RenderCallback {

    /**
     */
    constructor( owner )
    {
        super();
        this._owner = owner;

        var home_pos = { longitude: 138.727778, latitude: 35.360556, height: 0 };
        this._home_to_gocs   = GeoMath.iscs_to_gocs_matrix( home_pos, GeoMath.createMatrix() );

        this._cam_position   = GeoMath.createVector3();
        this._cam_end_pos    = GeoMath.createVector3( [-150, 500, 3900] );
        this._cam_eye_target = GeoMath.createVector3( [1500, -1000, 3200.0] );
        this._cam_up         = GeoMath.createVector3( [0, 0, 1] );
        this._cam_speed      = Math.log( 1 - 0.1 );
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
        var camera = this.viewer.camera;

        // _cam_position を更新
        var a = 1 - Math.exp( this._cam_speed * delta_time );
        var e = this._cam_end_pos;
        var p = this._cam_position;
        p[0] = a*(e[0] - p[0]) + p[0];
        p[1] = a*(e[1] - p[1]) + p[1];
        p[2] = a*(e[2] - p[2]) + p[2];

        // _view_to_gocs を更新
        var view_to_home = GeoMath.createMatrix();
        GeoMath.lookat_matrix( p, this._cam_eye_target, this._cam_up, view_to_home );

        var view_to_gocs = camera.view_to_gocs;
        GeoMath.mul_AA( this._home_to_gocs, view_to_home, view_to_gocs );

        // 仮の near, far を設定
        camera.near = 30;
        camera.far  = 500000;
    }

}


export default FallRenderCallback;
