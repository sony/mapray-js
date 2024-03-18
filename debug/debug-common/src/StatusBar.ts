import mapray from "@mapray/mapray-js";
const GeoMath = mapray.GeoMath;


/**
 * ステータスバーの更新
 */
class StatusBar {
    private _position: mapray.GeoPointData;
    private _elevation: number;
    private _direction:  mapray.Vector3;
    private _pitch_angle: number;
    private _fov_angle: number;
    private _layer_mode: number;
    private _fps: number;

    private _elem_latitude: HTMLElement;
    private _elem_longitude: HTMLElement;
    private _elem_height: HTMLElement;
    private _elem_elevation: HTMLElement;
    private _elem_yaw_angle: HTMLElement;
    private _elem_pitch_angle: HTMLElement;
    private _elem_fov_angle: HTMLElement;
    private _elem_layer: HTMLElement;
    private _elem_fps: HTMLElement;

    private _elem_cnt_mesh: HTMLElement;
    private _elem_cnt_vert: HTMLElement;
    private _elem_reqs_dem: HTMLElement;
    private _elem_reqs_img: HTMLElement;
    private _elem_provider: HTMLElement;

    private _debug_stats: mapray.DebugStats;
    private _time: number;

    private _debug_console_count: number;

    /**
     * @param viewer
     * @param provider_name  データプロバイダ名
     */
    constructor( viewer: mapray.Viewer, node: HTMLElement | null, provider_name: string )
    {
        this._position    = { latitude: 0, longitude: 0, height: 0 }; // カメラ位置
        this._elevation   = 0;  // 地表面の標高
        this._direction   = GeoMath.createVector3();  // 方位角
        this._pitch_angle = 0;  // 仰俯角
        this._fov_angle   = 0;  // 画角
        this._layer_mode  = 0;
        this._fps         = 0;

        if ( !node ) {
            node = document.getElementById("statusbar");
        }

        const getElement = ( key: string ) => {
            return (node?.querySelector(`[data-key='${key}']`) ?? document.getElementById( key )!) as HTMLElement;
        };

        this._elem_latitude    = getElement( "latitude" );
        this._elem_longitude   = getElement( "longitude" );
        this._elem_height      = getElement( "cam-height" );
        this._elem_elevation   = getElement( "elevation" );
        this._elem_yaw_angle   = getElement( "yaw-angle" );
        this._elem_pitch_angle = getElement( "pitch-angle" );
        this._elem_fov_angle   = getElement( "fov-angle" );
        this._elem_layer       = getElement( "layer" );
        this._elem_fps         = getElement( "fps" );

        this._elem_cnt_mesh = getElement( "cnt-mesh" );
        this._elem_cnt_vert = getElement( "cnt-vert" );
        this._elem_reqs_dem = getElement( "reqs-dem" );
        this._elem_reqs_img = getElement( "reqs-img" );
        this._elem_provider = getElement( "provider" );

        this._elem_provider.innerHTML = provider_name;

        this._debug_stats = viewer.debug_stats!;
        this._time        = StatusBar.UPDATE_INTERVAL;
        this._debug_console_count = 0;
    }

    setProviderName( provider_name: string )
    {
        this._elem_provider.innerHTML = provider_name;
    }

    /**
     * カメラの位置を設定
     * @param position  標高 0 面上でのカメラ位置
     */
    setCameraPosition( position: mapray.GeoPointData )
    {
        this._position.latitude = position.latitude;
        this._position.longitude = position.longitude;
        this._position.height = position.height;
    }


    /**
     * カメラ直下の標高を設定
     * @param elevation  カメラ直下の標高
     */
    setElevation( elevation: number )
    {
        this._elevation = elevation;
    }


    /**
     * カメラの方向を設定
     * @param direction  方位ベクトル (GOCS)
     * @param pitch      仰俯角
     */
    setDirection( direction: mapray.Vector3, pitch: number )
    {
        GeoMath.copyVector3( direction, this._direction );
        this._pitch_angle = pitch;
    }


    /**
     * カメラの画角を設定
     * @param fov      画角
     */
    setFovAngle( fov: number )
    {
        this._fov_angle = fov;
    }

    /**
     * Layerを設定
     * @param layer
     */
    setLayer( layer_mode: number )
    {
        this._layer_mode = layer_mode;
    }

    /**
     * Fpsを設定
     * @param fps
     */
    setFps( fps: number )
    {
        this._fps = fps;
    }

    /**
     *  ステータスバーの要素を更新
     */
    updateElements( delta_time: number )
    {
        // 更新間隔の制御
        this._time -= delta_time;
        if ( this._time > 0 ) {
            return;
        }
        this._time = StatusBar.UPDATE_INTERVAL;

        // 要素の内容を更新
        this._updateElement( this._elem_latitude,  this._formatNumber( this._position.latitude,  5 ) );
        this._updateElement( this._elem_longitude, this._formatNumber( this._position.longitude, 5 ) );
        this._updateElement( this._elem_height, this._formatNumber( this._position.height,   1 ) );
        this._updateElement( this._elem_elevation, this._formatNumber( this._elevation, 1 ) );
        this._updateElement( this._elem_yaw_angle, this._formatNumber( this._calcYawAngle( this._position.latitude, this._position.longitude ), 1 ) );
        this._updateElement( this._elem_pitch_angle, this._formatNumber( this._pitch_angle, 1 ) );
        this._updateElement( this._elem_fov_angle,   this._formatNumber( this._fov_angle,   1 ) );
        this._updateElement( this._elem_layer,       this._formatNumber( this._layer_mode,   0 ) );
        this._updateElement( this._elem_fps,         this._formatNumber( this._fps,   1 ) );

        const debug_stats = this._debug_stats;

        if( debug_stats.num_drawing_flakes !== undefined ) {
            this._updateElement( this._elem_cnt_mesh, debug_stats.num_drawing_flakes.toString() );
        }
        if( debug_stats.num_drawing_flake_vertices !== undefined ) {
            this._updateElement( this._elem_cnt_vert, debug_stats.num_drawing_flake_vertices.toString() );
        }
        if( debug_stats.num_wait_reqs_dem !== undefined ) {
            this._updateElement( this._elem_reqs_dem, debug_stats.num_wait_reqs_dem.toString() );
        }
        if( debug_stats.num_wait_reqs_img !== undefined ) {
            this._updateElement( this._elem_reqs_img, debug_stats.num_wait_reqs_img.toString() );
        }

        // デバッグコンソール
        ++this._debug_console_count;
        if ( this._debug_console_count >= StatusBar.DEBUG_CONSOLE_CYCLE ) {
            console.debug( "num flakes: [" +
                debug_stats.num_procA_flakes + ", " +
                debug_stats.num_procB_flakes + ", " +
                debug_stats.num_drawing_flakes + "]" );
            this._debug_console_count = 0;
        }
    }


    /**
     * Element更新 
     */
     private _updateElement( element: HTMLElement, text: string )
    {
        if ( element.innerHTML != text ) {
            element.innerHTML = text;
        }
    }

    /**
     * 数値を指定の正確度に整形
     */
     private _formatNumber( value: number, accuracy: number )
    {
        let sval = Math.round( Math.abs( value ) * Math.pow( 10, accuracy ) ) + '';
        if ( sval.length <= accuracy ) {
            sval = '0'.repeat( accuracy - sval.length + 1 ) + sval;
        }

        let number;
        if ( accuracy > 0 ) {
            const ipart = sval.slice( 0, -accuracy );
            const fpart = sval.slice( -accuracy );
            number = ipart + '.' + fpart;
        }
        else {
            number = sval;
        }

        return (value >= 0) ? number : '-' + number;
    }


    /**
     *  方位角を計算
     *
     *  yaw = ArcTan[dz Cos[φ] - (dx Cos[λ] + dy Sin[λ]) Sin[φ], dy Cos[λ] - dx Sin[λ]]
     */
    private _calcYawAngle( lat:number, lon: number )
    {
        const    λ = lon * GeoMath.DEGREE;
        const    φ = lat * GeoMath.DEGREE;
        const sinλ = Math.sin( λ );
        const cosλ = Math.cos( λ );
        const sinφ = Math.sin( φ );
        const cosφ = Math.cos( φ );

        const dx = this._direction[0];
        const dy = this._direction[1];
        const dz = this._direction[2];

        const x = dz * cosφ - (dx * cosλ + dy * sinλ) * sinφ;
        const y = dy * cosλ - dx * sinλ;

        return Math.atan2( y, x ) / GeoMath.DEGREE;
    }

}



namespace StatusBar {

    export const UPDATE_INTERVAL     = 0.15;
    export const DEBUG_CONSOLE_CYCLE = 10;

} // namespace StatusBar

export default StatusBar;
