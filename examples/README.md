# maprayJS Examples
maprayJS examples work independently in each directory. Depending on the sample content, you may be able to load it into a browser and run it directly, 
or you need to set it up in advance with `yarn` or `npm`. Check each directory.
All the samples assume that you are downloading terrain data from the Mapray Cloud, so you need an access token to the Mapray Cloud.
Afeter getting it, you need to replace below **\<your access token here\>** in each sample with your access token.

```
const accessToken = "<your access token here>";
```

## Examples Catalog

### [Animation](./animation)
There are various animation examples. maprayJS has a powerful animation engine. You can take advantage of the pre-built core libraries or customize them yourself.
Please check the [ReadME](./animation/README.md) in the future.

### [Camera](./camera)
There are examples of how to use the camera. In 3D computer graphics, the operation of the camera is a bit complicated. In maprayJS, you can use the core library to program highly flexible camera operations, or the ui library to let the engine handle complex camera operations.

### [Input](./input)
An example using the ability to access data interactively.

### [Layer](./layer)
There are an examples of superimposing map data on the base map using the layer function. This is an example of the layer function based mainly on images.

### [Entity](./Entity)
There are examples of an Entity feature that lets you display markers, icons, 3D models and more on a 3D map. You can also use GeoJSON to work with multiple entities together.
