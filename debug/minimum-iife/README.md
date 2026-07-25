IIFD
================================================================================


Setup
--------------------------------------------------------------------------------
## Setup tokens
mapray access token(`MAPRAY_ACCESS_TOKEN`) needs to be defined.

**To set access token:**

To see the terrian data, you need a [Mapray access token](https://mapray.com/documents/index.html) and replace **`<your access token here>`** in DebugViewer.js:

## Copy mapray and ui pacakges
1. building packages of [mapray](../../packages/mapray) and [ui](../../packages/ui)
2. copy builded files. Command is as follows.
```angular2html
node copy.js
```

## Select js files
You can change debug version mapray to change src in **`<script>`** tag in index.html.
