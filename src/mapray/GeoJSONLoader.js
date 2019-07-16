import GeoMath from "./GeoMath";
import CredentialMode from "./CredentialMode";
import MarkerLineEntity from "./MarkerLineEntity";

/**
 * @summary シーンの読み込み
 * @memberof mapray
 */
class GeoJSONLoader {

    /**
     * @desc
     * <p>url で指定したシーンデータの読み込みを開始し、scene にエンティティを構築する。</p>
     * <p>読み込みが終了したとき options.callback を呼び出す。</p>
     * @param {mapray.Scene} scene      読み込み先のシーン
     * @param {string}       url        シーンファイルの URL
     * @param {object}       [options]  オプション集合
     * @param {mapray.GeoJSONLoader.TransformCallback} [options.transform]  リソース要求変換関数
     * @param {mapray.GeoJSONLoader.FinishCallback}    [options.callback]   終了コールバック関数
     */
    constructor( scene, url, options )
    {
        var opts = options || {};

        this._scene      = scene;
        this._url        = url;
        this._onLoad   = opts.onLoad  || defaultOnLoadCallback;
        this._getLineColor = opts.getLineColor || defaultGetLineColorCallback;
        this._getLineWidth = opts.getLineWidth || defaultGetLineWidthCallback;
        this._getRadius = opts.getRadius || defaultGetRadiusCallback;
        this._getFillColor = opts.getFillColor || defaultGetFillColorCallback;
        this._getElevation = opts.getElevation || defaultGetElevationCallback;
        this._transform  = opts.transform || defaultTransformCallback;
        this._getExtrudedMode = opts.getExtrudedMode || defaultExtrudedModeCallback;
        this._glenv      = scene.glenv;
        this._references = {};
        this._cancelled  = false;
        this._finished   = false;
        this._abort_ctrl = new AbortController();
        this._loadFile();

        scene.addLoader( this );
    }


    /**
     * @summary 読み込み先のシーン
     * @type {mapray.Scene}
     * @readonly
     */
    get scene() { return this._scene; }


    /**
     * @summary シーンファイルの URL
     * @type {string}
     * @readonly
     */
    get url() { return this._url; }


    /**
     * @summary 読み込みの取り消し
     * @desc
     * <p>終了コールバック関数は isSuccess == false で呼び出される。</p>
     */
    cancel()
    {
        if ( this._cancelled ) return;

        this._abort_ctrl.abort();  // 取り消したので、すべての要求を中止
        this._cancelled = true;    // 取り消し中、または取り消しされた
        this._scene.removeLoader( this );
        Promise.resolve().then( () => { this._cancel_callback(); } );
    }

    /**
     * @private
     */
    _loadFile()
    {
        var tr = this._transform( this._url );

        fetch( tr.url, this._make_fetch_params( tr ) )
            .then( response => {
                this._check_cancel();
                return response.ok ?
                    response.json() : Promise.reject( Error( response.statusText ) );
            } )
            .then( json => {
                // JSON データの取得に成功
                this._check_cancel();
                if (!this._load_feature( json )) {
                    return reject( json )
                }
                this._success_callback();
                return json;
            } )
            .catch( ( e ) => {
                // JSON データの取得に失敗
                this._fail_callback( "mapray: failed to retrieve: " + tr.url );
            } );
    }


    /**
     * JSON GeoJSONを解析
     * @private
     */
    _load_feature( geojson )
    {
        var features = Array.isArray(geojson) ? geojson: geojson.features;
        var feature;

        if ( features ) {
            for ( var i = 0, len = features.length; i < len; i++ ) {
                feature = features[i];
                if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
					this._load_feature(feature);
				}
            }
        }

        // Geometory
        var success = this._load_geometry( geojson )

        if ( this._cancelled ) return false;

        return success;
    }

    _load_geometry( geojson ) {
        var geometry = geojson.type === "Feature" ? geojson.geometry : geojson;
        var coords = geometry ? geometry.coordinates : null;
        var layers = [];
        
        if (!coords && !geometry) {
            return false;
        }
        
        switch ( geometry.type) {
            case "Point":
                console.log( "GeoJSON Point" );
                return false;
                // return new Marker(latlng);

	        case "MultiPoint":
                for ( var i = 0, len = coords.length; i < len; i++) {
                    // layers.push(new Marker(latlng));
                    console.log( "GeoJSON MultiPoint i:" );
                }
                return false;
                //return new FeatureGroup(layers);
                
	        case "LineString":
	        case "MultiLineString":
		         // latlngs = coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, _coordsToLatLng);
                // return new Polyline(latlngs, options);
                console.log( "GeoJSON LineString or MultiString" );
                return this._loadLines( geometry, this._getLineColor(geojson), this._getLineWidth(geojson), this._getExtrudedMode(geojson), this._getElevation(geojson) );

	        case "Polygon":
	        case "MultiPolygon":
		        // latlngs = coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, _coordsToLatLng);
                // return new Polygon(latlngs, options);
                console.log( "GeoJSON Polygon or MultiPolgon");
                return false;

	        case "GeometryCollection":
            /*    for (var i = 0, len = geometry.geometries.length; i < len; i++) {
			    var layer = geometryToLayer({
				    geometry: geometry.geometries[i],
				    type: 'Feature',
				    properties: geojson.properties
			}   , options);

			if (layer) {
				layers.push(layer);
			}
		}
        return new FeatureGroup(layers); */
            return false;
	    default:
		    throw new Error('Invalid GeoJSON object.');
        }
    }

    /**
     * fetch() の init 引数に与えるオブジェクトを生成
     * @private
     */
    _make_fetch_params( tr )
    {
        var init = {
            signal:      this._abort_ctrl.signal,
            credentials: (tr.credentials || CredentialMode.OMIT).credentials
        };

        if ( tr.headers ) {
            init.headers = (tr.headers || GeoJSONLoader._defaultHeaders);
        }

        return init;
    }


    /**
     * 取り消し状態のとき例外を投げる
     * @private
     */
    _check_cancel()
    {
        if ( this._cancelled ) {
            throw new Error( "canceled" );
        }
    }


    /**
     * @private
     */
    _cancel_callback()
    {
        if ( this._finished ) return;

        this._onLoad( this, false );
    }


    /**
     * @private
     */
    _success_callback()
    {
        if ( this._cancelled ) return;

        this._finished = true;
        this._scene.removeLoader( this );
        this._onLoad( this, true );
    }


    /**
     * @private
     */
    _fail_callback( msg )
    {
        if ( this._cancelled ) return;

        console.error( msg );
        this._finished = true;
        this._scene.removeLoader( this );
        this._onLoad( this, false );
    }

    _loadLines( geometry, color4, width, extruded, elevation ) 
    {
        if ( !geometry || color4.length !== 4 ) {
            return false;
        }
        var type = geometry.type;
        var coords = geometry.coordinates;
        var rgb = color4.slice(0, 3);
        var alpha = color4[3];

        // If multiline, split entity
        if ( type === "MultiLineString" ) {
            coords.forEach( points => {
                if ( !this._genereteLine( points, width, rgb, alpha, extruded, elevation ) ) {
                    return false;
                }
            });
        } else if ( type === "LineString" ) {
            if ( !this._genereteLine( coords, width, rgb, alpha, extruded, elevation ) ) {
                return false;
            }
        }
        
        return true;
    }

    _genereteLine( points, width, color, opaticy, extruded, elevation ) 
    {
        if ( !points )  {
            return false;
        }

        var h = 0;
        if ( !extruded ) {
            h = 0;
        } else if ( extruded ) {
            h = elevation;
        }

        var entity = new MarkerLineEntity( this._scene );
        var fp = this._flatten( points, h );
        if ( !fp ) {
            return false;
        }
        entity.addPoints(fp);
        entity.setLineWidth(width);
        entity.setColor(color);
        entity.setOpacity(opaticy);
        this._scene.addEntity(entity);
        
        return true;
    }

    _flatten( ary, h )
    {
        return ary.reduce((p, c) => {
          return c.length === 2 ? p.concat(c, h) : p.concat(c);
        }, []);
    };

    _generateFeature( geojson ) {
        if ( geojson.type === "Feature" || geojson.type === "FeatureCollection" ) {
            return geojson;
        }

        return {
            type: "Feature",
            properties: {},
            geometry: geojson
        }
    }
}

/**
 * @summary 終了コールバック
 * @callback FinishCallback
 * @desc
 * <p>シーンの読み込みが終了したときに呼び出される関数の型である。</p>
 * @param {mapray.GeoJSONLoader} loader     読み込みを実行したローダー
 * @param {boolean}            isSuccess  成功したとき true, 失敗したとき false
 * @memberof mapray.GeoJSONLoader
 */


/**
 * @summary リソース要求変換関数
 * @callback TransformCallback
 * @desc
 * <p>リソースのリクエスト時に URL などを変換する関数の型である。</p>
 *
 * @param  {string}                          url   変換前のリソース URL
 * @param  {mapray.GeoJSONLoader.ResourceType} type  リソースの種類
 * @return {mapray.GeoJSONLoader.TransformResult}    変換結果を表すオブジェクト
 *
 * @example
 * function( url, type ) {
 *     return {
 *         url:         url,
 *         credentials: mapray.CredentialMode.SAME_ORIGIN,
 *         headers: {
 *             'Header-Name': 'Header-Value'
 *         }
 *     };
 * }
 *
 * @memberof mapray.GeoJSONLoader
 */


/**
 * @summary リソース要求変換関数の変換結果
 * @typedef {object} TransformResult
 * @desc
 * <p>関数型 {@link mapray.GeoJSONLoader.TransformCallback} の戻り値のオブジェクト構造である。</p>
 * <p>注意: 現在のところ、リソースの種類が {@link mapray.GeoJSONLoader.ResourceType|ResourceType}.IMAGE のとき、headers プロパティの値は無視される。</p>
 * @property {string}                url                 変換後のリソース URL
 * @property {mapray.CredentialMode} [credentials=OMIT]  クレデンシャルモード
 * @property {object}                [headers={}]        リクエストに追加するヘッダーの辞書 (キーがヘッダー名、値がヘッダー値)
 * @memberof mapray.GeoJSONLoader
 */


{
    GeoJSONLoader._defaultHeaders = {};
    GeoJSONLoader.defaultLineColor = [0, 0, 0, 255];
    GeoJSONLoader.defaultFillColor = [0, 0, 0, 255];
    GeoJSONLoader.defaultLineWidth = 1;
    GeoJSONLoader.defaultRadius = 10;
    GeoJSONLoader.defaultExtrudedMode = false;
}

function defaultOnLoadCallback( loader, isSuccess )
{
}

function defaultGetLineColorCallback( geojson )
{
    return GeoJSONLoader.defaultLineColor;
}

function defaultGetLineWidthCallback( geojson ) 
{
    return GeoJSONLoader.defaultLineWidth;
}

function defaultGetRadiusCallback( geojson )
{
    return GeoJSONLoader.defaultRadius;
}

function defaultGetFillColorCallback( geojson )
{
    return GeoJSONLoader.defaultFillColor;
}

function defaultGetElevationCallback( geojson )
{
    return 100;
}

function defaultExtrudedModeCallback( geojson )
{
    var geometry = geojson.type === "Feature" ? geojson.geometry : geojson;
    switch (geometry.type) {
        case "Point":
        case "MultiPoint":
            return true;            
        case "LineString":
        case "MultiLineString":
            return true;
        case "Polygon":
        case "MultiPolygon":
            return false;
        default:
            throw new Error('Invalid GeoJSON object.');
    }
    return GeoJSONLoader.defaultExtrudedMode;
}

function defaultTransformCallback( url )
{
    return { url: url };
}


export default GeoJSONLoader;
