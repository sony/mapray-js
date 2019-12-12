import Commander from "./Commander";
import DragMoveHelper from "../rambler/DragMoveHelper";
import StatusBar from "./StatusBar";
import BingMapsImageProvider from "../rambler/BingMapsImageProvider";
import AttributionController from "../../mapray/AttributionController";

var Viewer  = mapray.Viewer;
var GeoMath = mapray.GeoMath;
var CloudDemPrivider = mapray.CloudDemProvider;

const accessToken = "<your access token here>";

// Attirbute
const DEM_ATTRIBUTE = "この地図の作成に当たっては、国土地理院の承認を得て、同院発行の基盤地図情報を使用した。（承認番号　平30情使、 第626号）";
const BING_ATTRIBUTE = "© 2018 Microsoft Corporation, © 2018 DigitalGlobe, ©CNES (2018) Distribution Airbus DS, © 2018 SK telecom / NGII, Earthstar Geographics  SIO";
const GSI_ATTRIBUTE = "国土地理院";

/**
 * @summary 地球散策アプリ
 */
class Rambler extends mapray.RenderCallback {

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container )
    {
        super();

        this._container = container;
        this._viewer = this._createViewer(this._createImageProvider());
        if ( this._viewer )
        {
            this._viewer.attribution_controller.addAttribution({
                display: "国土地理院",
                link: "http://maps.gsi.go.jp/development/ichiran.html"
            });
        }
        this._commander = new Commander( this._viewer );
        this._statusbar = new StatusBar( this._viewer );

        // カメラの初期設定
        this._init_camera = {
            latitude:   31.0,  // 緯度
            longitude: 143.0,  // 経度
            height:  1000000,  // 高度
            yaw:       -30.0,  // 左右 (Z軸) 回転 (右向きが正)
            pitch:     -60.0,  // 上下 (X軸) 回転 (上向きが正)
            fov:        46.0   // 画角
        };

        // カメラのパラメータ
        this._position  = GeoMath.createVector3();  // 高度 0.0 での位置 (GOCS)
        this._direction = GeoMath.createVector3();  // ピッチ 0.0 での方向 (GOCS)
        this._height    = undefined;             // 高度
        this._pitch     = undefined;             // ピッチ角
        this._fov       = undefined;             // 画角

        // 一時オブジェクト
        this._moves = GeoMath.createVector3();
        this._dmove = [0, 0];
        this._turns = [0, 0];
        this._dmove_helper = null;

        // DEMOコンテンツ
        this._isBing    = false;
        this._layer_transparency = 10; //layer
    }

    /**
     * Viewerを作成
     *
     * @param {mapray.ImageProvider} baseImageProvider ベース地図用のタイル画像プロバイダ
     */
    _createViewer(baseImageProvider) {
        if (this._viewer) {
            this._closeViewer();
        }
        return new Viewer( this._container, {
            image_provider: baseImageProvider,
            dem_provider: new CloudDemPrivider(accessToken),
            render_callback: this,
            debug_stats: new mapray.DebugStats(),
            layers: [
                {
                    image_provider: this._createLayerImageProvider(),
                    opacity: 1.0
                }
            ]
        });
    }

    /**
     * Viewerを閉じる
     */
    _closeViewer() {
        this._viewer.destroy();
        this._viewer = null;
        this._commander = null;
        this._statusBar = null;
        this._layer_transparency = 10;
    }

    /**
     * 地図画像プロバイダを生成
     */
    _createImageProvider()
    {
        return new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18 );
    }

    /**
     * Layer用の画像プロバイダを生成
     */
    _createLayerImageProvider()
    {
        return new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/20160414kumamoto_0429dol1/",".png",256,10,18);
    }

    /**
     * シーンを読み込み終わったときの処理
     */
    _onLoadScene( loader, isSuccess )
    {
    }

    /**
     * リソース要求関数
     */
    _onTransform( url, type ) {
        return {
            url:         url,
            credentials: mapray.CredentialMode.SAME_ORIGIN,
            headers: {}
        };
    }

    /**
     * mapray.RenderCallback#onStart
     * @override
     */
    onStart()
    {
        // 緯度, 経度, ヨー角の行列
        var init_cam = this._init_camera;
        var init_pos = {
            latitude:  init_cam.latitude,
            longitude: init_cam.longitude,
            height:    0
        };
        var init_mat = GeoMath.iscs_to_gocs_matrix( init_pos, GeoMath.createMatrix() );
        Rambler.applyYaw( init_cam.yaw, init_mat );

        // カメラの初期パラメータ
        this._position[0]  = init_mat[12];
        this._position[1]  = init_mat[13];
        this._position[2]  = init_mat[14];
        this._direction[0] = init_mat[4];
        this._direction[1] = init_mat[5];
        this._direction[2] = init_mat[6];
        this._height       = init_cam.height;
        this._pitch        = init_cam.pitch;
        this._fov          = init_cam.fov;
    }


    /**
     * mapray.RenderCallback#onUpdateFrame
     * @override
     */
    onUpdateFrame( delta_time )
    {
        // コマンド取得
        var dmove = this._commander.getDragMove( this._dmove );
        var moves = this._commander.getMoves( this._moves );
        var turns = this._commander.getTurns( this._turns );
        var  zoom = this._commander.getZoom();
        var accel = this._commander.getAccel();
        var layer = this._commander.getLayer();

        // 移動速度の決定
        var      spos = GeoMath.gocs_to_iscs( this._position, {} );
        var elevation = this._viewer.getElevation( spos.latitude, spos.longitude );
        var  velocity = this._getVelocityVector( moves, accel, elevation );

        // パラメータ更新
        this._updateDragMoveParams( dmove, spos );
        var altitude = this._updateMovementParams( elevation, velocity, delta_time );
        this._updateRotationParams( turns );
        this._updateZoomParams( zoom );
        this._updateViewerCarera( altitude );
        this._updateRenderMode();
        this._updateLayerParams(layer);
        this._updateBingLayerParams();

        // ステータスバーを更新
        var statusbar = this._statusbar;
        statusbar.setCameraPosition( this._position, this._height );
        statusbar.setElevation( elevation );
        statusbar.setDirection( this._direction, this._pitch );
        statusbar.setFovAngle( this._fov );
        statusbar.updateElements( delta_time );
        statusbar.setLayer(this._layer_transparency);

        // フレーム終了処理
        this._commander.endFrame();
    }


    /**
     * @summary 速度ベクトルを取得
     * @param  {mapray.Vector3} moves       移動操作ベクトル
     * @param  {boolean}      accel       加速の有無
     * @param  {number}       elevation   地表の標高
     * @return {mapray.Vector3}             速度ベクトル (m/s)
     * @private
     */
    _getVelocityVector( moves, accel, elevation )
    {
        var velocity = GeoMath.createVector3();
        if ( moves[0] != 0 || moves[1] != 0 || moves[2] != 0 ) {
            // moves が非零ベクトルならを正規化
            GeoMath.normalize3( moves, velocity );
        }

        var altitude = Math.max( this._height - elevation, Rambler.SPEED_BASE_ALT );
        var  afactor = altitude * (accel ? Rambler.ACCEL_FACTOR : 1.0);
        velocity[0] *= Rambler.SPEED_FACTOR_XY * afactor;
        velocity[1] *= Rambler.SPEED_FACTOR_XY * afactor;
        velocity[2] *= Rambler.SPEED_FACTOR_Z  * afactor;

        return velocity;
    }


    /**
     * @summary
     * @private
     */
    _updateDragMoveParams( cpos, spos )
    {
        // DragMoveHelper を生成
        if ( this._dmove_helper === null ) {
            if ( cpos !== null ) {
                this._dmove_helper = new DragMoveHelper( this._viewer, cpos );
            }
        }
        else {
            if ( cpos === null ) {
                this._dmove_helper = null;
            }
        }

        var dmove_helper = this._dmove_helper;

        if ( dmove_helper ) {
            var yaw = this._calcYawAngle( spos );

            dmove_helper.setHeightDirection( this._height, yaw, this._pitch );
            dmove_helper.setPosition( spos.longitude, spos.latitude );
            dmove_helper.findPosition( cpos );

            // 緯度, 経度, ヨー角の行列
            var after_pos = {
                latitude:  dmove_helper.latitude,
                longitude: dmove_helper.longitude,
                height:    0
            };
            var mat = GeoMath.iscs_to_gocs_matrix( after_pos, GeoMath.createMatrix() );
            Rambler.applyYaw( yaw, mat );

            // カメラを新しい位置と方向に更新
            this._position[0]  = mat[12];
            this._position[1]  = mat[13];
            this._position[2]  = mat[14];
            this._direction[0] = mat[4];
            this._direction[1] = mat[5];
            this._direction[2] = mat[6];
        }
    }


    /**
     * @summary 方位角を計算
     *
     *  yaw = ArcTan[dz Cos[φ] - (dx Cos[λ] + dy Sin[λ]) Sin[φ], dy Cos[λ] - dx Sin[λ]]
     *
     * @private
     */
    _calcYawAngle( spos )
    {
        var    λ = spos.longitude * GeoMath.DEGREE;
        var    φ = spos.latitude  * GeoMath.DEGREE;
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


    /**
     * @summary 移動によるパラメータ更新
     * @desc
     * <p>出力パラメータ</p>
     * <pre>
     * this._position   高度 0.0 での位置 (GOCS)
     * this._direction  ピッチ 0.0 での方向 (GOCS)
     * this._height     高度
     * </pre>
     * @param  {number}       elevation   地表の標高
     * @param  {mapray.Vector3} velocity    速度ベクトル
     * @param  {number}       delta_time  前フレームからの経過時間 (秒)
     * @return {number}                   高距 (カメラ高度 - 地表標高)
     * @private
     */
    _updateMovementParams( elevation, velocity, delta_time )
    {
        var vx = velocity[0];
        var vy = velocity[1];

        if ( vx != 0 || vy != 0 ) {
            var   axis = this._getHorizMovementAxis( velocity );
            var  angle = Math.sqrt( vx*vx + vy*vy ) * delta_time / GeoMath.EARTH_RADIUS / GeoMath.DEGREE;
            var rotmat = GeoMath.rotation_matrix( axis, angle, GeoMath.createMatrix() );

            // position
            var px = this._position[0];
            var py = this._position[1];
            var pz = this._position[2];
            this._position[0] = px * rotmat[0] + py * rotmat[4] + pz * rotmat[ 8];
            this._position[1] = px * rotmat[1] + py * rotmat[5] + pz * rotmat[ 9];
            this._position[2] = px * rotmat[2] + py * rotmat[6] + pz * rotmat[10];

            // direction
            var dx = this._direction[0];
            var dy = this._direction[1];
            var dz = this._direction[2];
            this._direction[0] = dx * rotmat[0] + dy * rotmat[4] + dz * rotmat[ 8];
            this._direction[1] = dx * rotmat[1] + dy * rotmat[5] + dz * rotmat[ 9];
            this._direction[2] = dx * rotmat[2] + dy * rotmat[6] + dz * rotmat[10];
        }

        // height
        var vdz = velocity[2] * delta_time;
        var altitude = Math.max( this._height + vdz - elevation, Rambler.ALTITUDE_MIN );
        this._height = elevation + altitude;

        return altitude;
    }


    /**
     * @summary 水平移動用の回転軸を取得
     * @desc
     * <p>引数以外の入力パラメータ</p>
     * <pre>
     * this._position   高度 0.0 での位置 (GOCS)
     * this._direction  ピッチ 0.0 での方向 (GOCS)
     * </pre>
     * <p>条件: velocity[0] != 0 || velocity[1] != 0</p>
     * @param  {mapray.Vector3} velocity  速度ベクトル
     * @return {mapray.Vector3}           回転軸 (GOCS, 単位ベクトル)
     * @private
     */
    _getHorizMovementAxis( velocity )
    {
        var zvec = GeoMath.normalize3( this._position, GeoMath.createVector3() );
        var yvec = this._direction;
        var xvec = GeoMath.cross3( yvec, zvec, GeoMath.createVector3() );
        var   ax = -velocity[1];
        var   ay =  velocity[0];

        var axis = GeoMath.createVector3();
        axis[0] = xvec[0] * ax + yvec[0] * ay;
        axis[1] = xvec[1] * ax + yvec[1] * ay;
        axis[2] = xvec[2] * ax + yvec[2] * ay;

        return GeoMath.normalize3( axis, axis );
    }


    /**
     * @summary 回転によるパラメータ更新
     * @desc
     * <p>入力パラメータ</p>
     * <pre>
     * this._position   高度 0.0 での位置 (GOCS)
     * this._direction  ピッチ 0.0 での方向 (GOCS)
     * turns[0]         水平方向の回転量 (+右, -左)
     * turns[1]         垂直方向の回転量 (+上, -下)
     * </pre>
     * <p>出力パラメータ</p>
     * <pre>
     * this._direction  ピッチ 0.0 での方向 (GOCS)
     * this._pitch      ピッチ角
     * </pre>
     * @param {mapray.Vector2} turns  回転量
     * @private
     */
    _updateRotationParams( turns )
    {
        // direction
        var yaw_angle = turns[0] * Rambler.YAW_FACTOR;
        var yaw_axis  = GeoMath.normalize3( this._position, GeoMath.createVector3() );
        var yaw_rot   = GeoMath.rotation_matrix( yaw_axis, -yaw_angle, GeoMath.createMatrix() );

        var dx = this._direction[0];
        var dy = this._direction[1];
        var dz = this._direction[2];
        this._direction[0] = dx * yaw_rot[0] + dy * yaw_rot[4] + dz * yaw_rot[ 8];
        this._direction[1] = dx * yaw_rot[1] + dy * yaw_rot[5] + dz * yaw_rot[ 9];
        this._direction[2] = dx * yaw_rot[2] + dy * yaw_rot[6] + dz * yaw_rot[10];

        // pitch
        var pitch_angle = turns[1] * Rambler.PITCH_FACTOR;
        var pitch_range = Rambler.PITCH_RANGE;
        this._pitch = GeoMath.clamp( this._pitch + pitch_angle, pitch_range.min, pitch_range.max );
    }


    /**
     * @summary ズームによるパラメータ更新
     * @desc
     * <p>入力パラメータ</p>
     * <pre>
     * this._fov  画角
     * zoom       ズーム量
     *    0       ズームなし
     *    1       ズームイン
     *   -1       ズームアウト
     * </pre>
     * <p>出力パラメータ</p>
     * <pre>
     * this._fov  画角
     * </pre>
     * @param {number} zoom  ズーム量
     * @private
     */
    _updateZoomParams( zoom )
    {
        if ( this._commander.isZoomReset() ) {
            // ズームがリセットされたので FOV を初期値に戻す
            this._fov = this._init_camera.fov;
        }
        else if ( zoom != 0 ) {
            var tanθh = Math.tan( 0.5 * this._fov * GeoMath.DEGREE );
            var    θ  = 2 * Math.atan( tanθh * Math.pow( Rambler.FOV_FACTOR, -zoom ) );
            var  range = Rambler.FOV_RANGE;
            this._fov  = GeoMath.clamp( θ / GeoMath.DEGREE, range.min, range.max );
        }
    }


    /**
     * @summary Viewer の Camera を更新
     * @desc
     * <p>引数以外の入力パラメータ</p>
     * <pre>
     * this._position   高度 0.0 での位置 (GOCS)
     * this._direction  ピッチ 0.0 での方向 (GOCS)
     * this._height     高度
     * this._pitch      ピッチ
     * </pre>
     * @param {number} altitude  高距 (カメラ高度 - 地表標高)
     * @private
     */
    _updateViewerCarera( altitude )
    {
        var camera = this._viewer.camera;

        var zvec = GeoMath.normalize3( this._position, GeoMath.createVector3() );
        var yvec = this._direction;
        var xvec = GeoMath.cross3( yvec, zvec, GeoMath.createVector3() );

        // position, direction, height 適用行列
        var mat = GeoMath.setIdentity( GeoMath.createMatrix() );
        mat[ 0] = xvec[0];
        mat[ 1] = xvec[1];
        mat[ 2] = xvec[2];
        mat[ 4] = yvec[0];
        mat[ 5] = yvec[1];
        mat[ 6] = yvec[2];
        mat[ 8] = zvec[0];
        mat[ 9] = zvec[1];
        mat[10] = zvec[2];
        mat[12] = this._position[0] + this._height * zvec[0];
        mat[13] = this._position[1] + this._height * zvec[1];
        mat[14] = this._position[2] + this._height * zvec[2];

        // pitch 適用行列
        Rambler.applyPitch( 90 + this._pitch, mat );

        // Camera のプロパティを設定
        camera.fov  = this._fov;
        camera.near = Math.max( altitude    * Rambler.NEAR_FACTOR,  Rambler.NEAR_MIN );
        camera.far  = Math.max( camera.near * Rambler.FAR_FACTOR,   Rambler.FAR_MIN  );
        GeoMath.copyMatrix( mat, camera.view_to_gocs );
    }


    /**
     * @summary Viewer のレンダリングモードを更新
     * @private
     */
    _updateRenderMode()
    {
        if ( this._commander.isRenderModeChanged() ) {
            var RenderMode = Viewer.RenderMode;
            var     viewer = this._viewer;
            var      rmode = viewer.render_mode;
            if ( rmode === RenderMode.SURFACE ) {
                viewer.render_mode = RenderMode.WIREFRAME;
            }
            else {
                viewer.render_mode = RenderMode.SURFACE;
            }
        }
    }

    /**
     * @summary Layerパラメータ更新
     * @desc
     * <p>入力パラメータ</p>
     * <pre>
     * this._layer  Layer
     * layer      layer更新
     * </pre>
     * <p>出力パラメータ</p>
     * <pre>
     * this._fov  画角
     * </pre>
     * @param {number} value 増減値
     * @private
     */
    _updateLayerParams(value)
    {
        if ( value != 0 ){
            this._layer_transparency = this._layer_transparency + value;
            if ( this._layer_transparency > 10 ) {
                this._layer_transparency = 10;
            } else if ( this._layer_transparency < 0 ) {
                this._layer_transparency = 0;
            }
            var d = ( this._layer_transparency ) / 10.0;
            if (this._viewer.layers && this._viewer.layers.getLayer(0)) {
                this._viewer.layers.getLayer(0).setOpacity(d);
            }
        }
    }

    _updateBingLayerParams()
    {
        if ( this._commander.isBingModeChanged() ) {
            if ( this._isBing ) {
                this._isBing = false;
                this._viewer = this._createViewer(this._createImageProvider());
                if ( this._viewer )
                {
                    this._viewer.attribution_controller.addAttribution({
                        display: GSI_ATTRIBUTE,
                        link: "http://maps.gsi.go.jp/development/ichiran.html"
                    });
                }
                this._commander = new Commander( this._viewer );
                this._statusbar = new StatusBar( this._viewer );
            } else {
                this._isBing = true;
                this._viewer = this._createViewer(this._createBingImageProvider());
                if ( this._viewer )
                {
                    this._viewer.attribution_controller.addAttribution({
                        display: BING_ATTRIBUTE
                    });
                }
                this._commander = new Commander( this._viewer );
                this._statusbar = new StatusBar( this._viewer );
            }
        }
    }

    _createBingImageProvider() {
        return new BingMapsImageProvider({
            uriScheme: "https",
            key: "<your Bing Maps Key here>"
        });
    }

    /**
     * @summary ヨー回転を合成
     * @desc
     * <p>mat = mat * zRot( -yaw )</p>
     * @param  {number}      yaw  ヨー角
     * @param  {mapray.Matrix} mat  変換行列
     * @return {mapray.Matrix}      mat
     */
    static applyYaw( yaw, mat )
    {
        var    θ = yaw * GeoMath.DEGREE;
        var sinθ = Math.sin( θ );
        var cosθ = Math.cos( θ );

        var s00 = mat[0];
        var s10 = mat[1];
        var s20 = mat[2];
        var s01 = mat[4];
        var s11 = mat[5];
        var s21 = mat[6];

        mat[0] = cosθ*s00 - sinθ*s01;
        mat[1] = cosθ*s10 - sinθ*s11;
        mat[2] = cosθ*s20 - sinθ*s21;
        mat[4] = sinθ*s00 + cosθ*s01;
        mat[5] = sinθ*s10 + cosθ*s11;
        mat[6] = sinθ*s20 + cosθ*s21;

        return mat;
    }


    /**
     * @summary ピッチ回転を合成
     * @desc
     * <p>mat = mat * xRot( pitch )</p>
     * @param  {number}      pitch  ピッチ角
     * @param  {mapray.Matrix} mat    変換行列
     * @return {mapray.Matrix}        mat
     */
    static applyPitch( pitch, mat )
    {
        var    θ = pitch * GeoMath.DEGREE;
        var sinθ = Math.sin( θ );
        var cosθ = Math.cos( θ );

        var s01 = mat[ 4];
        var s11 = mat[ 5];
        var s21 = mat[ 6];
        var s02 = mat[ 8];
        var s12 = mat[ 9];
        var s22 = mat[10];

        mat[ 4] = cosθ*s01 + sinθ*s02;
        mat[ 5] = cosθ*s11 + sinθ*s12;
        mat[ 6] = cosθ*s21 + sinθ*s22;
        mat[ 8] = cosθ*s02 - sinθ*s01;
        mat[ 9] = cosθ*s12 - sinθ*s11;
        mat[10] = cosθ*s22 - sinθ*s21;

        return mat;
    }

}


// クラス定数
{
    // 動作定数
    Rambler.SPEED_FACTOR_XY = 0.15;  // 水平速度勾配係数 (高距に対する倍率)
    Rambler.SPEED_FACTOR_Z  = 0.15;  // 垂直速度勾配係数 (高距に対する倍率)
    Rambler.SPEED_BASE_ALT  = 150;   // 速度計算用の高距の最低値
    Rambler.ACCEL_FACTOR    = 3.0;   // 加速度係数 (基本速度に対する倍率)

    Rambler.YAW_FACTOR   = 0.05;     // 左右回転係数 (マウス水平移動量に対する倍率)
    Rambler.PITCH_FACTOR = 0.05;     // 上下回転係数 (マウス垂直移動量に対する倍率)

    Rambler.FOV_FACTOR   = 1.148698354997035;  // θ' = 2 atan(tan(θ/2)*f)

    Rambler.NEAR_FACTOR  = 0.5;     // near 決定係数 (高距に対する倍率)
    Rambler.FAR_FACTOR   = 10000;   // far 決定係数 (near に対する倍率)

    // 限界値定数
    Rambler.PITCH_RANGE  = { min: -80, max:  80 };
    Rambler.FOV_RANGE    = { min:   5, max: 120 };
    Rambler.NEAR_MIN     = 1.0;     // near の最小値
    Rambler.FAR_MIN      = 500000;  // far の最小値
    Rambler.ALTITUDE_MIN = 15.0;    // 高距 (カメラ高度 - 地表標高) の最小値
}


export default Rambler;
