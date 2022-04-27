# Example: Point Cloud
This is a demo application of the point cloud function using Mapray.

## Setup your Development Environment
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

To see the terrian data, you need a [Mapray access token](/doc/developer-guide/GettingStarted/index.md). You can either set an environment variable:

```bash
export MAPRAY_ACCESS_TOKEN=<mapray_access_token>
```

Or set access token to `process.env.MAPRAY_ACCESS_TOKEN` directly in [PointCloudTileViewer.ts](./src/PointCloudTileViewer.ts).


**To install dependencies:**

```bash
npm install
# or
yarn
```

**Commands:**
* `npm start` is the development target, to serves the app and hot reload.
* `npm run build` is the production target, to create the final bundle and write to disk.

[http://localhost:7776](http://localhost:7776)
