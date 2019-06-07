import Viewer from "./Viewer";
import Camera from "./Camera";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import Orientation from "./Orientation";
import Ray from "./Ray";
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
import TextEntity from "./TextEntity";
import SceneLoader from "./SceneLoader";
import DebugStats from "./DebugStats";


/**
 * Mapray 関連の機能全体が含まれる名前空間
 * @namespace mapray
 */
var mapray = {
    Viewer: Viewer,
    Camera: Camera,
    GeoMath: GeoMath,
    GeoPoint: GeoPoint,
    Orientation: Orientation,
    Ray: Ray,
    CredentialMode: CredentialMode,
    Layer: Layer,
    LayerCollection: LayerCollection,
    DemProvider: DemProvider,
    StandardDemProvider: StandardDemProvider,
    CloudDemProvider: CloudDemProvider,
    ImageProvider: ImageProvider,
    RenderCallback: RenderCallback,
    StandardImageProvider: StandardImageProvider,
    Scene: Scene,
    Entity: Entity,
    MarkerLineEntity, MarkerLineEntity,
    TextEntity, TextEntity,
    SceneLoader, SceneLoader,
    DebugStats: DebugStats
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
