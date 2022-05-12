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
