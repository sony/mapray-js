Mouse Pick
================================================================================


Setup
--------------------------------------------------------------------------------
### Setup tokens
1. create `mapray-config.js` and copy content of [mapray-config-template.js](./mapray-config-template.js)
2. replace `<***_ACCESS_TOKEN>` with your tokens.


Launch
--------------------------------------------------------------------------------
### Host files
Transpile is not required in this app.
So you can simply host and access [index.html](./index.html).
You need to serve root directory (`../../`) because files in `../../node_modules/@mapray/*` are required to launch the html.

```
python -m SimpleHTTPServer 7776
```

Access [http://localhost:7776/debug/picking/](http://localhost:7776/debug/picking/).

