# Change Log
## 0.8.5
### Added
- Implement bounding box from entities [#166](https://github.com/sony/mapray-js/issues/166), [#167](https://github.com/sony/mapray-js/pull/167)
- Sample code for animation [#142](https://github.com/sony/mapray-js/issues/142) 

### Bug fix
- Fixed histroy stack is filled with mapray's URL [#168](https://github.com/sony/mapray-js/issues/168), [#169](https://github.com/sony/mapray-js/pull/169)

## 0.8.4
### Added
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
### Added
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
### Added
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

### Breaking change
Renamed `height` variable to `altitude` in GeoPoint. 
[#73](https://github.com/sony/mapray-js/issues/73)

## 0.7.0
### Added
- Altitude mode for each entites and schema of scene file [#49](https://github.com/sony/mapray-js/issues/49)
- GeoJSON Loader [#46](https://github.com/sony/mapray-js/issues/46)
- Support Polygon Entity [#35](https://github.com/sony/mapray-js/issues/35)
- Support Pin Entity [#34](https://github.com/sony/mapray-js/issues/34)
- Support ImageIcon Entity [#56](https://github.com/sony/mapray-js/issues/56)
- Support Mapray API [#52](https://github.com/sony/mapray-js/issues/52)
- Support Model entity [#50](https://github.com/sony/mapray-js/issues/50)

### Breaking changes
- Change the coordination for mapray scene file and API [#50](https://github.com/sony/mapray-js/issues/50)
- Remove Generic Entity [#50](https://github.com/sony/mapray-js/issues/50)

## 0.6.0
### Added
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
### Added
- Published to [npm.com](https://www.npmjs.com/package/mapray-js)


## 0.5.0
- Published as open source software
- Supports layering of image provider

### Changed
- Renamed Inou to maprayJS


## 0.4.2

### Added
- Add new application nextRambler to access the cloud


## 0.4.1

### Fixed
- Fixed the issue with texture cache not being reduced (Occurred in Version 0.4.0).
- Fixed the issue that the `div` tag in rambler.html was not closed.


## 0.4.0

### Added
- Added destroy () method to destroy Inou.Viewer instance.


## 0.3.1

### Added
- Added Inou Content Developer Guide in `doc/InouDeveloperGuide.md`
- Added sample source code `Turning`

### Fixed
- Fixed the issue that Inou.TextEntity method was private 
- Fixed the issue that Inou.GenericEntity # setTransform () was not implemented


## 0.3.0

### Added

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

### Added

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

### Added

- Packaged inou engine to npm package
- Added Text Entity

### Changed
- The scene schema of MarkerL
