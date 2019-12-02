[<p align="center"><img width="400" alt="Mapray" src="https://storage.googleapis.com/ino-sandbox.appspot.com/github/mainlogo.png"></p>](https://mapray.com/)
[![Build Status](https://travis-ci.org/sony/mapray-js.svg?branch=master)](https://travis-ci.org/sony/mapray-js)

maprayJS is a JavaScript library for a high quality interactive 3D globes and map on the web. It is based on WebGL.
[WebSite](https://mapray.com)

[<p align="center"><img src="https://storage.googleapis.com/ino-sandbox.appspot.com/github/fujisan.jpg" /></p>](https://mapray.com/nextRambler.html)

## Installation
### CDN
```html
  <script src="https://resource.mapray.com/mapray-js/v0.7.1/mapray.js"></script>
```

### npm
```bash
npm install --save mapray-js
```

## Usage
World Terrain data hosted by mapray cloud platform. Access Token is required to access to mapray cloud, it is under Closed Alpha Test and is released to a limited number of end-users. 
Mapray cloud managed by [Sony Network Communications Inc.](https://www.sonynetwork.co.jp/corporation/en/) If you have any questions about the access token of mapray cloud or the services of mapray cloud, please contact us from the [contact page](https://mapray.com/contact.html).
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hello Globe</title>
    <script src="https://resource.mapray.com/mapray-js/v0.7.1/mapray.js"></script>
    <link rel="stylesheet" href="https://resource.mapray.com/styles/v1/mapray.css">
</head>
<style>
    html, body {
        height: 100%;
        margin: 0;
    }
    div#mapray-container {
        display: flex;
        height: 100%;
    }
</style>
<body>
    <div id="mapray-container"></div>
</body>
</html>

<script>
     // Set Access Token for mapray cloud
       var accessToken = "<your access token here>";

       // For Image tiles
       var imageProvider = new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 0, 18 );

       // Create viewer
       var viewer = new mapray.Viewer(
           "mapray-container", {
               image_provider: imageProvider,
               dem_provider: new mapray.CloudDemProvider(accessToken)
           }
       );

       // Setting the position of camera
       var home_pos = { longitude: 138.247739, latitude: 35.677604, height: 3000 };

       var home_view_geoPoint = new mapray.GeoPoint( home_pos.longitude, home_pos.latitude, home_pos.height );
       var home_view_to_gocs = home_view_geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );

       var cam_pos = mapray.GeoMath.createVector3( [-3000, 2600, 1000] );
       var cam_end_pos    = mapray.GeoMath.createVector3( [0, 0, 0] );
       var cam_up         = mapray.GeoMath.createVector3( [0, 0, 1] );

       var view_to_home = mapray.GeoMath.createMatrix();
       mapray.GeoMath.lookat_matrix(cam_pos, cam_end_pos, cam_up, view_to_home);

       var view_to_gocs = viewer.camera.view_to_gocs;
       mapray.GeoMath.mul_AA( home_view_to_gocs, view_to_home, view_to_gocs );

       viewer.camera.near = 30;
       viewer.camera.far = 500000;
</script>
```

## Documentation
All documents only support Japanese.
- [Getting started with maprayJS](/doc/developer-guide/GettingStarted.md)
- [Developer Guide](/doc/developer-guide/MaprayDeveloperGuideMod.md)

Documentation on Mapray official [website](https://mapray.com/documents/overview/gettingstarted/index.html)

**API documents**
```bash
npm run jsdoc
```

## License
maprayJS is licensed under the [MIT license](/LICENSE).
