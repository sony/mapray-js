// JavaScript source code
var GeoMath = mapray.GeoMath;

// Get from deck.gl's github repository
// https://github.com/uber/deck.gl
const DATA_URL =
  'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/geojson/vancouver-blocks.json'; 


// Referenced the code of Deck.gl's geojson sample
// https://github.com/uber/deck.gl/tree/7.3-release/examples/website/geojson
const COLOR_SCALE = d3.scaleThreshold()
  .domain([-0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2])
  .range([
    [65, 182, 196],
    [127, 205, 187],
    [199, 233, 180],
    [237, 248, 177],
    // zero
    [255, 255, 204],
    [255, 237, 160],
    [254, 217, 118],
    [254, 178, 76],
    [253, 141, 60],
    [252, 78, 42],
    [227, 26, 28],
    [189, 0, 38],
    [128, 0, 38]
  ]);

class ExtrudePolygonProperties extends mapray.RenderCallback {

    constructor(container) {
        super();

        // Set access Token
        var accessToken = "";

        new mapray.Viewer(container, {
            render_callback: this,
            image_provider: this.createImageProvider(),
            dem_provider: new mapray.CloudDemProvider(accessToken)
        });

        this.longitude = -123.13;    
        this.latitude = 49.254;      
        this.height = 106.24;         
        this.distance = 50000.0;        
        this.pitch_angle = -30.0;       
        this.angular_velocity = 5.0;    
        this.turn_angle = 0;            
        this.angle_Of_View_min = 30    
        this.angle_Of_View_max = 70     
        this.angle_Of_View = 0
        this.buttonPush = false;

        this.loadGeoJson();
    }

    onStart()  // override
    {
        // 初期のターン角度
        this.turn_angle = 0;

        // 初期の画角
        this.angle_Of_View = 0

        this.buttonPush = false;
    }

    // フレーム毎に呼ばれるメソッド
    onUpdateFrame(delta_time)  // override
    {
        // 毎フレームの処理
        var camera = this.viewer.camera;

        var c_distance = this.distance;

        // 基準座標系から GOCS への変換行列を生成
        var base_to_gocs = mapray.GeoMath.createMatrix();
        mapray.GeoMath.iscs_to_gocs_matrix({
            longitude: this.longitude,
            latitude: this.latitude,
            height: this.height
        }, base_to_gocs);

        // カメラの相対位置を計算し、姿勢を決める
        var d = c_distance;

        var camera_Mat = mapray.GeoMath.createMatrix();

        var camera_pos_mat = mapray.GeoMath.createMatrix();
        mapray.GeoMath.setIdentity(camera_pos_mat);

        // カメラの位置をY軸方向に距離分移動させる
        camera_pos_mat[13] = -d;

        // z軸でturn_angle分回転させる回転行列を求める
        var turn_Mat = mapray.GeoMath.rotation_matrix([0, 0, 1], this.turn_angle, mapray.GeoMath.createMatrix());

        // x軸でpitch_angle分回転させる回転行列を求める
        var pitch_Mat = mapray.GeoMath.rotation_matrix([1, 0, 0], this.pitch_angle, mapray.GeoMath.createMatrix());

        // カメラの位置にX軸の回転行列をかける
        mapray.GeoMath.mul_AA(pitch_Mat, camera_pos_mat, camera_pos_mat);
        
        // カメラの位置にZ軸の回転行列をかける
        mapray.GeoMath.mul_AA(turn_Mat, camera_pos_mat, camera_pos_mat);

        // 視線方向を定義
        var cam_pos = mapray.GeoMath.createVector3([camera_pos_mat[12], camera_pos_mat[13], camera_pos_mat[14]]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

        // ビュー変換行列を作成
        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, camera_Mat);

        // カメラに変換行列を設定
        mapray.GeoMath.mul_AA(base_to_gocs, camera_Mat, camera.view_to_gocs);

        // カメラに近接遠方平面を設定
        camera.near = c_distance / 100;
        camera.far = camera.near * 1000;

        // 次のターン角度
        this.turn_angle += this.angular_velocity * delta_time;
    
        // next distance
        if (this.buttonPush) {
            this.distance -= 1000;
            this.pitch_angle += 0.1;
            if (this.distance <= 10000) {
                this.distance = 10000;
            }
            if (this.pitch_angle > -10) {
                this.pitch_angle = -10;
            }
        }
    }

    // 画像プロバイダを生成
    createImageProvider() {
       return new USGSImageProvider("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/", "", 256, 2, 18, {coord_system: CoordSystem.UPPER_LEFT, coord_order: CoordOrder.ZYX })
    }

     // Load GeoJSON
     loadGeoJson() {
        var loader = new mapray.GeoJSONLoader( this._viewer.scene, DATA_URL, {
            onLoad: (loader, isSuccess) => { console.log("success load geojson") },
            getFillColor: f => COLOR_SCALE(f.properties.growth).map(v => v/255.0).concat(1.0),
            getAltitude: () => 0,
            getExtrudedHeight: f => Math.sqrt(f.properties.valuePerSqm) * 10
        } );

        loader.load();
    }

    // move camera
    moveCamera() {
        console.log('call');
        this.buttonPush = !this.buttonPush;
        if (this.buttonPush) {
            
        }
    }
}
