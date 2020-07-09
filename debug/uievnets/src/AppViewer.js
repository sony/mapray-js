
import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

const accessToken = "<your access token here>";

class AppViewer extends maprayui.StandardUIViewer {

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container )
    {
        super( container, accessToken, {
            debug_stats: new mapray.DebugStats()
        });

        this._container = container;

        // カメラの初期設定
        this._init_camera = {
            latitude: 28.0,         // 緯度
            longitude: 142.0,       // 経度
            height: 2500000,        // 高度
            fov: 46.0               // 画角
        };

        // 注視点の初期設定（長野県松本市付近）
        this._lookat_position = {
            latitude: 38.00,
            longitude: 138.00,
            height: 1000
        };

        // カメラ位置
        this.setCameraPosition( this._init_camera );

        // 注視点
        this.setLookAtPosition( this._lookat_position );

        // カメラパラメータ
        this.setCameraParameter( this._init_camera );
    }

    /**
     * Viewerを閉じる
     */
    _closeViewer()
    {
        this.destroy();
    }

    /**
     * リソース要求関数
     */
    _onTransform( url, type )
    {
        return {
            url: url,
            credentials: mapray.CredentialMode.SAME_ORIGIN,
            headers: {}
        };
    }

    onUpdateFrame( delta_time )
    {
        if (!this._viewer) {
            return;
        }
        super.onUpdateFrame( delta_time );

        var camera_matrix = this._viewer.camera.view_to_gocs
        var direction = [camera_matrix[4], camera_matrix[5], camera_matrix[6] ];
        var pitch = this._camera_parameter.pitch - 90;
    }

    // Override from EventHandlers
    onMouseDown( point, event ) {
        console.log( 'onMouseDown events:', point );
        super.onMouseDown( point, event );
    }

    onMouseMove( point, event ) {
        console.log( 'onMouseMove:', point );

        const dummy_err_flag = false;
        if (dummy_err_flag) {
            this.resetOpEvent();
        }
        super.onMouseMove( point, event );
    }

    onMouseUp( point, event ) {
        console.log( 'onMouseUp', point );

        const dummy_err_flag = false;
        if (dummy_err_flag) {
            this.resetOpEvent();
        }
        super.onMouseUp( point, event );
    }

    onKeyDown( event )
    {
        super.onKeyDown( event );
    }
}

export default AppViewer;
