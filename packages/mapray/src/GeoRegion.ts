import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";

/**
 * @summary 地理空間的Region
 *
 * @memberof mapray
 */
class GeoRegion {

    /**
     * 初期値は empty である。
     * lon は次の条件とする。
     * <p> 条件 this._min_lon < this._max_lon </p>
     * <p> 条件 this._max_lon - this._min_lon <= 360 </p>
     */
    constructor()
    {
        this._empty = true;
        this._min_lon = 0;
        this._max_lon = 0;
        this._min_lat = 0;
        this._max_lat = 0;
        this._min_alt = 0;
        this._max_alt = 0;
    }


    /**
     * @summary 空確認
     *
     * @return {boolean}        empty値
     */
    empty()
    {
        return this._empty;
    }


    /**
     * @summary Pointを追加
     * <p> 条件 this._min_lon < this._max_lon </p>
     * <p> 条件 this._max_lon - this._min_lon <= 360 </p>
     *
     * @param {number}  lon  地理空間位置 longitude
     * @param {number}  lat  地理空間位置 latitude
     * @param {number}  alt  地理空間位置 altitude
     * @private
     */
    _add( lon, lat, alt )
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
     * @summary base_lon より右となる最小の longitude を算出
     *
     * @param {number}  base_lon  基準となるlongitude
     * @param {number}  lon       確認したいlongitude
     * @return {number} 最小longitude
     * @private
     */
     _calcRightPosition( base_lon, lon )
     {
         let diff = lon - base_lon;
         diff = diff - 360 * Math.floor(diff / 360);
         return base_lon + diff;
     }


    /**
     * @summary GeoPointを追加
     *
     * @param {mapary.GeoPoint}  point  地理空間位置
     */
    addPoint( point )
    {
        this._add( point.longitude, point.latitude, point.altitude );
    }


    /**
     * @summary GeoPointを追加
     *
     * @param {...mapary.GeoPoint}  points  地理空間位置
     */
    addPoints( ...points )
    {
        points.forEach( point => {
            this._add( point.longitude, point.latitude, point.altitude );
        });
    }


    /**
     * @summary PointArrayを追加
     *
     * @param {number[]}  pointsArray  地理空間位置Array
     */
    addPointsAsArray( pointsArray )
    {
        for ( let i = 0; i < pointsArray.length; i += 3 ) {
            this._add( pointsArray[i], pointsArray[i+1], pointsArray[i+2] );
        };
    }


    /**
     * @summary GeoRegionを結合
     *
     * @param {mapray.GeoRegion}  region  地理空間Region
     */
    merge( region )
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
     * @summary Region内の任意点の取得
     * center     ( 0.5, 0.5 )
     * east       (   1, 0.5 )
     * west       (   0, 0.5 )
     * north      ( 0.5,   1 )
     * south      ( 0.5,   0 )
     * northEast  (   1,   1 )
     * southWest  (   0,   0 )
     *
     * @param {number}  lon_pos   longitude位置割合
     * @param {number}  lat_pos   latitude位置割合
     * @param {number}  [alt_pos] anlitude位置割合
     * @return {mapary.GeoPoint}   GeoPoint
     */
    getPoint( lon_pos, lat_pos, alt_pos=0 )
    {
        if ( this._empty ) { return null; }
        return new GeoPoint(
            (1-lon_pos) * this._min_lon + lon_pos * this._max_lon,
            (1-lat_pos) * this._min_lat + lat_pos * this._max_lat,
            (1-alt_pos) * this._min_alt + alt_pos * this._max_alt
        );
    }


    /**
     * @summary SouthWestのGeopointを返却
     *
     * @return {mapary.GeoPoint}   南西(min)のGeoPoint
     */
    getSouthWest()
    {
        if ( this._empty ) { return null; }
        return new GeoPoint( this._min_lon, this._min_lat, this._min_alt );
    }


    /**
     * @summary NorthEastのGeopointを返却
     *
     * @return {mapary.GeoPoint}  北東(max)のGeoPoint
     */
    getNorthEast()
    {
        if ( this._empty ) { return null; }
        return new GeoPoint( this._max_lon, this._max_lat, this._max_alt );
    }


    /**
     * @summary 中心位置のGeopointを返却
     *
     * @return {mapary.GeoPoint}  中心(center)のGeoPoint
     */
    getCenter()
    {
        if ( this._empty ) { return null; }
        return this.getPoint( 0.5, 0.5, 0.5 );
    }


    /**
     * @summary RegionのLongitude方向 の地表面距離を算出
     *
     * @return {number}  Longitude方向の地表面距離
     */
    getLongitudeDistance()
    {
        if ( this._empty ) { return null; }
        return this.getPoint( 0, 0.5 ).getGeographicalDistance( this.getPoint( 1, 0.5 ) );
    }


    /**
     * @summary RegionのLatitude方向 の地表面距離を算出
     *
     * @return {number}  Latitude方向の地表面距離
     */
    getLatitudeDistance()
    {
        if ( this._empty ) { return null; }
        return this.getPoint( 0.5, 0 ).getGeographicalDistance( this.getPoint( 0.5, 1 ) );
    }
}


export default GeoRegion;
