import animation from "./animation/index";
import Viewer from "./Viewer";
import Camera from "./Camera";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import Orientation from "./Orientation";
import Ray from "./Ray";
import AltitudeMode from "./AltitudeMode";
import CredentialMode from "./CredentialMode";
import Layer from "./Layer";
import LayerCollection from "./LayerCollection";
import DemProvider from "./DemProvider";
import StandardDemProvider from "./StandardDemProvider";
import CloudDemProvider from "./CloudDemProvider";
import ImageProvider from "./ImageProvider";
import RenderCallback from "./RenderCallback";
import StandardImageProvider from "./StandardImageProvider";
import Scene from "./Scene";
import Entity from "./Entity";
import MarkerLineEntity from "./MarkerLineEntity";
import PathEntity from "./PathEntity";
import TextEntity from "./TextEntity";
import ModelEntity from "./ModelEntity";
import PolygonEntity from "./PolygonEntity";
import PinEntity from "./PinEntity";
import ImageIconEntity from "./ImageIconEntity"
import SceneLoader from "./SceneLoader";
import GeoJSONLoader from "./GeoJSONLoader";
import DebugStats from "./DebugStats";
import MaprayApi from "./MaprayApi";
import PointCloud from "./PointCloud";
import RawPointCloudProvider from "./RawPointCloudProvider";
import Resource, { URLResource } from "./Resource";

// マウス・Attribution開発
import LogoController from "./LogoController";
import AttributionController from "./AttributionController";

/**
 * Mapray 関連の機能全体が含まれる名前空間
 * @namespace mapray
 */
var mapray = {
    animation,
    Viewer,
    Camera,
    GeoMath,
    GeoPoint,
    Orientation,
    Ray,
    AltitudeMode,
    CredentialMode,
    Layer,
    LayerCollection,
    DemProvider,
    StandardDemProvider,
    CloudDemProvider,
    ImageProvider,
    RenderCallback,
    StandardImageProvider,
    Scene,
    Entity,
    MarkerLineEntity,
    PathEntity,
    TextEntity,
    ModelEntity,
    PolygonEntity,
    PinEntity,
    ImageIconEntity,
    SceneLoader,
    GeoJSONLoader,
    Resource,
    URLResource,
    MaprayApi,
    DebugStats,
    PointCloud,
    RawPointCloudProvider,
    LogoController,          // マウス・Attribution開発
    AttributionController    // マウス・Attribution開発
};


// 互換関数を登録
{
    /* requestAnimationFrame 互換関数
     * @param {function} callback
     * @return {number} requestID
     * @see https://developer.mozilla.org/ja/docs/Web/API/Window/requestAnimationFrame
     */
    window.maprayRequestAnimationFrame =
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame;


    /* cancelAnimationFrame 互換関数
     * @param {number} requestID
     * @see https://developer.mozilla.org/ja/docs/Web/API/window/cancelAnimationFrame
     */
    window.maprayCancelAnimationFrame =
        window.cancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.oCancelAnimationFrame;

    /* Performance.now 互換関数
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
     */
    var perf = window.performance;
    var now  = perf && (perf.now || perf.mozNow || perf.msNow || perf.oNow || perf.webkitNow);
    var date = new Date();
    window.maprayNow = now ? (function () { return now.call( perf ); }) : (function () { return date.getTime(); });

    /* Math.log2 互換関数
     * @function Math.maprayLog2
     * @see https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/log2
     */
    Math.maprayLog2 = Math.log2 || function( x ) { return 1.4426950408889634074 * Math.log( x ); };
}


export default mapray;
