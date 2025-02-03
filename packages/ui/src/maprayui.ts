import * as mapray from "./";
export default mapray;

export function hasOwnProperty( key: string ) {
    // @ts-ignore
    return this[key] !== undefined;
}
