# Mapray JS Examples
Mapray JS examples are in ECMA Script5 and 6.
The simple code uses ES5, while the complex one uses ES6.
Modern browsers support ES6 so it allows you to run code directly in the browser without the transpiling from ES6 to ES5.
All examples use mapray cloud and you need to replace below **\<your access token here\>** in each sample with your access token of mapray cloud.

```
const accessToken = "<your access token here>";
```

## Sample List

| Section  | Summary                              | Detail                                                      | HTML file                           | JavaScript                                        | Scene file |
|----------|--------------------------------------|-------------------------------------------------------------|-------------------------------------|---------------------------------------------------|-------------|
| Camera   | Camera position                      | View Mt. Fuji from Mt. Kitadake                             | LongitudeAndLatitudeCameraPos.html  | -                                                 | -           |
|          | Camera animation                     | Rotate the camera around Mt. Fuji                           | CameraAnimation.html                | CameraAnimation.js                                | -           |
|          |                                      | Changing the angle of view with rotating                    | CameraAnimationVer2.html            | CameraAnimationVer2.js                            | -           |
|          | Set angle of view                    | Set the angle of view to 30 degrees                         | ChangeAngleOfView30.html            | -                                                 | -           |
|          |                                      | Set the angle of view to 60 degrees                         | ChangeAngleOfView60.html            | -                                                 | -           |
|          | Path animation                       | Camera moves along the path                                 | VirtualPathCameraAnimation.html     | VirtualPathCameraAnimation.js                     | -           |
| Input    | Get the geo information              | From around Mt. Fuji, move the viewpoint with mouse operation and check the latitude and longitude| CameraControlWithMouse.html | CameraControlWithMouse.js CheckInputKeyAndMouse.js | - |
|          | Move camera with mouse wheel         |                                                             |                                     |                                                   |             |
|          | Rotate camera with mouse drag        |                                                             |                                     |                                                   |             |
|          | Change atlibute with mouse drag      |                                                             |                                     |                                                   |             |
| Layer    | Show a layer                         | Display the standard map layer                              | AddLayer.html                       | -                                                 | -           |
|          | Dynamically create and delete layers | Add, delete and change transparency of standard map layer from UI  | CreateDeleteLayerChangeOpacity.html | CreateDeleteLayerChangeOpacity.js          | -           |
|          | Change transparency                  |                                                                    |                                     |                                            |             |
|          | Change a tile images                 | Switch the map tile image when UI button is clicked                | ChangeImageTile.html                | ChangeImageTile.js                         | -           |
| Entity/Line  | Add a line entity with SceneLoader | Set the line entity from scene file and API                      | LoadLineScene.html                  | LoadLineScene.js                           | line.json   |
|              | Add a line entity                  | Add a line between Tokyo Imperial Palace and Tokyo Tower         | AddLine.html                        | -                                          | -           |
|              | Change a line color                | Change a line color when UI button is clicked                    | ChangeLineFormat.html               | ChangeLineFormat.js                        | -           |
|              | Change a line width                |                                                                  |                                     |                                            |             |
|              | Line animation                     | Connect the Imperial Palace, Tokyo Tower, Sky Tree, Tokyo Dome with a curve | LineAnimation.html       | LineAnimation.js                           | -           |
| Entity/text  | Add a text entity with SceneLoader | Set the text entity from scene file                              | WriteStringWithSceneLoder.html      | -                                          | font.json   |
|              | Add a text entity                  | Set the text entity with API                                     | WriteStringWithAddText.html         | -                                          | -           |
|              | Change a font style                | Change font style, weight, size, color, font family from button  | ChangeFontFormat.html               | ChangeFontFormat.js                        | -           |
|              | Change a font width                |                                                                  |                                     |                                            |             |
|              | Change a font size                 |                                                                  |                                     |                                            |             |
|              | Change a font color                |                                                                  |                                     |                                            |             |
|              | Change a font family               |                                                                  |                                     |                                            |             |
| Entity/Model | Add a 3D model with SceneLoader    | Display 3D model from SceneLoader                                | Load3DModel.html                    | Load3DModel.js                             | bus.json    |
|              | Move a 3D model                    | Move and rotate a 3D model by the button                         | ModelController.html                | ModelController.js                         | bus.json    |
|              | Animate a 3D model                 | Move along the road around Kyoto Imperial Palace                 | ModelAnimation.html                 | ModelAnimation.js                          | bus.json    |
