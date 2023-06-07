ESM sample
================================================================================


Setup
--------------------------------------------------------------------------------
### Setup tokens
mapray access token(`MAPRAY_ACCESS_TOKEN`) needs to be defined.

**To set access token:**

To see the terrian data, you need a [Mapray access token](/doc/developer-guide/GettingStarted/index.md). You can either set an environment variable:

```bash
export MAPRAY_ACCESS_TOKEN=<mapray_access_token>
```

Or set access token to `process.env.MAPRAY_ACCESS_TOKEN` directly in `App.js`.

### Setup dependencies
`yarn` to install dependencies

Build
--------------------------------------------------------------------------------
`yarn run build` to build the app.

Launch
--------------------------------------------------------------------------------
`yarn start` to start watch and server. Open `localhost:7776` to view the app.
