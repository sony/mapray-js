export * as animation from "./animation/";

export { default as GeoMath } from "./GeoMath";
export { default as GeoPoint } from "./GeoPoint";
export { default as GeoRegion } from "./GeoRegion";
export { default as Orientation } from "./Orientation";

export { default as Viewer } from "./Viewer";
export { default as Camera } from "./Camera";
export { default as Scene } from "./Scene";
export { default as RenderCallback } from "./RenderCallback";

export { default as Ray } from "./Ray";
export { default as AltitudeMode } from "./AltitudeMode";
export { default as CredentialMode } from "./CredentialMode";
export { default as DebugStats } from "./DebugStats";

export { default as Layer } from "./Layer";
export { default as LayerCollection } from "./LayerCollection";

// Dem Provider
export { default as DemProvider } from "./DemProvider";
export { default as StandardDemProvider } from "./StandardDemProvider";
export { default as CloudDemProvider } from "./CloudDemProvider";

// Image Provider
export { default as ImageProvider } from "./ImageProvider";
export { default as StandardImageProvider } from "./StandardImageProvider";

// Entity
export { default as Entity } from "./Entity";
export { default as MarkerLineEntity } from "./MarkerLineEntity";
export { default as PathEntity } from "./PathEntity";
export { default as TextEntity } from "./TextEntity";
export { default as ModelEntity } from "./ModelEntity";
export { default as PolygonEntity } from "./PolygonEntity";
export { default as PinEntity } from "./PinEntity";
export { default as ImageIconEntity } from "./ImageIconEntity"

// Loader
export { default as SceneLoader } from "./SceneLoader";
export { default as GeoJSONLoader } from "./GeoJSONLoader";

export { default as MaprayApi } from "./MaprayApi";

// PointCloud
export { default as PointCloud } from "./PointCloud";
export { default as RawPointCloudProvider } from "./RawPointCloudProvider";

export { default as Resource, URLResource } from "./Resource";

// マウス・Attribution開発
export { default as  LogoController } from "./LogoController";
export { default as  AttributionController } from "./AttributionController";



// 互換関数を登録
{
    /* requestAnimationFrame 互換関数
     * @param {function} callback
     * @return {number} requestID
     * @see https://developer.mozilla.org/ja/docs/Web/API/Window/requestAnimationFrame
     */
    // @ts-ignore
    window.maprayRequestAnimationFrame =
        // @ts-ignore
        window.requestAnimationFrame ||
        // @ts-ignore
        window.webkitRequestAnimationFrame ||
        // @ts-ignore
        window.mozRequestAnimationFrame ||
        // @ts-ignore
        window.oRequestAnimationFrame;


    /* cancelAnimationFrame 互換関数
     * @param {number} requestID
     * @see https://developer.mozilla.org/ja/docs/Web/API/window/cancelAnimationFrame
     */
    // @ts-ignore
    window.maprayCancelAnimationFrame =
        // @ts-ignore
        window.cancelAnimationFrame ||
        // @ts-ignore
        window.webkitCancelAnimationFrame ||
        // @ts-ignore
        window.mozCancelAnimationFrame ||
        // @ts-ignore
        window.oCancelAnimationFrame;

    /* Performance.now 互換関数
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
     */
    var perf = window.performance;
    // @ts-ignore
    var now  = perf && (perf.now || perf.mozNow || perf.msNow || perf.oNow || perf.webkitNow);
    var date = new Date();
    // @ts-ignore
    window.maprayNow = now ? (function () { return now.call( perf ); }) : (function () { return date.getTime(); });

    /* Math.log2 互換関数
     * @function Math.maprayLog2
     * @see https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/log2
     */
    // @ts-ignore
    Math.maprayLog2 = Math.log2 || function( x ) { return 1.4426950408889634074 * Math.log( x ); };
}
