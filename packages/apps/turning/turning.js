var GeoMath = mapray.GeoMath;

const accessToken = "<your access token here>";

class Turning extends mapray.RenderCallback {

    constructor( container )
    {
        super();
        var viewer = new mapray.Viewer( container, { render_callback: this,
                                        image_provider: this.createImageProvider(),
                                        dem_provider:    new mapray.CloudDemProvider(accessToken)
                                    } );
        viewer.attribution_controller.addAttribution({
            display: "国土地理院",
            link: "http://maps.gsi.go.jp/development/ichiran.html"
        });     
        this.longitude = 138.730647;
        this.latitude  = 35.362773;
        this.height    = 3776.24;
        this.distance  = 10000.0;
        this.pitch_angle = -30.0;
        this.angular_velocity = 5.0;
        this.turn_angle = 0;
    }

    onStart()  // override
    {
        // 初期のターン角度
        this.turn_angle = 0;
    }

    onUpdateFrame( delta_time )  // override
    {
        var camera = this.viewer.camera;

        // カメラに変換行列を設定
        GeoMath.mul_AA( this.createBaseToGocsMatrix(), this.createViewToBaseMatrix(), camera.view_to_gocs );

        // カメラに近接遠方平面を設定
        camera.near = this.distance / 2;
        camera.far  = camera.near * 1000;

        // 次のターン角度
        this.turn_angle += this.angular_velocity * delta_time;
    }

    // 画像プロバイダを生成
    createImageProvider()
    {
        return new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18 );
    }

    // 基準座標系から GOCS への変換行列を生成
    createBaseToGocsMatrix()
    {
        var base_to_gocs = GeoMath.createMatrix();
        GeoMath.iscs_to_gocs_matrix( { longitude: this.longitude, latitude: this.latitude, height: this.height }, base_to_gocs );
        return base_to_gocs;
    }

    // 視点座標系から基準座標系への変換行列を生成
    createViewToBaseMatrix()
    {
        var t = this.turn_angle  * GeoMath.DEGREE;  // ターン角 (ラジアン)
        var p = this.pitch_angle * GeoMath.DEGREE;  // 仰俯角 (ラジアン)
        var d = this.distance;

        var sinT = Math.sin( t );
        var cosT = Math.cos( t );
        var sinP = Math.sin( p );
        var cosP = Math.cos( p );

        var mat = GeoMath.createMatrix();
        mat[ 0] = cosT;
        mat[ 1] = sinT;
        mat[ 2] = 0;
        mat[ 3] = 0;
        mat[ 4] = sinP * sinT;
        mat[ 5] = -sinP * cosT;
        mat[ 6] = cosP;
        mat[ 7] = 0;
        mat[ 8] = sinT * cosP;
        mat[ 9] = -cosT * cosP;
        mat[10] = -sinP;
        mat[11] = 0;
        mat[12] = d * sinT * cosP;
        mat[13] = -d * cosT * cosP;
        mat[14] = -d * sinP;
        mat[15] = 1;

        return mat;
    }

}

// Turning クラスをブラウザのグローバル変数にエクスポート
window.Turning = Turning;
