# mapray-js Fall 
This is a simple demo application with beautiful Mt Fuji on [Mapray](https://mapray.com) website.

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

Or set accsess token to `<your access token here>` directly in `Fall.js` and `Turn.js`.


### Install dependencies

```bash
npm install
# or
yarn
```

### Commands
- `npm start` is the development target, to serves the app and hot reload.
- `npm run build-prod` is the production target, to create the final bundle and write to disk.
