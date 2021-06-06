export * as default from "./";

export function hasOwnProperty( key: string ) {
    // @ts-ignore
    return this[key] !== undefined;
}
