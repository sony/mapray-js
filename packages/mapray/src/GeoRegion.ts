import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";

/**
 * 地理空間的Region
 */
class GeoRegion {

    private _empty: boolean = true;

    private _min_lon: number = 0;
    private _max_lon: number = 0;
    private _min_lat: number = 0;
    private _max_lat: number = 0;
    private _min_alt: number = 0;
    private _max_alt: number = 0;

    /**
     * 初期値は empty である。
     * lon は次の条件とする。
     * - this._min_lon < this._max_lon
     * - this._max_lon - this._min_lon <= 360
     */
    constructor()
    {
    }


    /**
     * 空確認
     *
     * @return  empty値
     */
    empty(): boolean
    {
        return this._empty;
    }


    /**
     * Pointを追加
     * - 条件 this._min_lon < this._max_lon </p>
     * - 条件 this._max_lon - this._min_lon <= 360 </p>
     *
     * @param lon  地理空間位置 longitude
     * @param lat  地理空間位置 latitude
     * @param alt  地理空間位置 altitude
     */
    private _add( lon: number, lat: number, alt: number )
    {
        if ( this._empty ) {
            this._empty = false;
            lon = lon - 360 * Math.floor( lon/360 + 0.5 );
            this._min_lon = this._max_lon = lon;
            this._min_lat = this._max_lat = lat;
            this._min_alt = this._max_alt = alt;
        }
        else {
            const right_min_lon = this._calcRightPosition( this._min_lon, lon );

            if ( right_min_lon <= this._max_lon ) {
                // lon はmin,maxに内包されている
                // lon の min, max の確認は不要
            }
            else {
                const right_max_lon = this._calcRightPosition( this._max_lon, lon );

                const length1 = right_max_lon - this._max_lon ;
                const length2 = right_min_lon - 360 - this._min_lon;
                if ( Math.abs(length1) <= Math.abs(length2) ) {
                    // expand east
                    this._max_lon = this._max_lon + length1;
                }
                else {
                    // expand west
                    this._min_lon = this._min_lon + length2;
                }
            }

            if      ( lat < this._min_lat ) this._min_lat = lat;
            else if ( lat > this._max_lat ) this._max_lat = lat;
            if      ( alt < this._min_alt ) this._min_alt = alt;
            else if ( alt > this._max_alt ) this._max_alt = alt;
        }
    }

    /**
     * base_lon より右となる最小の longitude を算出
     *
     * @param  base_lon  基準となるlongitude
     * @param  lon       確認したいlongitude
     * @return 最小longitude
     */
     private _calcRightPosition( base_lon: number, lon: number ): number
     {
         let diff = lon - base_lon;
         diff = diff - 360 * Math.floor(diff / 360);
         return base_lon + diff;
     }


    /**
     * GeoPointを追加
     *
     * @param  point  地理空間位置
     */
    addPoint( point: GeoPoint )
    {
        this._add( point.longitude, point.latitude, point.altitude );
    }


    /**
     * GeoPointを追加
     *
     * @param  points  地理空間位置
     */
    addPoints( ...points: GeoPoint[] )
    {
        points.forEach( point => {
            this._add( point.longitude, point.latitude, point.altitude );
        });
    }


    /**
     * PointArrayを追加
     *
     * @param  pointsArray  地理空間位置Array
     */
    addPointsAsArray( pointsArray: number[] | Float64Array )
    {
        for ( let i = 0; i < pointsArray.length; i += 3 ) {
            this._add( pointsArray[i], pointsArray[i+1], pointsArray[i+2] );
        };
    }


    /**
     * GeoRegionを結合
     *
     * @param region  地理空間Region
     */
    merge( region: GeoRegion )
    {
        if( region.empty() ) { return; }
        if ( this._empty ) {
            this._min_lon = region._min_lon;
            this._max_lon = region._max_lon;
            this._min_lat = region._min_lat;
            this._max_lat = region._max_lat;
            this._min_alt = region._min_alt;
            this._max_alt = region._max_alt;
            this._empty = false;
        }
        else {
            // 内包判定
            let right_min_lon = this._calcRightPosition( this._min_lon, region._min_lon );
            const right_max_lon = this._calcRightPosition( this._min_lon, region._max_lon );

            if( right_min_lon > right_max_lon ) {
                right_min_lon -= 360;
            }

            let min_include = false;
            if ( ( right_min_lon >= this._min_lon ) && ( right_min_lon <= this._max_lon ) ) {
                min_include = true;
            }
            let max_include = false;
            if ( ( right_max_lon >= this._min_lon ) && ( right_max_lon <= this._max_lon ) ) {
                max_include = true;
            }

            // 1.thisがregionを内包
            if ( min_include && max_include ) {
                // 内包状態 -> 変化無し
            }

            // 2.westのみ内包 -> east拡大
            else if ( min_include ) {
                this._max_lon = right_max_lon;
            }

            // 3.eastのみ内包 -> west拡大
            else if ( max_include ) {
                this._min_lon = right_min_lon;
            }

            // 4.regionがthisを内包
            else if ( ( this._min_lon >= right_min_lon ) && ( this._max_lon <= right_max_lon ) )
            {
                this._min_lon = region._min_lon;
                this._max_lon = region._max_lon;
            }

            // 5.共有無し
            else {
                // east と west 比較
                const length1 = right_max_lon - this._max_lon ;
                const length2 = right_min_lon - 360 - this._min_lon;
                if ( Math.abs(length1) <= Math.abs(length2) ) {
                    // expand east
                    this._max_lon = this._max_lon + length1;
                }
                else {
                    // expand west
                    this._min_lon = this._min_lon + length2;
                }
            }

            // lat と alt
            this._min_lat = Math.min(this._min_lat, region._min_lat);
            this._max_lat = Math.max(this._max_lat, region._max_lat);
            this._min_alt = Math.min(this._min_alt, region._min_alt);
            this._max_alt = Math.max(this._max_alt, region._max_alt);
        }
    }


    /**
     * Region内の任意点の取得
     * - center     ( 0.5, 0.5 )
     * - east       (   1, 0.5 )
     * - west       (   0, 0.5 )
     * - north      ( 0.5,   1 )
     * - south      ( 0.5,   0 )
     * - northEast  (   1,   1 )
     * - southWest  (   0,   0 )
     *
     * @param lon_pos  longitude位置割合
     * @param lat_pos  latitude位置割合
     * @param alt_pos  anlitude位置割合
     * @return   GeoPoint
     */
    getPoint( lon_pos: number, lat_pos: number, alt_pos: number = 0 ): GeoPoint | null
    {
        if ( this._empty ) { return null; }
        return new GeoPoint(
            (1-lon_pos) * this._min_lon + lon_pos * this._max_lon,
            (1-lat_pos) * this._min_lat + lat_pos * this._max_lat,
            (1-alt_pos) * this._min_alt + alt_pos * this._max_alt
        );
    }


    /**
     * SouthWestのGeopointを返却
     *
     * @return  南西(min)のGeoPoint
     */
    getSouthWest(): GeoPoint | null
    {
        if ( this._empty ) { return null; }
        return new GeoPoint( this._min_lon, this._min_lat, this._min_alt );
    }


    /**
     * NorthEastのGeopointを返却
     *
     * @return  北東(max)のGeoPoint
     */
    getNorthEast(): GeoPoint | null
    {
        if ( this._empty ) { return null; }
        return new GeoPoint( this._max_lon, this._max_lat, this._max_alt );
    }


    /**
     * 中心位置のGeopointを返却
     *
     * @return  中心(center)のGeoPoint
     */
    getCenter(): GeoPoint | null
    {
        if ( this._empty ) { return null; }
        return this.getPoint( 0.5, 0.5, 0.5 );
    }


    /**
     * RegionのLongitude方向 の地表面距離を算出
     *
     * @return  Longitude方向の地表面距離
     */
    getLongitudeDistance(): number | null
    {
        const a = this.getPoint( 0, 0.5 );
        const b = this.getPoint( 1, 0.5 );
        return (a && b) ? a.getGeographicalDistance( b ) : null;
    }


    /**
     * RegionのLatitude方向 の地表面距離を算出
     *
     * @return  Latitude方向の地表面距離
     */
    getLatitudeDistance(): number | null
    {
        const a = this.getPoint( 0.5, 0 );
        const b = this.getPoint( 0.5, 1 );
        return (a && b) ? a.getGeographicalDistance( b ) : null;
    }
}


export default GeoRegion;
