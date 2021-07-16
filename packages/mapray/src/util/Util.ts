/**
 * Utility
 * @internal
 */
namespace Util {



/* requestAnimationFrame 互換関数
 * @see https://developer.mozilla.org/ja/docs/Web/API/Window/requestAnimationFrame
 */
export function maprayRequestAnimationFrame( callback: FrameRequestCallback ): number {
    return requestAnimation.call( window, callback );
}


const requestAnimation = (
    // @ts-ignore
    window.requestAnimationFrame ||
    // @ts-ignore
    window.webkitRequestAnimationFrame ||
    // @ts-ignore
    window.mozRequestAnimationFrame ||
    // @ts-ignore
    window.oRequestAnimationFrame
);



/* cancelAnimationFrame 互換関数
 * @see https://developer.mozilla.org/ja/docs/Web/API/window/cancelAnimationFrame
 */
export function maprayCancelAnimationFrame( handle: number ) {
    return cancelAnimationFrame.call( window, handle );
}


const cancelAnimationFrame = (
    // @ts-ignore
    window.cancelAnimationFrame ||
    // @ts-ignore
    window.webkitCancelAnimationFrame ||
    // @ts-ignore
    window.mozCancelAnimationFrame ||
    // @ts-ignore
    window.oCancelAnimationFrame
);



/* Performance.now 互換関数
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
 */
const perf = window.performance;
// @ts-ignore
const now  = perf && (perf.now || perf.mozNow || perf.msNow || perf.oNow || perf.webkitNow);
// @ts-ignore
export const maprayNow = now ? () => now.call( perf ) : () => Date.now();



}



export default Util;
