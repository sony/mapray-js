Tester App
================================================================================


Setup
--------------------------------------------------------------------------------
### Setup tokens
mapray access token(`MAPRAY_API_KEY`) needs to be defined.

**To set access token:**

To see the terrian data, you need a [Mapray access token](/doc/developer-guide/GettingStarted/index.md). You can either set an environment variable:

```bash
export MAPRAY_API_KEY=<mapray_access_token>
```

Or set access token to `process.env.MAPRAY_API_KEY` directly in `App.ts`.


### Setup dependencies
`yarn` to install dependencies


Launch
--------------------------------------------------------------------------------
- `yarn start` to start watch and server
- `yarn build` to build in production mode


