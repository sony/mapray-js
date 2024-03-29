import { cfa_assert } from "./util/assertion";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";


/**
 * 地理的空間を表現するクラス
 *
 * 経度、緯度、標高 それぞれ最小値、最大値によって定義される空間を表現します。
 * 地理的空間を表現するほか、空間の拡張や結合などの操作をサポートします。
 *
 * 空間の状態は、空、全域、それ以外の3つのいずれかです。
 * {@link is_empty}, {@link is_whole}, {@link is_longitude_whole} により確認することができます。
 *
 * 経度の値は、次の条件を満たすように保持されます。
 *
 * - `min_lon < max_lon`
 * - `max_lon - min_lon <= 360`
 *
 * `min_lon`, `max_lon` それぞれの値は -180 〜 180 でない可能性がある点に注意してください。
 *
 * 経度値の計算方法について、東経180°と西経180°が同一の点となるため、拡張や結合を行う際に特別な計算お行います。
 * 拡張や結合を行う際はできるだけ拡張量が小さくなるように拡張されます。
 * 例えば、東経170°付近の空間に、西経170°(-170)付近の点を含むように拡張する場合、
 * 計算結果の経度領域が -170°〜170° ではなく 170° 〜 190° になります。
 */
class GeoRegion {

    private _status: Status = Status.EMPTY;

    private _min_lon: number = 0;
    private _max_lon: number = 0;
    private _min_lat: number = 0;
    private _max_lat: number = 0;
    private _min_alt: number = 0;
    private _max_alt: number = 0;


    constructor( region?: GeoRegion.RegionData2D | GeoRegion.RegionData3D  )
    {
        if ( region ) this.setRegion( region );
    }


    /**
     * 空であるかを取得します。
     */
    get is_empty(): boolean
    {
        return this._status === Status.EMPTY;
    }


    /**
     * 水平方向の空間が全区間であるかを取得します。
     */
    get is_whole(): boolean
    {
        return this._status === Status.WHOLE_LONGITUDE && this._min_lat <= -90 && +90 <= this._max_lat;
    }


    /**
     * 経度方向の空間が全区間であるかを取得します。
     */
    get is_longitude_whole(): boolean
    {
        return this._status === Status.WHOLE_LONGITUDE;
    }


    /**
     * 領域を初期化し空にします。
     */
    clear(): void
    {
        this._status = Status.EMPTY;
        this._min_lon = 0;
        this._max_lon = 0;
        this._min_lat = 0;
        this._max_lat = 0;
        this._min_alt = 0;
        this._max_alt = 0;
    }


    /**
     * インスタンスを代入
     *
     * src を this に代入する。
     *
     * @param  src  代入元
     * @return      this
     */
    assign( src: GeoRegion ): GeoRegion
    {
        this._status = src._status;
        this._min_lon = src._min_lon;
        this._max_lon = src._max_lon;
        this._min_lat = src._min_lat;
        this._max_lat = src._max_lat;
        this._min_alt = src._min_alt;
        this._max_alt = src._max_alt;
        return this;
    }


    /**
     * インスタンスを複製
     *
     * this の複製を生成して返す。
     *
     * @return this の複製
     */
    clone(): GeoRegion
    {
        const clone = new GeoRegion();
        return clone.assign( this );
    }


    /**
     * 領域を設定します。
     */
    setRegion( region: GeoRegion.RegionData2D | GeoRegion.RegionData3D ): void
    {
        const is3d = region.length === 6;
        let p = 0;
        const west = region[p++];
        const south = region[p++];
        if ( is3d ) p++;
        const east = region[p++];
        const north = region[p++];
        cfa_assert( south <= north );
        const is_longitude_whole = 360 <= east - west;
        if ( is_longitude_whole ) {
            this._setWholeLongitudeRegion();
        }
        else {
            this._status = Status.PARTIAL;
            this._min_lon = west;
            this._max_lon = this._calcRightPosition( west, east );
        }
        this._min_lat = south;
        this._max_lat = north;
        if ( region.length === 6 ) {
            cfa_assert( region[2] <= region[5] );
            this._min_alt = region[2];
            this._max_alt = region[5];
        }
    }


    /**
     * 水平方向について全領域に設定します。
     */
    setWholeRegion( vertical_region?: [min_alt: number, max_alt: number] ): void
    {
        this._setWholeLongitudeRegion();
        if ( vertical_region ) {
            this.setRegion( [-180, -90, 180, 90, ...vertical_region] );
        }
        else {
            this.setRegion( [-180, -90, 180, 90] );
        }
    }


    /**
     * 経度方向について全領域に設定します（経度方向の値のみ更新されます）。
     * Empty 時にこの関数が呼ばれた際に、緯度が 0 になるため混乱を防ぐため非公開とする。
     * この関数を使う場合は latitude も指定すること（標高はデフォルト値0が代入されても良いと思われる）。
     */
    private _setWholeLongitudeRegion(): void
    {
        this._status = Status.WHOLE_LONGITUDE;
        this._min_lon = -180;
        this._max_lon = +180;
    }


    /**
     * 共通領域が存在するかを判定します。
     */
    intersects( region: GeoRegion | GeoRegion.RegionData2D | GeoRegion.RegionData3D ): boolean
    {
        if ( region instanceof GeoRegion ) region = [region._min_lon, region._min_lat, region._max_lon, region._max_lat, region._min_alt, region._max_alt];
        const is3d = region.length === 6;
        let p = 0;
        const west = region[p++];
        const south = region[p++];
        if ( is3d ) p++;
        const east = region[p++];
        const north = region[p++];
        if ( region.length === 6 && ( this._max_alt < region[2] || region[5] < this._min_alt ) ) {
            return false;
        }
        if ( this._max_lat < south || north < this._min_lat ) {
            return false;
        }
        if ( this._max_lon < west || east < this._min_lon ) {
            return false;
        }
        return true;
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
    private _add( lon: number, lat: number, alt?: number )
    {
        if ( this._status === Status.EMPTY ) {
            this._status = Status.PARTIAL;
            lon = lon - 360 * Math.floor( lon/360 + 0.5 );
            this._min_lon = this._max_lon = lon;
            this._min_lat = this._max_lat = lat;
            this._min_alt = this._max_alt = alt ?? 0;
        }
        else {
            if      ( lat < this._min_lat ) this._min_lat = lat;
            else if ( lat > this._max_lat ) this._max_lat = lat;
            if ( alt !== undefined ) {
                if      ( alt < this._min_alt ) this._min_alt = alt;
                else if ( alt > this._max_alt ) this._max_alt = alt;
            }

            if ( this._status === Status.WHOLE_LONGITUDE ) {
                return;
            }

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
        diff = diff - 360 * Math.floor( diff / 360 );
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
        if ( region.is_empty ) return;
        if ( this.is_empty ) {
            this.assign( region );
            return;
        }

        // lat と alt
        this._min_lat = Math.min(this._min_lat, region._min_lat);
        this._max_lat = Math.max(this._max_lat, region._max_lat);
        this._min_alt = Math.min(this._min_alt, region._min_alt);
        this._max_alt = Math.max(this._max_alt, region._max_alt);

        if ( this._status === Status.WHOLE_LONGITUDE ) return;
        if ( region._status === Status.WHOLE_LONGITUDE ) {
            this._setWholeLongitudeRegion();
            return;
        }

        // region の右端が this の左端より右へ移動する。

        // 内包判定
        let right_min_lon = this._calcRightPosition( this._min_lon, region._min_lon );
        const right_max_lon = this._calcRightPosition( this._min_lon, region._max_lon );

        if ( right_min_lon > right_max_lon ) {
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
            if ( this._min_lon <= right_max_lon - 360 ) {
                this._setWholeLongitudeRegion();
            }
            else {
                this._max_lon = right_max_lon;
            }
        }

        // 3.eastのみ内包 -> west拡大
        else if ( max_include ) {
            if ( right_min_lon + 360 <= this._max_lon ) {
                this._setWholeLongitudeRegion();
            }
            else {
                this._min_lon = right_min_lon;
            }
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
        if ( this.is_empty ) { return null; }
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
        if ( this.is_empty ) { return null; }
        return new GeoPoint( this._min_lon, this._min_lat, this._min_alt );
    }


    /**
     * NorthEastのGeopointを返却
     *
     * @return  北東(max)のGeoPoint
     */
    getNorthEast(): GeoPoint | null
    {
        if ( this.is_empty ) { return null; }
        return new GeoPoint( this._max_lon, this._max_lat, this._max_alt );
    }


    /**
     * 中心位置のGeopointを返却
     *
     * @return  中心(center)のGeoPoint
     */
    getCenter(): GeoPoint | null
    {
        if ( this.is_empty ) { return null; }
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


/**
 * 領域の状態を表す。
 * @internal
 */
const enum Status {

    /**
     * 空間が空であることを示します
     */
    EMPTY = "@@_GeoRegion.Status.EMPTY",

    /**
     * 空間が経度方向に部分的な空間であることを示します
     */
    PARTIAL = "@@_GeoRegion.Status.PARTIAL",

    /**
     * 空間が経度方向に全空間であることを示します。
     * この状態の GeoRegion にいかなる点や空間を拡張や結合しても経度方向の領域は変化しません。
     */
    WHOLE_LONGITUDE = "@@_GeoRegion.Status.WHOLE_LONGITUDE",
}


namespace GeoRegion {


export type RegionData2D = [west: number, south: number, east: number, north: number];
export type RegionData3D = [west: number, south: number, min_alt: number, east: number, north: number, max_alt: number];



} // namespace GeoRegion



export default GeoRegion;
