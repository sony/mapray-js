import mapray from "@mapray/mapray-js";

var GeoMath = mapray.GeoMath;
var GeoPoint = mapray.GeoPoint;

/**
 * @summary 標準Maprayビューワ
 *
 * @class StandardUIViewer
 * @extends {mapray.RenderCallback}
 */
class StandardUIViewer extends mapray.RenderCallback
{
    /**
     * @summary コンストラクタ
     * @param {string|Element}              container                               ビューワ作成先のコンテナ（IDまたは要素）
     * @param {string}                      access_token                            アクセストークン
     * @param {object}                      options                                 生成オプション
     * @param {mapray.DemProvider}          options.dem_provider                    DEMプロバイダ
     * @param {mapray.ImageProvider}        options.image_provider                  画像プロバイダ
     * @param {array}                       options.layers                          地図レイヤー配列
     * @param {mapray.Viewer.RenderMode}    options.render_mode                     レンダリングモード
     * @param {mapray.DebugStats}           options.debug_stats                     デバッグ統計オブジェクト
     * @param {mapray.Attributionontroller} options.attribution_controller          著作権表示の表示制御
     * @param {object}                      options.camera_position                 カメラ位置
     * @param {number}                      options.camera_position.latitude        緯度（度）
     * @param {number}                      options.camera_position.longitude       経度（度）
     * @param {number}                      options.camera_position.height          高さ（m）
     * @param {object}                      options.lookat_position                 注視点位置
     * @param {number}                      options.lookat_position.latitude        緯度（度）
     * @param {number}                      options.lookat_position.longitude       経度（度）
     * @param {number}                      options.lookat_position.height          高さ（m）
     * @param {object}                      options.camera_parameter                カメラパラメータ
     * @param {number}                      options.camera_parameter.fov            画角（度）
     * @param {number}                      options.camera_parameter.near           近接平面距離（m）
     * @param {number}                      options.camera_parameter.far            遠方平面距離（m）
     * @param {number}                      options.camera_parameter.speed_factor   移動速度係数
     * @memberof StandardUIViewer
     */
    constructor( container, access_token, options )
    {
        super();

        this.createViewer( container, access_token, options );

        // カメラパラメータ
        this._camera_parameter = {
            latitude: 0,         // 緯度
            longitude: 0,        // 経度
            height: 0,           // 高度
            pitch: 0,            // 上下（X軸）回転
            yaw: 0,              // 左右（Z軸）回転
            fov: 0,              // 画角
            near: 0,             // 近接平面距離
            far: 0,              // 遠方平面距離
        };

        // カメラパラメータの初期化
        this._initCameraParameter( options );

        this._operation_mode = StandardUIViewer.OperationMode.NONE;         // 操作モード

        this._mouse_down_position = GeoMath.createVector2f();               // マウスダウンした位置
        this._pre_mouse_position = GeoMath.createVector2f();                // 直前のマウス位置
        this._rotate_center = GeoMath.createVector3();                      // 回転中心

        this._translate_drag = GeoMath.createVector2f();                    // 平行移動の移動量（マウスの移動量）
        this._translate_eye_drag = GeoMath.createVector2f();                // 平行移動の移動量（マウスの移動量）
        this._rotate_drag = GeoMath.createVector2f();                       // 回転の移動量（マウスの移動量）
        this._free_rotate_drag = GeoMath.createVector2f();                  // 自由回転の移動量（マウスの移動量）
        this._height_drag = GeoMath.createVector2f();                       // 高度変更の移動量（マウスの移動量）

        this._zoom_wheel = 0;                                               // 視線方向への移動量（ホイールの移動量）
        this._fovy_key = 0;                                                 // 画角変更の指定回数

        this._default_fov = StandardUIViewer.DEFAULT_CAMERA_PARAMETER.fov   // リセット用の画角

        this._key_mode = false;                                             // キー操作中
    }

    /**
     * @summary ビューワの作成
     * @param {string|Element}              container                               ビューワ作成先のコンテナ（IDまたは要素）
     * @param {string}                      access_token                            アクセストークン
     * @param {object}                      options                                 生成オプション
     * @param {mapray.DemProvider}          options.dem_provider                    DEMプロバイダ
     * @param {mapray.ImageProvider}        options.image_provider                  画像プロバイダ
     * @param {array}                       options.layers                          地図レイヤー配列
     * @param {mapray.Viewer.RenderMode}    options.render_mode                     レンダリングモード
     * @param {mapray.DebugStats}           options.debug_stats                     デバッグ統計オブジェクト
     * @param {mapray.Attributionontroller} options.attribution_controller          著作権表示の表示制御
     */
    createViewer( container, access_token, options ) {
        if ( this._viewer )
        {
            this.destroy();
        }

        this._viewer = new mapray.Viewer(
            container, {
            dem_provider: this._createDemProvider( access_token, options ),
            image_provider: this._createImageProvider( options ),
            layers: ( options && options.layers ) || null,
            render_callback: this,
            render_mode: ( options && options.render_mode ) || mapray.Viewer.RenderMode.SURFACE,
            debug_stats: ( options && options.debug_stats ) || null,
            attribution_controller: ( options && options.attribution_controller ) || null
        }
        );

        // 右クリックメニューの無効化
        var element = this._viewer._canvas_element;
        element.setAttribute( "oncontextmenu", "return false;" );

        // イベントリスナーの追加
        this._addEventListener();
        
        return this._viewer;
    }

    /**
     * @summary 破棄関数
     * 
     * @memberof StandardUIViewer
     */
    destroy()
    {
        if ( !this._viewer )
        {
            return;
        }

        this._removeEventListener()

        this._viewer.destroy();
        this._viewer = null;
    }    

    /**
     * @summary ビューワ
     * @type {mapray.viewer}
     * @readonly
     * @memberof StandardUIViewer
     */
    get viewer() 
    {
        return this._viewer;
    }

    /**
     * @summary DEMプロバイダの生成
     *
     * @param {string}                      access_token            アクセストークン
     * @param {object}                      options                 生成オプション
     * @param {mapray.DemProvider}          options.dem_provider    DEMプロバイダ
     * @returns {mapray.DemProvider}                                DEMプロバイダ
     * @memberof StandardUIViewer
     */
    _createDemProvider( access_token, options )
    {
        return ( options && options.dem_provider ) || new mapray.CloudDemProvider( access_token );
    }

    /**
     * @summary 画像プロバイダの生成
     *
     * @param {object}                      options                 生成オプション
     * @param {mapray.ImageProvider}        options.image_provider  画像プロバイダ
     * @returns {mapray.ImageProvider}                              画像プロバイダ 
     * @memberof StandardUIViewer
     */
    _createImageProvider( options )
    {
        return ( options && options.image_provider ) || new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18 )
    }

    /**
     * @summary カメラパラメータの初期化
     *
     * @param {object}                      options.camera_position                 カメラ位置
     * @param {number}                      options.camera_position.latitude        緯度（度）
     * @param {number}                      options.camera_position.longitude       経度（度）
     * @param {number}                      options.camera_position.height          高さ（m）
     * @param {object}                      options.lookat_position                 注視点位置
     * @param {number}                      options.lookat_position.latitude        緯度（度）
     * @param {number}                      options.lookat_position.longitude       経度（度）
     * @param {number}                      options.lookat_position.height          高さ（m）
     * @param {object}                      options.camera_parameter                カメラパラメータ
     * @param {number}                      options.camera_parameter.fov            画角（度）
     * @param {number}                      options.camera_parameter.near           近接平面距離（m）
     * @param {number}                      options.camera_parameter.far            遠方平面距離（m）
     * @param {number}                      options.camera_parameter.speed_factor   移動速度係数
     * @memberof StandardUIViewer
     */
    _initCameraParameter( options )
    {
        var camera_position = ( options && options.camera_position ) || StandardUIViewer.DEFAULT_CAMERA_POSITION;
        var lookat_position = ( options && options.lookat_position ) || StandardUIViewer.DEFAULT_LOOKAT_POSITION;
        var camera_parameter = ( options && options.camera_parameter ) || StandardUIViewer.DEFAULT_CAMERA_PARAMETER;

        // カメラ位置の設定
        this.setCameraPosition( camera_position );

        //　注視点位置の設定
        this.setLookAtPosition( lookat_position );

        // カメラパラメータの設定
        this.setCameraParameter( camera_parameter );

        // カメラ姿勢の確定
        this._updateViewerCamera();
    }

    /**
     * @summary イベントリスナーの追加
     *
     * @memberof StandardUIViewer
     */
    _addEventListener()
    {
        var canvas = this._viewer._canvas_element;
        var self = this;

        window.addEventListener( "blur", function ( event ) { self._onBlur( event ); }, { passive: false } );
        canvas.addEventListener( "mousedown", function ( event ) { self._onMouseDown( event ); }, { passive: false } );
        document.addEventListener( "mousemove", function ( event ) { self._onMouseMove( event ); }, { passive: false } );
        document.addEventListener( "mouseup", function ( event ) { self._onMouseUp( event ); }, { passive: false } );
        document.addEventListener( "wheel", function ( event ) { self._onMouseWheel( event ); }, { passive : false } );
        document.addEventListener( "keydown", function ( event ) { self._onKeyDown( event ); }, { passive: false } );
        document.addEventListener( "keyup", function ( event ) { self._onKeyUp( event ); }, { passive: false } );
    }

    /**
     * @summary イベントリスナーの削除
     *
     * @memberof StandardUIViewer
     */
    _removeEventListener()
    {
        var canvas = this._viewer._canvas_element;
        var self = this;

        window.removeEventListener( "blur", function ( event ) { self._onBlur( event ); }, { passive: false } );
        canvas.removeEventListener( "mousedown", function ( event ) { self._onMouseDown( event ); }, { passive: false } );
        document.removeEventListener( "mousemove", function ( event ) { self._onMouseMove( event ); }, { passive: false } );
        document.removeEventListener( "mouseup", function ( event ) { self._onMouseUp( event ); }, { passive: false } );
        document.removeEventListener( "wheel", function ( event ) { self._onMouseWheel( event ); }, { passive: false } );
        document.removeEventListener( "keydown", function ( event ) { self._onKeyDown( event ); }, { passive: false } );
        document.removeEventListener( "keyup", function ( event ) { self._onKeyUp( event ); }, { passive: false } );
    }


    /**
     * @summary レンダリングループ開始の処理
     *
     * @memberof StandardUIViewer
     */
    onStart()
    {

    }

    /**
     * @summary レンダリングループ終了の処理
     *
     * @memberof StandardUIViewer
     */
    onStop()
    {

    }

    /**
     * @summary フレームレンダリング前の処理
     *
     * @param {number} delta_time  全フレームからの経過時間（秒）
     * @memberof StandardUIViewer
     */
    onUpdateFrame( delta_time )
    {
        // 平行移動
        this._translation( delta_time );

        // 回転
        this._rotation();

        // 自由回転
        this._freeRotation( delta_time )

        // 高さ変更
        this._translationOfHeight();

        //　視線方向移動
        this._translationOfEyeDirection();

        // 画角変更
        this._changeFovy();

        // 高度補正
        this._correctAltitude();

        // クリップ範囲の更新
        this._updateClipPlane();

        // カメラ姿勢の確定
        this._updateViewerCamera();
    }

    /**
     * @summary カメラの位置・向きの更新
     *
     * @memberof StandardUIViewer
     */
    _updateViewerCamera()
    {
        var camera = this._viewer.camera;

        var camera_geoPoint = new GeoPoint( this._camera_parameter.longitude, this._camera_parameter. latitude, this._camera_parameter.height );
        var camera_matrix = camera_geoPoint.getMlocsToGocsMatrix( GeoMath.createMatrix() );

        var pitch_matrix = GeoMath.rotation_matrix( [1, 0, 0], this._camera_parameter.pitch, GeoMath.createMatrix() );
        var yaw_matrix = GeoMath.rotation_matrix( [0, 0, 1], this._camera_parameter.yaw, GeoMath.createMatrix() );
        var eye_matrix = GeoMath.mul_AA( yaw_matrix, pitch_matrix, GeoMath.createMatrix() );

        camera.view_to_gocs = GeoMath.mul_AA( camera_matrix, eye_matrix, GeoMath.createMatrix() );

        camera.fov = this._camera_parameter.fov;

        camera.near = this._camera_parameter.near;
        camera.far = this._camera_parameter.far;
    }

    /**
     * @summary クリップ範囲の更新
     * 
     * @memberof StandardUIViewer
     */
    _updateClipPlane()
    {
        // 地表面の標高
        var elevation = this._viewer.getElevation( this._camera_parameter.latitude, this._camera_parameter.longitude );
        var altitude = Math.max( this._camera_parameter.height - elevation, StandardUIViewer.MINIMUM_HEIGHT );

        this._camera_parameter.near = Math.max( altitude * StandardUIViewer.NEAR_FACTOR, StandardUIViewer.MINIMUM_NEAR );
        this._camera_parameter.far = Math.max( this._camera_parameter.near * StandardUIViewer.FAR_FACTOR, StandardUIViewer.MINIMUM_FAR );
    }

    /**
     * @summary 高度の補正（地表面以下にならないようにする）
     *
     * @memberof StandardUIViewer
     */
    _correctAltitude()
    {
        var elevation = this._viewer.getElevation( this._camera_parameter.latitude, this._camera_parameter.longitude );
        this._camera_parameter.height = Math.max( this._camera_parameter.height, elevation + StandardUIViewer.MINIMUM_HEIGHT );
    }


    /**
     * @summary フォーカスが外れた時のイベント
     *
     * @param {Event} event  イベントデータ
     * @memberof StandardUIViewer
     */
    _onBlur( event )
    {
        event.preventDefault()

        this._resetEventParameter();
    }

    /**
     * @summary マウスを押した時のイベント
     *
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */
    _onMouseDown( event )
    {
        event.preventDefault()

        var mouse_position = [event.clientX, event.clientY];

        this._mouse_down_position = mouse_position;
        this._pre_mouse_position = mouse_position;

        // 左ボタン
        if ( event.button == 0 )
        {
            if ( event.shiftKey )
            {
                this._operation_mode = StandardUIViewer.OperationMode.ROTATE;

                var camera = this._viewer.camera;
                var ray = camera.getCanvasRay( this._mouse_down_position );
                this._rotate_center = this._viewer.getRayIntersection( ray );
            }
            else if ( event.ctrlKey )
            {
                this._operation_mode = StandardUIViewer.OperationMode.FREE_ROTATE;
            }
            else
            {
                this._operation_mode = StandardUIViewer.OperationMode.TRANSLATE;
            }
        }
        // 中ボタン
        else if ( event.button == 1 )
        {
            this._operation_mode = StandardUIViewer.OperationMode.ROTATE;

            var camera = this._viewer.camera;
            var ray = camera.getCanvasRay( this._mouse_down_position );
            this._rotate_center = this._viewer.getRayIntersection( ray );
        }
        // 右ボタン
        else if ( event.button == 2 )
        {
            this._operation_mode = (
              event.shiftKey ? StandardUIViewer.OperationMode.HEIGHT_TRANSLATE:
              StandardUIViewer.OperationMode.EYE_TRANSLATE
            );
        }
    }

    /**
     * @summary マウスを動かした時のイベント
     *
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */
    _onMouseMove( event )
    {
        event.preventDefault()

        var mouse_position = [event.clientX, event.clientY];

        //　平行移動
        if ( this._operation_mode == StandardUIViewer.OperationMode.TRANSLATE )
        {
            this._translate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
            this._translate_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
        }
        //　回転移動
        else if ( this._operation_mode == StandardUIViewer.OperationMode.ROTATE )
        {
            this._rotate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
            this._rotate_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
        }
        else if ( this._operation_mode == StandardUIViewer.OperationMode.FREE_ROTATE )
        {
            this._free_rotate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
            this._free_rotate_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
        }
        // 高度変更
        else if ( this._operation_mode == StandardUIViewer.OperationMode.HEIGHT_TRANSLATE )
        {
            // 横方向は平行移動する
            this._translate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
            this._height_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
        }
        else if ( this._operation_mode == StandardUIViewer.OperationMode.EYE_TRANSLATE )
        {
            this._translate_eye_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
        }

        // マウス位置の更新
        this._pre_mouse_position = mouse_position;
    }

    /**
     * @summary マウスを上げた時のイベント
     *
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */
    _onMouseUp( event )
    {
        event.preventDefault()

        this._resetEventParameter();
    }

    /**
     * @summary マウスホイールを動かした時のイベント
     *
     * @param {MouseWheelEvent} event
     * @memberof StandardUIViewer
     */
    _onMouseWheel( event )
    {
        event.preventDefault()

        var mouse_position = [event.clientX, event.clientY];

        this._mouse_down_position = mouse_position;

        var zoom = 0;

        zoom = -1 * Math.sign( event.deltaY ) * Math.ceil( Math.abs( event.deltaY ) / 100 );

        this._zoom_wheel += zoom;
    }

    /**
     * @summary キーを押した時のイベント
     *
     * @param {KeyboardEvent} event
     * @memberof StandardUIViewer
     */
    _onKeyDown( event )
    {
        event.preventDefault()

        switch( event.key )
        {
            // [c] 画角の拡大
            case "c":
            case "C":
                this._operation_mode = StandardUIViewer.OperationMode.CHANGE_FOVY;
                this._fovy_key = 1;
                break;

            // [z] 画角の縮小
            case "z":
            case "Z":
                this._operation_mode = StandardUIViewer.OperationMode.CHANGE_FOVY;
                this._fovy_key = -1;
                break;

            // [x] 画角の初期化
            case "x":
            case "X":
                this._camera_parameter.fov = this._default_fov
                break;

            // ↑ 前進
            case "ArrowUp":
                // 画面中央を移動基準にする
                var canvas = this._viewer.canvas_element;
                var mouse_position = [canvas.width / 2, canvas.height / 2];
                this._mouse_down_position = mouse_position;

                this._translate_drag[1] = 100;
                this._key_mode = true;
                break;

            // ↓ 後退
            case "ArrowDown":
                // 画面中央を移動基準にする
                var canvas = this._viewer.canvas_element;
                var mouse_position = [canvas.width / 2, canvas.height / 2];
                this._mouse_down_position = mouse_position;

                this._translate_drag[1] = -100;
                this._key_mode = true;
                break;

            // ← 左回転
            case "ArrowLeft":
                // 画面中央を移動基準にする
                this._free_rotate_drag[0] = 100;
                this._key_mode = true;
                break;

            case "ArrowRight":
                // 画面中央を移動基準にする
                this._free_rotate_drag[0] = -100;
                this._key_mode = true;
                break;
        }
    }

    /**
     * @summary キーを挙げた時のイベント
     *
     * @param {KeyboardEvent} event
     * @memberof StandardUIViewer
     */
    _onKeyUp( event )
    {
        event.preventDefault()

        switch ( event.key )
        {
            // [c] 画角の拡大
            case "c":
            case "C":
                this._operation_mode = StandardUIViewer.OperationMode.NONE;
                this._fovy_key = 0;
                break;

            // [z] 画角の縮小
            case "z":
            case "Z":
                this._operation_mode = StandardUIViewer.OperationMode.NONE;
                this._fovy_key = 0;
                break;

            // ↑ 前進
            case "ArrowUp":
                this._operation_mode = StandardUIViewer.OperationMode.NONE;
                this._translate_drag[1] = 0;

                this._key_mode = false;
                break;

            // ↓ 後退
            case "ArrowDown":
                this._operation_mode = StandardUIViewer.OperationMode.NONE;
                this._translate_drag[1] = 0;

                this._key_mode = false;
                break;

            // ← 左回転
            case "ArrowLeft":
                this._operation_mode = StandardUIViewer.OperationMode.NONE;
                this._free_rotate_drag[0] = 0;

                this._key_mode = false;
                break;

            case "ArrowRight":
                this._operation_mode = StandardUIViewer.OperationMode.NONE;
                this._free_rotate_drag[0] = 0;

                this._key_mode = false;
                break;
        }
    }

    /**
     * @summary イベントパラメータの初期化
     *
     * @memberof StandardUIViewer
     */
    _resetEventParameter()
    {
        this._translate_drag[0] = 0;
        this._translate_drag[1] = 0;

        this._rotate_drag[0] = 0;
        this._rotate_drag[1] = 0;

        this._free_rotate_drag[0] = 0;
        this._free_rotate_drag[1] = 0;

        this._height_drag[0] = 0;
        this._height_drag[1] = 0;

        this._operation_mode = StandardUIViewer.OperationMode.NONE;
    }

    /**
     * @カメラの平行移動
     *
     * @memberof StandardUIViewer
     */
    _translation( delta_time )
    {
        if ( this._translate_drag[0] != 0 || this._translate_drag[1] != 0 ) 
        {
            if ( this._key_mode )
            {
                this._translate_drag[0] *= delta_time;
                this._translate_drag[1] *= delta_time;
            }

            var camera = this._viewer.camera;

            var ray = camera.getCanvasRay( this._mouse_down_position );
            var start_position = this._viewer.getRayIntersection( ray );

            var end_mouse_position = [this._mouse_down_position[0] + this._translate_drag[0], this._mouse_down_position[1] + this._translate_drag[1]];
            ray = camera.getCanvasRay( end_mouse_position );
            var end_position = this._viewer.getRayIntersection( ray );

            if ( start_position == null || end_position == null )
            {
                return;
            }

            var start_spherical_position = new mapray.GeoPoint();
            start_spherical_position.setFromGocs( start_position );

            var end_spherical_position = new mapray.GeoPoint();
            end_spherical_position.setFromGocs( end_position );

            // 球とレイの交点計算
            var variable_A = Math.pow( this._getVectorLength( ray.direction ), 2 );
            var variable_B = 2 * GeoMath.dot3( ray.position, ray.direction );
            var variable_C = Math.pow( this._getVectorLength( ray.position ), 2 ) - Math.pow( start_spherical_position.altitude + GeoMath.EARTH_RADIUS, 2 );
            var variable_D = variable_B * variable_B - 4 * variable_A * variable_C;

            // カメラより選択した場所の高度が高い、交点が取れない場合は補正しない
            if ( start_spherical_position.altitude < this._camera_parameter.height &&
                 end_spherical_position.altitude < this._camera_parameter.height &&
                 variable_D > 0 )
            {
                var variable_t1 = ( -variable_B + Math.sqrt( variable_D ) ) / 2 * variable_A;
                var variable_t2 = ( -variable_B - Math.sqrt( variable_D ) ) / 2 * variable_A;

                var variable_t = Math.min( variable_t1, variable_t2 )

                end_position[0] = ray.position[0] + variable_t * ray.direction[0];
                end_position[1] = ray.position[1] + variable_t * ray.direction[1];
                end_position[2] = ray.position[2] + variable_t * ray.direction[2];

                end_spherical_position.setFromGocs( end_position );
            }

            var delta_latitude = end_spherical_position.latitude - start_spherical_position.latitude;
            var delta_longitude = end_spherical_position.longitude - start_spherical_position.longitude;

            this._camera_parameter.latitude -= delta_latitude;
            this._camera_parameter.longitude -= delta_longitude;

            this._translate_drag[0] = 0;
            this._translate_drag[1] = 0;

            // マウスダウンの位置を更新する
            this._mouse_down_position = this._pre_mouse_position
        }
    }

    /**
     * @summary カメラの回転（回転中心指定）
     *
     * @memberof StandardUIViewer
     */
    _rotation()
    {
        if ( this._rotate_drag[0] != 0 || this._rotate_drag[1] != 0 ) 
        {
            if (this._rotate_center == null)
            {
                this._rotate_drag[0] = 0;
                this._rotate_drag[1] = 0;

                return;
            }

            var camera = this._viewer.camera;

            var camera_direction = GeoMath.createVector3();
            camera_direction[0] = camera.view_to_gocs[12] - this._rotate_center[0];
            camera_direction[1] = camera.view_to_gocs[13] - this._rotate_center[1];
            camera_direction[2] = camera.view_to_gocs[14] - this._rotate_center[2];

            var center_geoPoint = new mapray.GeoPoint();
            center_geoPoint.setFromGocs( this._rotate_center );
            var center_matrix = center_geoPoint.getMlocsToGocsMatrix( GeoMath.createMatrix() );

            var rotate_axis = GeoMath.createVector3();
            rotate_axis[0] = center_matrix[8];
            rotate_axis[1] = center_matrix[9];
            rotate_axis[2] = center_matrix[10];

            rotate_axis = GeoMath.normalize3( rotate_axis, GeoMath.createVector3() );

            // カメラ自身を回転
            var yaw_angle = -this._rotate_drag[0] / 10;
            var pitch_angle = -this._rotate_drag[1] / 10;

            var rotated_direction = this._rotateVector( camera_direction, rotate_axis, yaw_angle );

            var after_pitch = GeoMath.clamp( this._camera_parameter.pitch + pitch_angle, 0, 90 );

            if ( after_pitch != this._camera_parameter.pitch )
            {
                rotate_axis[0] = camera.view_to_gocs[0];
                rotate_axis[1] = camera.view_to_gocs[1];
                rotate_axis[2] = camera.view_to_gocs[2];

                rotated_direction = this._rotateVector( rotated_direction, rotate_axis, pitch_angle );
            }

            var new_position = GeoMath.createVector3();
            new_position[0] = this._rotate_center[0] + rotated_direction[0];
            new_position[1] = this._rotate_center[1] + rotated_direction[1];
            new_position[2] = this._rotate_center[2] + rotated_direction[2];

            var new_spherical_position = new mapray.GeoPoint();
            new_spherical_position.setFromGocs( new_position );

            this._camera_parameter.latitude = new_spherical_position.latitude;
            this._camera_parameter.longitude = new_spherical_position.longitude;
            this._camera_parameter.height = new_spherical_position.altitude;
            this._camera_parameter.yaw += yaw_angle;
            this._camera_parameter.pitch = after_pitch;

            this._rotate_drag[0] = 0;
            this._rotate_drag[1] = 0;
        }
    }

    /**
     * @summary カメラの回転（自由回転）
     *
     * @memberof StandardUIViewer
     */
    _freeRotation( delta_time )
    {
        if ( this._free_rotate_drag[0] != 0 || this._free_rotate_drag[1] != 0 ) 
        {
            if ( this._key_mode )
            {
                this._free_rotate_drag[0] *= delta_time;
                this._free_rotate_drag[1] *= delta_time;
            }

            // カメラ自身を回転
            var yaw_angle = this._free_rotate_drag[0] / 10;
            var pitch_angle = this._free_rotate_drag[1] / 10;

            var after_pitch = GeoMath.clamp( this._camera_parameter.pitch + pitch_angle, 0, 90 );

            this._camera_parameter.yaw += yaw_angle;
            this._camera_parameter.pitch = after_pitch;

            this._free_rotate_drag[0] = 0;
            this._free_rotate_drag[1] = 0;
        }
    }

    /**
     * @summary 高度変更
     *
     * @memberof StandardUIViewer
     */
    _translationOfHeight()
    {
        if ( this._height_drag[0] != 0 || this._height_drag[1] != 0 ) 
        {
            var height_drag = this._height_drag[1];

            var factor = GeoMath.gudermannian( ( this._camera_parameter.height - 50000 ) / 10000 ) + Math.PI / 2;
            var delta_height = height_drag * 100 * factor;
            
            this._camera_parameter.height += delta_height;

            this._height_drag[0] = 0;
            this._height_drag[1] = 0;
        }
    }

    /**
     * @summary 視線方向への移動
     *
     * @memberof StandardUIViewer
     */
    _translationOfEyeDirection()
    {
        let zoom = 0;
        if ( this._zoom_wheel != 0 )
        {
            zoom = Math.pow(0.9, this._zoom_wheel);
            this._zoom_wheel = 0;
        }
        else if ( this._translate_eye_drag[1] != 0 ) {
            zoom = Math.pow(0.995, this._translate_eye_drag[1]);
            this._translate_eye_drag[1] = 0;
        }

        if ( zoom !== 0 )
        {
            var camera = this._viewer.camera;

            // 移動中心
            var ray = camera.getCanvasRay( this._mouse_down_position );
            var translation_center = this._viewer.getRayIntersection( ray );

            if (translation_center == null)
            {
                return;
            }

            var center_spherical_position = new mapray.GeoPoint();
            center_spherical_position.setFromGocs( translation_center );

            var translation_vector = GeoMath.createVector3();
            translation_vector[0] = (translation_center[0] - camera.view_to_gocs[12]) * zoom;
            translation_vector[1] = (translation_center[1] - camera.view_to_gocs[13]) * zoom;
            translation_vector[2] = (translation_center[2] - camera.view_to_gocs[14]) * zoom;

            var new_camera_gocs_position = GeoMath.createVector3();
            new_camera_gocs_position[0] = translation_center[0] - translation_vector[0];
            new_camera_gocs_position[1] = translation_center[1] - translation_vector[1];
            new_camera_gocs_position[2] = translation_center[2] - translation_vector[2];

            var new_camera_spherical_position = new mapray.GeoPoint();
            new_camera_spherical_position.setFromGocs( new_camera_gocs_position );
            var elevation = this._viewer.getElevation( new_camera_spherical_position.latitude, new_camera_spherical_position.longitude );
            if (elevation + StandardUIViewer.MINIMUM_HEIGHT > new_camera_spherical_position.altitude) {
                // z_over だけ高い位置になるようにカメラ方向に移動する
                const z_over = new_camera_spherical_position.altitude - (elevation + StandardUIViewer.MINIMUM_HEIGHT);
                const up = center_spherical_position.getUpwardVector(GeoMath.createVector3());
                const translation_vector_length = Math.sqrt(
                  translation_vector[0] * translation_vector[0] +
                  translation_vector[1] * translation_vector[1] +
                  translation_vector[2] * translation_vector[2]
                );
                const up_dot_dir = GeoMath.dot3(translation_vector, up) / translation_vector_length;
                GeoMath.scale3(1 - (z_over / up_dot_dir / translation_vector_length), translation_vector, translation_vector);

                new_camera_gocs_position[0] = translation_center[0] - translation_vector[0];
                new_camera_gocs_position[1] = translation_center[1] - translation_vector[1];
                new_camera_gocs_position[2] = translation_center[2] - translation_vector[2];
                new_camera_spherical_position.setFromGocs( new_camera_gocs_position );
            }
            this._camera_parameter.latitude = new_camera_spherical_position.latitude;
            this._camera_parameter.longitude = new_camera_spherical_position.longitude;
            this._camera_parameter.height = new_camera_spherical_position.altitude;

            this._zoom_wheel = 0;
        }
    }

    /**
     * @summary 画角変更
     *
     * @memberof StandardUIViewer
     */
    _changeFovy()
    {
        var tanθh = Math.tan( 0.5 * this._camera_parameter.fov * GeoMath.DEGREE );
        var θ = 2 * Math.atan( tanθh * Math.pow( StandardUIViewer.FOV_FACTOR, -this._fovy_key ) );
        var range = StandardUIViewer.FOV_RANGE;
        this._camera_parameter.fov = GeoMath.clamp( θ / GeoMath.DEGREE, range.min, range.max );

        this._fovy_key = 0;
    }

    /**
     * @カメラ位置の設定
     *
     * @param {object}  position            カメラ位置
     * @param {number}  position.latitude   緯度
     * @param {number}  position.longitude  経度
     * @param {number}  position.height     高さ
     * @memberof StandardUIViewer
     */
    setCameraPosition( position )
    {
        this._camera_parameter.latitude = position.latitude;
        this._camera_parameter.longitude = position.longitude;
        this._camera_parameter.height = position.height;

        // 最低高度補正
        if ( this._camera_parameter.height < StandardUIViewer.MINIMUM_HEIGHT )
        {
            this._camera_parameter.height = StandardUIViewer.MINIMUM_HEIGHT
        }
    }

    /**
     * @注視点の設定
     *
     * @param {object}  position            カメラ位置
     * @param {number}  position.latitude   緯度
     * @param {number}  position.longitude  経度
     * @param {number}  position.height     高さ
     * @memberof StandardUIViewer
     */
    setLookAtPosition( position )
    {
        // 現在の視線方向を取得
        var current_camera_geoPoint = new GeoPoint( this._camera_parameter.longitude, this._camera_parameter.latitude, this._camera_parameter.height );
        var current_camera_matrix = current_camera_geoPoint.getMlocsToGocsMatrix( GeoMath.createMatrix() );

        var current_y_direction = GeoMath.createVector3();
        current_y_direction[0] = current_camera_matrix[4];
        current_y_direction[1] = current_camera_matrix[5];
        current_y_direction[2] = current_camera_matrix[6];

        var target_camera_geoPoint = new GeoPoint( position.longitude, position.latitude, position.height );
        var target_camera_matrix = target_camera_geoPoint.getMlocsToGocsMatrix( GeoMath.createMatrix() );

        var target_camera_direction = GeoMath.createVector3();
        target_camera_direction[0] = target_camera_matrix[12] - current_camera_matrix[12];
        target_camera_direction[1] = target_camera_matrix[13] - current_camera_matrix[13];
        target_camera_direction[2] = target_camera_matrix[14] - current_camera_matrix[14];

        current_y_direction = GeoMath.normalize3( current_y_direction, GeoMath.createVector3() );
        target_camera_direction = GeoMath.normalize3( target_camera_direction, GeoMath.createVector3() );

        var rotate_axis = GeoMath.createVector3();
        rotate_axis[0] = current_camera_matrix[8];
        rotate_axis[1] = current_camera_matrix[9];
        rotate_axis[2] = current_camera_matrix[10];

        var yaw_angle = this._calculateAngle( rotate_axis, current_y_direction, target_camera_direction );
        this._camera_parameter.yaw = yaw_angle;

        var current_camera_direction = GeoMath.createVector3();
        current_camera_direction[0] = current_camera_matrix[8];
        current_camera_direction[1] = current_camera_matrix[9];
        current_camera_direction[2] = current_camera_matrix[10];

        rotate_axis[0] = current_camera_matrix[0];
        rotate_axis[1] = current_camera_matrix[1];
        rotate_axis[2] = current_camera_matrix[2];

        target_camera_direction[0] = -1 * target_camera_direction[0];
        target_camera_direction[1] = -1 * target_camera_direction[1];
        target_camera_direction[2] = -1 * target_camera_direction[2];

        this._camera_parameter.pitch = GeoMath.clamp( Math.abs( this._calculateAngle( rotate_axis, current_camera_direction, target_camera_direction ) ), 0, 90 );
    }

    /**
     * @summary カメラパラメータの設定
     *
     * @param {object}  parameter               カメラパラメータ
     * @param {number}  parameter.fov           画角
     * @param {number}  parameter.near          近接平面距離
     * @param {number}  parameter.far           遠方平面距離
     * @param {number}  parameter.speed_factor  移動速度係数
     * @memberof StandardUIViewer
     */
    setCameraParameter( parameter )
    {
        if ( parameter.fov ) { 
            this._camera_parameter.fov = parameter.fov; 
            this._default_fov = parameter.fov;
        }

        if ( parameter.near ) { this._camera_parameter.near = parameter.near; }
        if ( parameter.far ) { this._camera_parameter.far = parameter.far; }
        if ( parameter.speed_factor ) { this._camera_parameter.speed_factor = parameter.speed_factor; }
    }

    /**
     * @summary レイヤの取得
     *
     * @param {number} index    レイヤ番号
     * @returns {mapray.Layer}  レイヤ
     * @memberof StandardUIViewer
     */
    getLayer( index )
    {
        return this._viewer.layers.getLayer( index );
    }

    /**
     * @summary レイヤ数の取得
     *
     * @returns {number}    レイヤ数
     * @memberof StandardUIViewer
     */
    getLayerNum()
    {
        return this._viewer.layers.num_layers();
    }

    /**
     * @summary レイヤの追加（末尾）
     *
     * @param {object}               layer                  作成するレイヤのプロパティ
     * @param {mapray.ImageProvider} layer.image_provider   画像プロバイダ
     * @param {boolean}              layer.visibility       可視性フラグ
     * @param {number}               layer.opacity          不透明度
     * @memberof StandardUIViewer
     */
    addLayer( layer )
    {
        this._viewer.layers.add( layer );
    }

    /**
     * @summary レイヤの追加（任意）
     *
     * @param {number}               index                  挿入場所
     * @param {object}               layer                  作成するレイヤのプロパティ
     * @param {mapray.ImageProvider} layer.image_provider   画像プロバイダ
     * @param {boolean}              layer.visibility       可視性フラグ
     * @param {number}               layer.opacity          不透明度
     * @memberof StandardUIViewer
     */
    insertLayer( index, layer )
    {
        this._viewer.layers.insert( index, layer );
    }

    /**
     * @summary レイヤの削除
     *
     * @param {number} index    レイヤ番号
     * @memberof StandardUIViewer
     */
    removeLayer( index )
    {
        this._viewer.layers.remove( index );
    }

    /**
     * @summary レイヤの全削除
     *
     * @memberof StandardUIViewer
     */
    clearLayer()
    {
        this._viewer.layers.clear();
    }

    /**
     * @summary エンティティの取得
     *
     * @param {number} index     エンティティ番号
     * @returns {mapray.Entity}  エンティティ
     * @memberof StandardUIViewer
     */
    getEntity( index )
    {
        return this._viewer.scene.getEntity( index );
    }

    /**
     * @summary エンティティ数の取得
     *
     * @returns {number}    エンティティ数
     * @memberof StandardUIViewer
     */
    getEntityNum()
    {
        return this._viewer.scene.num_entities();
    }

    /**
     * @summary エンティティの追加
     *
     * @param {mapray.Entity} entity    エンティティ
     * @memberof StandardUIViewer
     */
    addEntity( entity )
    {
        this._viewer.scene.addEntity( entity );
    }

    /**
     * @summary エンティティの削除
     *
     * @param {mapray.Entity} entity    エンティティ
     * @memberof StandardUIViewer
     */
    removeEntity( entity )
    {
        this._viewer.scene.removeEntity( entity );
    }

    /**
     * @summary エンティティの全削除
     *
     * @memberof StandardUIViewer
     */
    clearEntity()
    {
        this._viewer.scene.clearEntity();
    }

    /**
     * @summary 3次元ベクトルの長さの算出
     *
     * @param {mapray.Vector3} vector   対象ベクトル
     * @returns {number}                長さ
     * @memberof StandardUIViewer
     */
    _getVectorLength( vector )
    {
        return Math.sqrt( Math.pow( vector[0], 2 ) + Math.pow( vector[1], 2 ) + Math.pow( vector[2], 2 ) );
    }

    /**
     * @summary 3次元ベクトルの任意軸の回転
     *
     * @param {mapray.Vector3} vector   対象ベクトル
     * @param {mapray.Vector3} axis     回転軸
     * @param {number}         angle    回転角度（deg.）
     * @returns {mapray.Vector3}        回転後ベクトル
     * @memberof StandardUIViewer
     */
    _rotateVector( vector, axis, angle )
    {
        var rotate_matrix = GeoMath.rotation_matrix( axis, angle, GeoMath.createMatrix() );

        var target_vector = GeoMath.createVector3();
        target_vector[0] = vector[0] * rotate_matrix[0] + vector[1] * rotate_matrix[4] + vector[2] * rotate_matrix[8] + rotate_matrix[12];
        target_vector[1] = vector[0] * rotate_matrix[1] + vector[1] * rotate_matrix[5] + vector[2] * rotate_matrix[9] + rotate_matrix[13];
        target_vector[2] = vector[0] * rotate_matrix[2] + vector[1] * rotate_matrix[6] + vector[2] * rotate_matrix[10] + rotate_matrix[14];

        return target_vector;
    }

    /**
     * @summary 任意軸回りの回転角度の算出
     *
     * @param {mapray.Vector3} axis             回転軸
     * @param {mapray.Vector3} basis_vector     基準ベクトル
     * @param {mapray.Vector3} target_vector    目標ベクトル
     * @returns {number}                        回転角度（deg.）
     * @memberof StandardUIViewer
     */
    _calculateAngle( axis, basis_vector, target_vector )
    {
        var a_vector = GeoMath.createVector3();
        var dot_value = GeoMath.dot3( axis, basis_vector );

        for ( var i = 0; i < 3; i++ )
        {
            a_vector[i] = basis_vector[i] - dot_value * axis[i];
        }

        var b_vector = GeoMath.createVector3();
        dot_value = GeoMath.dot3( axis, target_vector );

        for ( var i = 0; i < 3; i++ )
        {
            b_vector[i] = target_vector[i] - dot_value * axis[i];
        }

        GeoMath.normalize3( a_vector, a_vector );
        GeoMath.normalize3( b_vector, b_vector );

        if ( Math.abs( this._getVectorLength( a_vector ) < 1.0e-6 ) ||
            Math.abs( this._getVectorLength( b_vector ) < 1.0e-6 ) )
        {
            angle = 0;
        }
        else
        {
            var angle = Math.acos( GeoMath.clamp( GeoMath.dot3( a_vector, b_vector ) / ( this._getVectorLength( a_vector ) * this._getVectorLength( b_vector ) ), -1, 1 ) ) / GeoMath.DEGREE;

            var cross_vector = GeoMath.cross3( a_vector, b_vector, GeoMath.createVector3() );
            cross_vector = GeoMath.normalize3( cross_vector, GeoMath.createVector3() );

            if ( GeoMath.dot3( axis, cross_vector ) < 0 ) 
            {
                angle *= -1;
            }
        }

        return angle;
    }
}

var OperationMode = {
    NONE: "NONE",
    TRANSLATE: "TRANSLATE",
    ROTATE: "ROTATE",
    FREE_ROTATE: "FREE_ROTATE",
    EYE_TRANSLATE: "EYE_TRANSLATE",
    HEIGHT_TRANSLATE: "HEIGHT_TRANSLATE",
    CHANGE_FOVY: "CHANGE_FOVY",
};

{
    StandardUIViewer.OperationMode = OperationMode;

    // カメラ位置の初期値（本栖湖付近）
    StandardUIViewer.DEFAULT_CAMERA_POSITION = { latitude: 35.475968, longitude: 138.573161, height: 2000 };

    // 注視点位置の初期値（富士山付近）
    StandardUIViewer.DEFAULT_LOOKAT_POSITION = { latitude: 35.360626, longitude: 138.727363, height: 2000 };

    // カメラパラメータの初期値
    StandardUIViewer.DEFAULT_CAMERA_PARAMETER = { fov: 60, near: 30, far: 500000, speed_factor: 2000 };

    // カメラと地表面までの最低距離
    StandardUIViewer.MINIMUM_HEIGHT = 2.0;

    // 最小近接平面距離 (この値は MINIMUM_HEIGHT * 0.5 より小さい値を指定します)
    StandardUIViewer.MINIMUM_NEAR = 1.0;

    // 最小遠方平面距離
    StandardUIViewer.MINIMUM_FAR = 500000;

    // 高度からの近接平面距離を計算するための係数
    StandardUIViewer.NEAR_FACTOR = 0.01;

    // 近接平面距離からの遠方平面距離を計算するための係数
    StandardUIViewer.FAR_FACTOR = 10000;

    // 画角の適用範囲
    StandardUIViewer.FOV_RANGE = { min: 5, max: 120 };

    // 画角の倍率　θ' = 2 atan(tan(θ/2)*f)
    StandardUIViewer.FOV_FACTOR = 1.148698354997035
}

export default StandardUIViewer;
