Render Phase
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


Launch
--------------------------------------------------------------------------------
- `yarn start` to start watch and server
- `yarn build-prod` to build in production mode


Key binding
--------------------------------------------------------------------------------
### Key binding
g: Toggle Dataset Visible


Access [http://localhost:7776/debug/picking/](http://localhost:7776/debug/picking/).

