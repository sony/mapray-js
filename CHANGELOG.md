# Change Log
## 0.9.1
### Features and improvements
- WebGL2 Support [#247](https://github.com/sony/mapray-js/issues/247)
- Added functionality to measure processing time information for point cloud loading [#248](https://github.com/sony/mapray-js/issues/248)
- Web Mercator projection does not support drawing of Arctic and Antarctic regions [#249](https://github.com/sony/mapray-js/issues/249)
- Add PinEntity and ImageIconEntity to Mapray's Scene definition [#251](https://github.com/sony/mapray-js/issues/251)
- Add REST API to access Mapray Cloud Scene data in Mapray Cloud API [#252](https://github.com/sony/mapray-js/issues/252)
- Add new mathematical operations to the GeoMath class [#254](https://github.com/sony/mapray-js/issues/254)
- Make Material class public API and add support for integer uniform parameters [#253](https://github.com/sony/mapray-js/issues/253)
- Add ability to specify elevation and maximum level in FlatDemProvider[#255](https://github.com/sony/mapray-js/issues/255)
- Add API to toggle visibility of point clouds and B3D models and standardize their formats [#256](https://github.com/sony/mapray-js/issues/256)
- Add the ability to click on B3D models and retrieve their unique IDs via API [#257](https://github.com/sony/mapray-js/issues/257)
- Update build-related development tools [#258](https://github.com/sony/mapray-js/issues/258)
- Convert remaining JavaScript code to TypeScript [#264](https://github.com/sony/mapray-js/issues/264)
- Refactoring [#266](https://github.com/sony/mapray-js/issues/266)
- Improve the Debug App [#267](https://github.com/sony/mapray-js/issues/267)
- Add an Example for ImageIconEntity [#268](https://github.com/sony/mapray-js/issues/268)
- Change default branch name to main [#272](https://github.com/sony/mapray-js/issues/272)

### Breaking Changes
- Added/fixed the features to specify elevation and maximum level to FlatDemProvider
- Pick function interface unification

### Bug fix
- Improved timing to update URL hash [#237](https://github.com/sony/mapray-js/issues/237)
- Dragging near the poles in software is not intuitive [#250](https://github.com/sony/mapray-js/issues/250)
- Fix Clamp Calculation Bug in LineEntity [#259](https://github.com/sony/mapray-js/issues/259)
- URLHash update process [#260](https://github.com/sony/mapray-js/issues/260)
- Enabling CloudVisualize causes B3D to disappear [#261](https://github.com/sony/mapray-js/issues/261)
- visibility:false option not being applied when adding layers [#262](https://github.com/sony/mapray-js/issues/262)
- Camera does not animate when time parameter is set to 0 [#263](https://github.com/sony/mapray-js/issues/263)

## 0.9.0
### Features and improvements
- Improve b3dtiles, building data　[#177](https://github.com/sony/mapray-js/issues/177)
- Support texture in b3dtiles [#185](https://github.com/sony/mapray-js/issues/185)
- Add select and pick functions for point cloud [#230](https://github.com/sony/mapray-js/issues/230)
- Change the language used from ES6 to Typescript [#227](https://github.com/sony/mapray-js/issues/227)
- Add atmospheric expression [#186](https://github.com/sony/mapray-js/issues/186)
- Add new data visualization method for cloud in the sky [#225](https://github.com/sony/mapray-js/issues/225)
- Support star and moon in the night sky [#226](https://github.com/sony/mapray-js/issues/226)
- Support Mapray Cloud API for v2 [#224](https://github.com/sony/mapray-js/issues/224)
- Add new example and debug applications [#229](https://github.com/sony/mapray-js/issues/229)
### Breaking Changes
- The old b3dtiles format in the prototype can no longer be loaded because b3dtiles has been updated to the latest format.
### Bug fix
- Set default url for Mapray Cloud [#213](https://github.com/sony/mapray-js/issues/213)
- 
## 0.8.8
### Bug fix
- Exported FlatDemProvider [#207](https://github.com/sony/mapray-js/issues/207), [#210](https://github.com/sony/mapray-js/pull/210)

## 0.8.7
### Features and improvements
- Flat terrain at zero altitude [#202](https://github.com/sony/mapray-js/issues/202), [#203](https://github.com/sony/mapray-js/pull/203)
- Change visibility of entity and ground in UI Package [#205](https://github.com/sony/mapray-js/issues/205), [#206](https://github.com/sony/mapray-js/pull/206)
- Add GOCS_MATRIX transform mode to ModelEntity [#201](https://github.com/sony/mapray-js/pull/201)

## 0.8.6
### Features
- Night imagey layer [#193](https://github.com/sony/mapray-js/issues/193), [#194](https://github.com/sony/mapray-js/pull/194)
- Capturing image buffer [#192](https://github.com/sony/mapray-js/issues/192), [#194](https://github.com/sony/mapray-js/pull/194)

### Improved
- Modified shader code in the surface [#196](https://github.com/sony/mapray-js/issues/196)

### Bug fix
- Fixed incorrect package name issues [#172](https://github.com/sony/mapray-js/issues/172), [#173](https://github.com/sony/mapray-js/issues/173), [#174](https://github.com/sony/mapray-js/pull/174)
- Fixed incorrect link in documents [#175](https://github.com/sony/mapray-js/issues/175), [#176](https://github.com/sony/mapray-js/pull/176)
- Fixed build error when generating API documents [#178](https://github.com/sony/mapray-js/issues/178), [#179](https://github.com/sony/mapray-js/pull/179)
- Fixed CI build error in loal build [183](https://github.com/sony/mapray-js/issues/183)
  
## 0.8.5
### Features
- Implement bounding box from entities [#166](https://github.com/sony/mapray-js/issues/166), [#167](https://github.com/sony/mapray-js/pull/167)
- Sample code for animation [#142](https://github.com/sony/mapray-js/issues/142) 

### Bug fix
- Fixed histroy stack is filled with mapray's URL [#168](https://github.com/sony/mapray-js/issues/168), [#169](https://github.com/sony/mapray-js/pull/169)

## 0.8.4
### Features
- Implement mouse event for each entities [#105](https://github.com/sony/mapray-js/issues/105), [#132](https://github.com/sony/mapray-js/pull/132)
- Support overlay entity[#145](https://github.com/sony/mapray-js/issues/145)
- compute geographical distance between two GePoints[#152](https://github.com/sony/mapray-js/issues/152), [#155](https://github.com/sony/mapray-js/pull/155)
- Supported smoothly changing camera position and roration[#153](https://github.com/sony/mapray-js/issues/153), [#155](https://github.com/sony/mapray-js/pull/155)
- Supported to set position and rotation of camera on URL [#154](https://github.com/sony/mapray-js/issues/154), [#155](https://github.com/sony/mapray-js/pull/155)

### Improved
- Refactor classes which related to resource[#146](https://github.com/sony/mapray-js/issues/146)
- Upatate the style for jsdoc[#159](https://github.com/sony/mapray-js/issues/159),  [#158](https://github.com/sony/mapray-js/pull/158)
- Modified stroke of TextEntity[#160](https://github.com/sony/mapray-js/issues/160),  [#161](https://github.com/sony/mapray-js/pull/161)

### Bug fix
- Animation isn't working with sigle KFLCorve[#144](https://github.com/sony/mapray-js/issues/144),[#143](https://github.com/sony/mapray-js/pull/143)
- Couldn't rebind EasyBindingBlock [#149](https://github.com/sony/mapray-js/issues/149), [#150](https://github.com/sony/mapray-js/pull/150)
- bugfix of depth hit test of anchor object [#156](https://github.com/sony/mapray-js/issues/156),  [#157](https://github.com/sony/mapray-js/pull/157)

## 0.8.3
### Bug fix
- material for flake will not be loaded [#139](https://github.com/sony/mapray-js/issues/139), [#138](https://github.com/sony/mapray-js/pull/138)
## 0.8.2
### Features
- Support Animation in each entity and added path entity[#106](https://github.com/sony/mapray-js/issues/106), [#126](https://github.com/sony/mapray-js/pull/126)
- Support Point Cloud [#127](https://github.com/sony/mapray-js/issues/127),  [#130](https://github.com/sony/mapray-js/pull/130)

### Improved
- Improved operation of mouse zoom  [#119](https://github.com/sony/mapray-js/issues/119), [#118](https://github.com/sony/mapray-js/pull/118)

### Bug fix
- Fixed the bug in event handlers [#120](https://github.com/sony/mapray-js/issues/120), [#133](https://github.com/sony/mapray-js/issues/133), [#121](https://github.com/sony/mapray-js/pull/121), [#123](https://github.com/sony/mapray-js/pull/123), [#134](https://github.com/sony/mapray-js/pull/134)

## 0.8.1
- Support glTF KHR_materials_unlit[#115](https://github.com/sony/mapray-js/issues/115), [#112](https://github.com/sony/mapray-js/pull/112)
- Delete non-required packages and add required packages[#113](https://github.com/sony/mapray-js/issues/113), [#114](https://github.com/sony/mapray-js/issues/114)
- Modify includiing modules when build dev mode [#116](https://github.com/sony/mapray-js/issues/116)

## 0.8.0
- Build the foundation of the animation engine [#101](https://github.com/sony/mapray-js/pull/101)
- Modulized maprayJS and ui packages [#107](https://github.com/sony/mapray-js/pull/107)

## 0.7.3
- fixed that glTF rendering is black and nolighting [#97](https://github.com/sony/mapray-js/issues/97)

## 0.7.2
### Bug fix
- fixed deployment error for npmcom [#89](https://github.com/sony/mapray-js/pull/89)

## 0.7.1
### Features
- Support ClampTpTerrian mode for all entities [#60](https://github.com/sony/mapray-js/issues/60)
- Support altitude mode and extruded mode for GeoJSON Loader [#63](https://github.com/sony/mapray-js/issues/63), [#69](https://github.com/sony/mapray-js/issues/69)
- Add attribution controller [#85](https://github.com/sony/mapray-js/issues/85)
- Organize copyright notices [#86](https://github.com/sony/mapray-js/issues/86)
- Add UI Engine [#78](https://github.com/sony/mapray-js/issues/78) [#82](https://github.com/sony/mapray-js/issues/82)
- Support Text stroke and background color in TextEntity [#72](https://github.com/sony/mapray-js/issues/72)
- Update Examples and tutorials [#65](https://github.com/sony/mapray-js/issues/65), [#68](https://github.com/sony/mapray-js/issues/68) [#70](https://github.com/sony/mapray-js/issues/70)
- Add CSS files and support to generate css file [#84](https://github.com/sony/mapray-js/issues/84)


### Bug fix
- [#67](https://github.com/sony/mapray-js/issues/67)
- [#74](https://github.com/sony/mapray-js/issues/74)
- [#75](https://github.com/sony/mapray-js/issues/75)
- [#79](https://github.com/sony/mapray-js/issues/79)
- [#80](https://github.com/sony/mapray-js/issues/80)
- [#81](https://github.com/sony/mapray-js/issues/81)

### Breaking Changes
Renamed `height` variable to `altitude` in GeoPoint. 
[#73](https://github.com/sony/mapray-js/issues/73)

## 0.7.0
### Features
- Altitude mode for each entites and schema of scene file [#49](https://github.com/sony/mapray-js/issues/49)
- GeoJSON Loader [#46](https://github.com/sony/mapray-js/issues/46)
- Support Polygon Entity [#35](https://github.com/sony/mapray-js/issues/35)
- Support Pin Entity [#34](https://github.com/sony/mapray-js/issues/34)
- Support ImageIcon Entity [#56](https://github.com/sony/mapray-js/issues/56)
- Support Mapray API [#52](https://github.com/sony/mapray-js/issues/52)
- Support Model entity [#50](https://github.com/sony/mapray-js/issues/50)

### Breaking Changes
- Change the coordination for mapray scene file and API [#50](https://github.com/sony/mapray-js/issues/50)
- Remove Generic Entity [#50](https://github.com/sony/mapray-js/issues/50)

## 0.6.0
### Features
- Added options and methods to specify object visibility in mapray.Viewer
  - Options
    - ground_visibility: Ground visibility
    - entity_visibility: Entity visibility

  - Method
    - setVisibility
    - getVisibility

- Supports loading a glTF model [#18](https://github.com/sony/mapray-js/pull/18)
- Supports new scene graph engine that manages 3D models [#17](https://github.com/sony/mapray-js/pull/17) [#18](https://github.com/sony/mapray-js/pull/18)
- Added method to calculate KML compatible model transformation matrix in mapray.GeoMath [#15](https://github.com/sony/mapray-js/pull/15)
  - kml_model_matrix()
- Add entity class mapray.ModelEntity [#18](https://github.com/sony/mapray-js/pull/18)
- Support rotate and scale to the transform property in mapray scene file [#16](https://github.com/sony/mapray-js/pull/16)
- Added some samples for maprayJS [#10](https://github.com/sony/mapray-js/pull/10)
- Support CI with TravisCI [#23](https://github.com/sony/mapray-js/pull/23)

### Changed
- Remove babel es2015 [#21](https://github.com/sony/mapray-js/pull/21)
- Support error handing in fetch functions [#20](https://github.com/sony/mapray-js/pull/20)

#### Details about changes to the mapray scene file
Rotate (`heading`, `tilt`, `roll`) and scale(`scale`) to the transform property of each entity
You can now optionally specify the properties.

The following is an example specification of the `transform` property.
It rotates 45 degrees to the right and makes the scale 10 times larger.
```
{
  "type": "generic",
  "transform": {
    "cartographic": [139.8, 36.5, 12.3],
    "heading": 45,
    "scale": [10, 10, 10]
  },
  ...
}
```

Added entity type corresponding to mapray.ModelEntity.
When using this type, specify *model* for the `type` property.

Refers to a model object registered in `model_register` by the `ref_model` property.

If there are multiple models in the referenced model object, you can use integers or names in `index`
It can be selected by specifying.

```
"model_register": {
  "model-x": {
    "link": "models/model-x.gltf",
    "offset_transform": { "heading": 180, "tilt": -90 }
  },
  ...
},

"entity_list": [
  {
    "type": "model",
    "transform": { "cartographic": [140.0, 35, 0], "heading": 180 },
    "ref_model": "model-x"
  },
  {
    "type": "model",
    "transform": { "cartographic": [140.1, 35, 0], "scale": 2.5 },
    "ref_model": "model-x",
    "index": 3
  },
  {
    "type": "model",
    "transform": { "cartographic": [140.2, 35, 0] },
    "ref_model": "model-x",
    "index": "scene-name-x"
  },
  ...
]
```


## 0.5.1
### Features
- Published to [npm.com](https://www.npmjs.com/package/mapray-js)


## 0.5.0
- Published as open source software
- Supports layering of image provider

### Changed
- Renamed Inou to maprayJS


## 0.4.2

### Features
- Add new application nextRambler to access the cloud


## 0.4.1

### Bug fixed
- Fixed the issue with texture cache not being reduced (Occurred in Version 0.4.0).
- Fixed the issue that the `div` tag in rambler.html was not closed.


## 0.4.0

### Features
- Added destroy () method to destroy Inou.Viewer instance.


## 0.3.1

### Features
- Added Inou Content Developer Guide in `doc/InouDeveloperGuide.md`
- Added sample source code `Turning`

### Fixed
- Fixed the issue that Inou.TextEntity method was private 
- Fixed the issue that Inou.GenericEntity # setTransform () was not implemented


## 0.3.0

### Features

- Added the function to get the intersection of ray and ground
  - Inou.Ray
  - Inou.Viewer#getRayIntersection()
- Added the method to get transformation matrix to camera
  - Inou.Camera#getCanvasToView()
  - Inou.Camera#getCanvasToGocs()
  - Inou.Camera#getViewToCanvas()
- Added the method to get rays to the camera
  - Inou.Camera#getCanvasRay()
- Merged Inou.DemBinary and Inou.FlakeMesh cache into Inou.Globe

- Rambler
  - Added camera move operation with dragging
  - Changed camera rotation operation from Drag to Ctrl + Drag
  - Supports Microsoft Edge


## 0.2.0

### Features

- Changed Inou.DemProvider of the DEM data provider from the abstract class to public class 
  - Added an option of dem_provider to Inou.Viewer constructor
  - Added property of dem_provider to the Inou.Viewer instance
  - Added implementation class Inou.StandardDemProvider of standard DEM data provider

### Changed

- The interface of Inou.ImageProvider has been changed due to the change of Inou.DemProvider
  - Added method
    - ImageProvider#requestTile( z, x, y, callback )
    - ImageProvider#cancelRequest( id )
  - Deleted method
    - ImageProvider#getTileAddress( z, x, y )


## 0.1.0

### Features

- Packaged inou engine to npm package
- Added Text Entity

### Changed
- The scene schema of MarkerL
