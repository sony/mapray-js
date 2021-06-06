/**
 * ## Mapray Core Library
 *
 * ### Module
 *
 * ```js
 * import mapray from "@mapray/mapray-js";
 *
 * const point = new mapray.GeoPoint();
 * // ...
 * ```
 * 
 * ### CDN
 * HTML
 * ```html
 * <script src="https://resource.mapray.com/mapray-js/v0.8.5/mapray.js"></script>
 * ```
 *
 * JavaScript
 * ```js
 * const point = new mapray.GeoPoint();
 * // ...
 * ```
 *
 */
export { default as mapray } from "./packages/mapray/src/mapray";


/**
 * ## Mapray UI Library
 *
 * ### Module
 *
 * ```js
 * import mapray from "@mapray/mapray-js";
 * import maprayui from "@mapray/ui";
 *
 * const point = new mapray.GeoPoint();
 * const stdViewer = new maprayui.StandardUIViewer( node, ACCESS_TOKEN );
 * // ...
 * ```
 * 
 * ### CDN
 * HTML
 * ```html
 * <script src="https://resource.mapray.com/mapray-js/v0.8.8/mapray.js"></script>
 * <script src="https://resource.mapray.com/ui/v0.8.8/maprayui.js"></script>
 * ```
 *
 * JavaScript
 * ```js
 * const point = new mapray.GeoPoint();
 * const stdViewer = new maprayui.StandardUIViewer( node, ACCESS_TOKEN );
 * // ...
 * ```
 *
 */
export { default as maprayui } from "./packages/ui/src/maprayui";
