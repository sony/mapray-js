# mapray-js  Rambler (ES modules version)
This is a demo application with interactive mouse operation on [Mapray](https://mapray.com) website.

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

### Set access token

To see the terrian data, you need a [Mapray access token](/doc/developer-guide/GettingStarted/index.md). You can either set an environment variable:

```bash
export MAPRAY_ACCESS_TOKEN=<mapray_access_token>
```

Or set accsess token to `<your access token here>` directly in `NextRambler.js`.


### Set bing map access token (Optional)

To see Bing Maps Imagery, you need a Bing Maps access token. 
Before set access token in Rumber you should get [Bing Maps Access Token](https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key) yourself.
You can either set an environment variable:
```bash
export BINGMAP_ACCESS_TOKEN=<bingmap_access_token>
```

Or set accsess token to `<your Bing Maps Key here>` directly in `NextRambler.js`.


### Install dependencies

```bash
npm install
# or
yarn
```

### Commands
- `npm start` is the development target, to serves the app and hot reload.
- `npm run build-prod` is the production target, to create the final bundle and write to disk.
