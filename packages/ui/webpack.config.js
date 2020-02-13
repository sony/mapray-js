// webpack configuration object
// see https://webpack.github.io/docs/configuration.html

var path = require( "path" );
var  env = process.env.WEBPACK_ENV;

var outdir = ( env == "dist" ) || ( env == "dist-ui" ) ? "dist" : "build";

// configuration for mapray UI library
var ui_config = {

    // base directory for resolving the entry option
    context: path.join( __dirname, "src" ),

    // entry point for the bundle
    entry: "./ui/index.js",

    // options affecting the output of the compilation
    output: {
        // output directory as an absolute path (required)
        path: path.join( __dirname, outdir ),

        // specifies the name of each output file on disk
        filename: "maprayui.js",

        library: "maprayui",
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

switch ( env ) {
case "apps":
    module.exports = apps_config;
    break;
case "tests":
    module.exports = tests_config;
    break;
case "ui":
case "dist-ui":
    module.exports = ui_config;
	break;
default:
    module.exports = mapray_config;
    break;
}
