// JavaScript source code
var GeoMath = mapray.GeoMath;

// Get from deck.gl's github repository
// https://github.com/uber/deck.gl
// Source data GeoJSON
const DATA_URL = {
    ACCIDENTS:
        'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/highway/accidents.csv',
    ROADS:
        'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/highway/roads.json'
};


function getKey({state, type, id}) {
    return `${state}-${type}-${id}`;
}

const COLOR_SCALE = d3.scaleThreshold()
    .domain([0, 4, 8, 12, 20, 32, 52, 84, 136, 220])
    .range([
        [26, 152, 80],
        [102, 189, 99],
        [166, 217, 106],
        [217, 239, 139],
        [255, 255, 191],
        [254, 224, 139],
        [253, 174, 97],
        [244, 109, 67],
        [215, 48, 39],
        [168, 0, 0]
    ]);

const WIDTH_SCALE = d3.scaleLinear()
    .clamp(true)
    .domain([0, 5000])
    .range([1, 3]);


  const INIT_DISTANCE = 50000.0
  const INIT_PITCH_ANGLE = -80.0;
  const TARGET_DISTANCE = 10000;
  const TARGET_PITCH_ANGLE = -10;
  const DISTANCE_STEP = 10000;
  const PITCH_STEP = 10.0;

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

        this.longitude = -98.393554;
        this.latitude = 40.930115;
        this.height = 5000000.24;
        this.distance = INIT_DISTANCE;
        this.pitch_angle = INIT_PITCH_ANGLE;
        this.angular_velocity = 5.0;
        this.turn_angle = 0;
        this.angle_Of_View_min = 30
        this.angle_Of_View_max = 70
        this.angle_Of_View = 0
        this.buttonPush = false;
        this.data = {
            incidents: null,
            fatalities: null
        };
        this.year = 0;

        const formatRow = d => ({
            ...d,
            incidents: Number(d.incidents),
            fatalities: Number(d.fatalities)
        });

        d3.csv(DATA_URL.ACCIDENTS, formatRow)
            .then(response => {
                if (response) {
                    this.data = this._aggregateAccidents(response);
                    this.year = 2015;

                }
                this.loadGeoJson();
            })
            .catch(error => {
                console.log('error: ' + error);
            });
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

        var base_to_gocs = mapray.GeoMath.createMatrix();
        mapray.GeoMath.iscs_to_gocs_matrix({
            longitude: this.longitude,
            latitude: this.latitude,
            height: this.height
        }, base_to_gocs);

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
        camera.far = camera.near * 10000000;

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
       return new USGSImageProvider("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/", "", 256, 2, 18, {coord_system: CoordSystem.UPPER_LEFT, coord_order: CoordOrder.ZYX })
    }

     // Load GeoJSON
     loadGeoJson() {
        var loader = new mapray.GeoJSONLoader( this._viewer.scene, DATA_URL.ROADS, {
            onLoad: (loader, isSuccess) => { console.log("success load geojson") },
            getLineColor: f => this._getLineColor(f, this.data.fatalities[this.year]),
            getLineWidth: f => this._getLineWidth(f, this.data.incidents[this.year]),
            getAltitudeMode: () => mapray.AltitudeMode.CLAMP,
        } );

        loader.load();
    }

    // move camera
    moveCamera() {
        this.buttonPush = !this.buttonPush;
    }


    _aggregateAccidents(accidents) {
        const incidents = {};
        const fatalities = {};

        if (accidents) {
            accidents.forEach(a => {
                const r = (incidents[a.year] = incidents[a.year] || {});
                const f = (fatalities[a.year] = fatalities[a.year] || {});
                const key = getKey(a);
                r[key] = a.incidents;
                f[key] = a.fatalities;
            });
        }
        return {incidents, fatalities};
    }

    _getLineColor(f, fatalities) {
        if (!fatalities) {
            return [200, 200, 200, 1.0];
        }
        const key = getKey(f.properties);
        const fatalitiesPer1KMile = ((fatalities[key] || 0) / f.properties.length) * 1000;
        console.log(fatalitiesPer1KMile)

        return COLOR_SCALE(fatalitiesPer1KMile).map(v => v/255.0).concat(1.0);
    }

    _getLineWidth(f, incidents) {
        if (!incidents) {
            return 10;
        }
        const key = getKey(f.properties);
        const incidentsPer1KMile = ((incidents[key] || 0) / f.properties.length) * 1000;
        // return 10.0;
        return WIDTH_SCALE(incidentsPer1KMile);
    }
}
