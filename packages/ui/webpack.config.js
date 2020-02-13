// webpack configuration object
// see https://webpack.github.io/docs/configuration.html

var path = require( "path" );
var outdir = "dist";

// configuration for mapray UI library
ui_config = (env, args) => {

    var fsuffix = ( args.mode == "production" ) ? "" : "-dev";

    return {

        // base directory for resolving the entry option
        context: path.join( __dirname, "src" ),

        // entry point for the bundle
        entry: "./index.js",

        devtool: args.mode === "development" ? "source-map" : "none",

        // options affecting the output of the compilation
        output: {
            // output directory as an absolute path (required)
            path: path.join( __dirname, outdir ),

            // specifies the name of each output file on disk
            filename: "mapray-ui" + fsuffix + ".js",
            library: "mapray-ui",
            libraryTarget: "umd",
            umdNamedDefine: true
        },

        // options affecting the normal modules (NormalModuleFactory)
        module: {
            // array of automatically applied loaders
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                presets: ['@babel/preset-env']
                            }
                        }
                    ]
                }
            ]
        }
    }
};

module.exports = (env, args) => ui_config(env, args);
