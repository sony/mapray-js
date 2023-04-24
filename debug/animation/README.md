Animation Example
================================================================================


Setup
--------------------------------------------------------------------------------
### Setup tokens
mapray access token(`MAPRAY_ACCESS_TOKEN`) and bing map access token(`BINGMAP_ACCESS_TOKEN`) needs to be defined.

**To set access token:**

To see the terrian data, you need a [Mapray access token](https://mapray.com/documents/overview/token/index.html). You can either set an environment variable:

```bash
export MAPRAY_ACCESS_TOKEN=<mapray_access_token>
```

Or set access token to `process.env.MAPRAY_ACCESS_TOKEN` directly in `App.ts`.


**To set bing map access token (Option):**

To see Bing Maps Imagery, you need a Bing Maps access token. 
Before set access token in Rumber you should get [Bing Maps Access Token](https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key) yourself.
You can either set an environment variable:
```bash
export BINGMAP_ACCESS_TOKEN=<bingmap_access_token>
```

Or set token to `process.env.BINGMAP_ACCESS_TOKEN` directly in `App.ts`.


### Setup dependencies
`yarn` to install dependencies


Launch
--------------------------------------------------------------------------------
- `yarn start` to start watch and server
- `yarn build-prod` to build in production mode


Key binding
--------------------------------------------------------------------------------
### Animation select
1: Keyframe Linear Animation

2: Keyframe Step Animation

3: Simple Curve Animation

4: Easy Binding Animation

5: StandardUIViewer.startFlyCamera()
