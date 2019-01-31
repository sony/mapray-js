// webpack configuration object
// see https://webpack.github.io/docs/configuration.html

var path = require( "path" );
var  env = process.env.WEBPACK_ENV;

var outdir = (env == "dist") ? "dist" : "build";


// configuration for mapray library
var mapray_config = {

    // base directory for resolving the entry option
    context: path.join( __dirname, "src" ),

    // entry point for the bundle
    entry: "./mapray/index.js",

    // options affecting the output of the compilation
    output: {
        // output directory as an absolute path (required)
        path: path.join( __dirname, outdir ),

        // specifies the name of each output file on disk
        filename: "mapray.js",

        library: "mapray",
        libraryTarget: "umd",
        umdNamedDefine: true
    },

    // options affecting the normal modules (NormalModuleFactory)
    module: {
        // array of automatically applied loaders
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                query: {
                    presets: ["env"],
                    plugins: ["add-module-exports"]
                }
            },
            {
                test: /\.(vert|frag|glsl)$/,
                loader: "raw-loader"
            }
        ]
    }

};


// configuration for apps
var apps_config = {

    // base directory for resolving the entry option
    context: path.join( __dirname, "src" ),

    // entry point for the bundle
    entry: {
        fall: "./apps/fall/index.js",
        turning: "./apps/turning/turning.js",
        nextRambler: "./apps/next/index.js"
    },

    // options affecting the output of the compilation
    output: {
        // output directory as an absolute path (required)
        path: path.join( __dirname, outdir ),

        // specifies the name of each output file on disk
        filename: "[name].js"
    },

    // options affecting the normal modules (NormalModuleFactory)
    module: {
        // array of automatically applied loaders
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                query: {
                    presets: ["env"]
                }
            }
        ]
    }

};


module.exports = (env == "apps") ? apps_config : mapray_config;
