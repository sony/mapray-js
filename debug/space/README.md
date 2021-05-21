# SpaceApp based on maprayJS Rambler (ES modules version)
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
### To set access token

To see the terrian data, you need a [Mapray access token](/doc/developer-guide/GettingStarted/index.md). You can either set an environment variable:

```bash
export MAPRAY_ACCESS_TOKEN=<mapray_access_token>
```

Or set accsess token to `<your access token here>` directly in `SpaceApp.js`.


### To set bing map access token (Option)

To see Bing Maps Imagery, you need a Bing Maps access token.
Before set access token in Rumber you should get [Bing Maps Access Token](https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key) yourself.
You can either set an environment variable:
```bash
export BINGMAP_ACCESS_TOKEN=<bingmap_access_token>
```

Or set accsess token to `<your Bing Maps Key here>` directly in `SpaceApp.js`.


### To install dependencies

```bash
npm install
# or
yarn
```



### Commands
There are two modes.
Normal mode will be used to develop the app itself.
@mapray in node_modules will be linked.

Local mode will be used if you want to debug core library such as mapray or maprayui.
@mapray in ../../node_modules will be linked to take in local changes.

** Normal mode **
* `npm start` is the development target, to serves the app and hot reload.
* `npm run build` is the production target, to create the final bundle and write to disk.
(http://0.0.0.0:7776/)

** Local mode **
* `npm run start-local` is the development target, to serves the app and hot reload.
* `npm run local` is the target for developing mapray and ui packages, to include mapray packages from local modules to write to disk.
(http://0.0.0.0:7776/)
