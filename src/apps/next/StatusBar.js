var GeoMath = mapray.GeoMath;


/**
 * @summary ステータスバーの更新
 */
class StatusBar {

    /**
     * @param {Inou.Viewer} viewer
     * @param {string}      provider_name  データプロバイダ名
     */
    constructor( viewer, provider_name )
    {
        this._position    = GeoMath.createVector3();  // カメラ位置 (GOCS)
        this._height      = 0;  // カメラの高度
        this._elevation   = 0;  // 地表面の標高
        this._direction   = GeoMath.createVector3();  // 方位角
        this._pitch_angle = 0;  // 仰俯角
        this._fov_angle   = 0;  // 画角
        this._layer_mode  = 0;

        this._elem_latitude    = document.getElementById( "latitude" );
        this._elem_longitude   = document.getElementById( "longitude" );
        this._elem_height      = document.getElementById( "cam-height" );
        this._elem_elevation   = document.getElementById( "elevation" );
        this._elem_yaw_angle   = document.getElementById( "yaw-angle" );
        this._elem_pitch_angle = document.getElementById( "pitch-angle" );
        this._elem_fov_angle   = document.getElementById( "fov-angle" );
        this._elem_layer       = document.getElementById( "layer" );

        this._elem_cnt_mesh = document.getElementById( "cnt-mesh" );
        this._elem_cnt_vert = document.getElementById( "cnt-vert" );
        this._elem_reqs_dem = document.getElementById( "reqs-dem" );
        this._elem_reqs_img = document.getElementById( "reqs-img" );
        this._elem_provider = document.getElementById( "provider" );

        this._elem_provider.innerHTML = provider_name;

        this._debug_stats = viewer.debug_stats;
        this._time        = StatusBar.UPDATE_INTERVAL;
        this._debug_console_count = 0;
    }


    /**
     * @summary カメラの位置を設定
     * @param {Inou.Vector3} position  標高 0 面上でのカメラ位置 (GOCS)
     * @param {number}       height    カメラの高度
     */
    setCameraPosition( position, height )
    {
        GeoMath.copyVector3( position, this._position );
        this._height = height;
    }


    /**
     * @summary カメラ直下の標高を設定
     * @param {number} elevation  カメラ直下の標高
     */
    setElevation( elevation )
    {
        this._elevation = elevation;
    }


    /**
     * @summary カメラの方向を設定
     * @param {Inou.Vector3} direction  方位ベクトル (GOCS)
     * @param {number}       pitch      仰俯角
     */
    setDirection( direction, pitch )
    {
        GeoMath.copyVector3( direction, this._direction );
        this._pitch_angle = pitch;
    }


    /**
     * @summary カメラの画角を設定
     * @param {number} fov      画角
     */
    setFovAngle( fov )
    {
        this._fov_angle = fov;
    }

    /**
     * @summary Layerを設定
     * @param {number} layer
     */
    setLayer( layer_mode )
    {
        this._layer_mode = layer_mode;
    }

    /**
     * @summary ステータスバーの要素を更新
     */
    updateElements( delta_time )
    {
        // 更新間隔の制御
        this._time -= delta_time;
        if ( this._time > 0 ) {
            return;
        }
        this._time = StatusBar.UPDATE_INTERVAL;

        // 要素の内容を更新
        var spos = GeoMath.gocs_to_iscs( this._position, {} );

        this._updateElement( this._elem_latitude,  this._formatNumber( spos.latitude,  5 ) );
        this._updateElement( this._elem_longitude, this._formatNumber( spos.longitude, 5 ) );
        this._updateElement( this._elem_height,    this._formatNumber( this._height,   1 ) );
        this._updateElement( this._elem_elevation, this._formatNumber( this._elevation, 1 ) );
        this._updateElement( this._elem_yaw_angle,   this._formatNumber( this._calcYawAngle( spos.latitude, spos.longitude ), 1 ) );
        this._updateElement( this._elem_pitch_angle, this._formatNumber( this._pitch_angle, 1 ) );
        this._updateElement( this._elem_fov_angle,   this._formatNumber( this._fov_angle,   1 ) );
        this._updateElement( this._elem_layer,       this._formatNumber( this._layer_mode,   0 ) );

        var debug_stats = this._debug_stats;

        this._updateElement( this._elem_cnt_mesh, debug_stats.num_drawing_flakes );
        this._updateElement( this._elem_cnt_vert, debug_stats.num_drawing_flake_vertices );
        this._updateElement( this._elem_reqs_dem, debug_stats.num_wait_reqs_dem );
        this._updateElement( this._elem_reqs_img, debug_stats.num_wait_reqs_img );

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
     * @private
     */
    _updateElement( element, text )
    {
        if ( element.innerHTML != text ) {
            element.innerHTML = text;
        }
    }

    /**
     * @summary 数値を指定の正確度に整形
     * @private
     */
    _formatNumber( value, accuracy )
    {
        var sval = Math.round( Math.abs( value ) * Math.pow( 10, accuracy ) ) + '';
        if ( sval.length <= accuracy ) {
            sval = '0'.repeat( accuracy - sval.length + 1 ) + sval;
        }

        var number;
        if ( accuracy > 0 ) {
            var ipart = sval.slice( 0, -accuracy );
            var fpart = sval.slice( -accuracy );
            number = ipart + '.' + fpart;
        }
        else {
            number = sval;
        }

        return (value >= 0) ? number : '-' + number;
    }


    /**
     * @summary 方位角を計算
     *
     *  yaw = ArcTan[dz Cos[φ] - (dx Cos[λ] + dy Sin[λ]) Sin[φ], dy Cos[λ] - dx Sin[λ]]
     *
     * @private
     */
    _calcYawAngle( lat, lon )
    {
        var    λ = lon * GeoMath.DEGREE;
        var    φ = lat * GeoMath.DEGREE;
        var sinλ = Math.sin( λ );
        var cosλ = Math.cos( λ );
        var sinφ = Math.sin( φ );
        var cosφ = Math.cos( φ );

        var dx = this._direction[0];
        var dy = this._direction[1];
        var dz = this._direction[2];

        var x = dz * cosφ - (dx * cosλ + dy * sinλ) * sinφ;
        var y = dy * cosλ - dx * sinλ;

        return Math.atan2( y, x ) / GeoMath.DEGREE;
    }

}


StatusBar.UPDATE_INTERVAL     = 0.15;
StatusBar.DEBUG_CONSOLE_CYCLE = 10;


export default StatusBar;
