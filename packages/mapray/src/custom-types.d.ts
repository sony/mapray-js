// Load shader codes as string

declare module "*.vert" {
  const content: string;
  export default content;
}

declare module "*.frag" {
  const content: string;
  export default content;
}

declare module "*.glsl" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: any;
  export default content;
}

// パッケージ @types/mapbox-gl には style-spec の型宣言は用意されてい
// ないので、空の型宣言で any とする
declare module "mapbox-gl/dist/style-spec/index.es.js";
