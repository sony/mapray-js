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

  const INIT_DISTANCE = 50000.0
  const INIT_PITCH_ANGLE = -30.0;
  const TARGET_DISTANCE = 10000;
  const TARGET_PITCH_ANGLE = -10;
  const DISTANCE_STEP = 10000;
  const PITCH_STEP = 10.0;

class ExtrudePolygonProperties extends mapray.RenderCallback {

    constructor(container) {
        super();

        // Set access Token
        var accessToken = "<your access token here>";

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
        this.turn_angle = 0;

        this.angle_Of_View = 0

        this.buttonPush = false;
    }

    // called this method in each frames
    onUpdateFrame(delta_time)  // override
    {
        var camera = this.viewer.camera;

        var c_distance = this.distance;

        var base_geoPoint = new mapray.GeoPoint( this.longitude, this.latitude, this.height );
        var base_to_gocs = base_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

        var d = c_distance;

        var camera_Mat = mapray.GeoMath.createMatrix();

        var camera_pos_mat = mapray.GeoMath.createMatrix();
        mapray.GeoMath.setIdentity(camera_pos_mat);

        camera_pos_mat[13] = -d;

        var turn_Mat = mapray.GeoMath.rotation_matrix([0, 0, 1], this.turn_angle, mapray.GeoMath.createMatrix());

        var pitch_Mat = mapray.GeoMath.rotation_matrix([1, 0, 0], this.pitch_angle, mapray.GeoMath.createMatrix());

        mapray.GeoMath.mul_AA(pitch_Mat, camera_pos_mat, camera_pos_mat);
        
        mapray.GeoMath.mul_AA(turn_Mat, camera_pos_mat, camera_pos_mat);

        var cam_pos = mapray.GeoMath.createVector3([camera_pos_mat[12], camera_pos_mat[13], camera_pos_mat[14]]);
        var cam_end_pos = mapray.GeoMath.createVector3([0, 0, 0]);
        var cam_up = mapray.GeoMath.createVector3([0, 0, 1]);

        mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, camera_Mat);

        mapray.GeoMath.mul_AA(base_to_gocs, camera_Mat, camera.view_to_gocs);

        camera.near = c_distance / 100;
        camera.far = camera.near * 1000;

        this.turn_angle += this.angular_velocity * delta_time;
    
        // next distance and pitch
        if (this.buttonPush) {
            this.distance -= DISTANCE_STEP*delta_time;
            this.pitch_angle += PITCH_STEP*delta_time;
            if (this.distance <= TARGET_DISTANCE) {
                this.distance = TARGET_DISTANCE;
            }
            if (this.pitch_angle > TARGET_PITCH_ANGLE) {
                this.pitch_angle = TARGET_PITCH_ANGLE;
            }
        } else {
            this.distance += DISTANCE_STEP*delta_time;
            this.pitch_angle -= PITCH_STEP*delta_time;
            if (this.distance > INIT_DISTANCE) {
                this.distance = INIT_DISTANCE;
            }
            if (this.pitch_angle <= INIT_PITCH_ANGLE) {
                this.pitch_angle = INIT_PITCH_ANGLE;
            }
        }
    }

    // 画像プロバイダを生成
    createImageProvider() {
        return new mapray.ImageProvider( {
            init: () => {
                return {
                    image_size: 256,
                    zoom_level_range: new mapray.ImageProvider.Range( 2, 18 )
                };
            },
            requestTile: ( z, x, y ) => {
                return new Promise( ( resolve, reject ) => {
                    const image = new Image();
                    image.onload      = () => resolve( image );
                    image.onerror     = () => reject( new Error( "Failed to load image: " + z + "/" + y + "/" + x ) );
                    image.crossOrigin = "anonymous";
                    image.src         = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/" + z + "/" + y + "/" + x;
                } );
            }
        } );
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
        this.buttonPush = !this.buttonPush;
    }
}
