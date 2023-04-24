# Point Cloud Viewer 
This is a point cloud demo application.

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

## Usage
**To set access token:**

To see the terrian data, you need a [Mapray access token](https://mapray.com/documents/overview/token/index.html). You can either set an environment variable:

```bash
export MAPRAY_ACCESS_TOKEN=<mapray_access_token>
```

Or set access token to `process.env.MAPRAY_ACCESS_TOKEN` directly in `PointCloudViewer.ts`.


**To set bing map access token (Option):**

To see Bing Maps Imagery, you need a Bing Maps access token. 
Before set access token in Rumber you should get [Bing Maps Access Token](https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key) yourself.
You can either set an environment variable:
```bash
export BINGMAP_ACCESS_TOKEN=<bingmap_access_token>
```

Or set token to `process.env.BINGMAP_ACCESS_TOKEN` directly in `PointCloudViewer.ts`.


**To set api key:**

To access the cloud data, you need a [Mapray access token](https://mapray.com/documents/overview/token/index.html). You can either set an environment variable:

```bash
export MAPRAY_API_KEY=<mapray_api_key>
```

Or set api key to `process.env.MAPRAY_API_KEY` directly in `PointCloudViewer.ts`.


**To set user id:**

To use the dataset, you need a [Mapray API user id ](https://mapray.com/documents/overview/account/index.html). You can either set an environment variable:

```bash
export MAPRAY_API_USER_ID=<your user id>
```

Or set user id to `process.env.MAPRAY_API_USER_ID` directly in `PointCloudViewer.ts`.


**To set user dataset id:**

To use the dataset, you need a [Point Cloud Dataset id](https://mapray.com/documents/overview/connectmapraycloud-pc/index.html). You can either set an environment variable:

```bash
export DATASET_POINT_CLOUD_ID = <point cloud dataset id>;
```

Or set dataset id to `process.env.DATASET_POINT_CLOUD_ID` directly in `PointCloudViewer.ts`.


**To install dependencies:**

```bash
npm install
# or
yarn
```

**Commands:**
* `npm start` is the development target, to serves the app and hot reload.
* `npm run build` is the production target, to create the final bundle and write to disk.
* `npm run dev` is the target for developing mapray and ui packages, to include mapray packages from local modules to write to disk.


**Key binding:**

g: Toggle Dataset Visible



[http://localhost:7776/apps/local/index-umd.html](http://localhost:7776/apps/local/index-umd.html)
