# maprayJS dataset view
This is a basic dataset view application.

## Preparing your Development Environment
Install [node.js](https://nodejs.org/)
```bash
brew install node
```
or

Install [yarn](https://yarnpkg.com/en/)
```bash
brew install yarn
```

Build debug/debug-common
This application uses debug/debug-common module.
You need build debug/debug-common before build this application.
See the debug/debug-common README and build it. 


## Usage
**To set access token:**

To see the terrian data, you need a [Mapray access token](/doc/developer-guide/GettingStarted/index.md). You can either set an environment variable:

```bash
export MAPRAY_ACCESS_TOKEN=<mapray_access_token>
```

Or set accsess token to `<your access token here>` directly in `DatasetView.ts`.


**To set bing map access token (Option):**

To see Bing Maps Imagery, you need a Bing Maps access token. 
Before set access token in Rumber you should get [Bing Maps Access Token](https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key) yourself.
You can either set an environment variable:
```bash
export BINGMAP_ACCESS_TOKEN=<bingmap_access_token>
```

Or set accsess token to `<your Bing Maps Key here>` directly in `DatasetView.ts`.


**To set user id:**

To use the dataset, you need a [Mapray API user id ](/doc/developer-guide/Account/index.md). You can either set an environment variable:

```bash
export MAPRAY_API_USER_ID=<your user id>
```
const MAPRAY_API_USER_ID = "<your user id>";
const DATASET_2D_ID = "<2d dataset id>";
const DATASET_3D_ID = "<3d dataset id>";
const DATASET_POINT_CLOUD_ID = "<point cloud dataset id>";

Or set accsess token to `<your user id>` directly in `DatasetView.ts`.


**To set user dataset id:**

To use the dataset, you need a [Dataset id ](/doc/developer-guide/ConnectMaprayCloud-2D/index.md). You can either set an environment variable:

```bash
export DATASET_2D_ID = <2d dataset id>;
export DATASET_3D_ID = <3d dataset id>;
export DATASET_POINT_CLOUD_ID = <point cloud dataset id>;
```

Or set accsess token to `<2d/3d/pointcloud dataset id>` directly in `DatasetView.ts`.


**To install dependencies:**

```bash
npm install
# or
yarn
```

**Key binding:**

g: Toggle Dataset Visible
1: View 2D debug UI
2: View 3D debug UI
3: View PointCloud debug UI
4: View B3d debug UI
5: View Atmosphere debug UI
9: View PointCloud ans B3d debug UI
0: Close debug UI
p: capture mapray canvas


**Commands:**
* `npm start` is the development target, to serves the app and hot reload.
* `npm run build` is the production target, to create the final bundle and write to disk.
* `npm run dev` is the target for developing mapray and ui packages, to include mapray packages from local modules to write to disk.

[http://localhost:7776/apps/local/index-umd.html](http://localhost:7776/apps/local/index-umd.html)
