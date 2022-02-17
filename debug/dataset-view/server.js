import st from "st";
import http from "http";
import path from "path";


const port = 7776;

const rootDir = path.dirname( new URL( import.meta.url ).pathname );
console.log( "publish directory: " + rootDir );



const handleRequest = st({
        path: rootDir,
        index: "index.html",
        cache: false,
});


http.createServer( (req, res) => {
        if ( handleRequest(req, res) ) {
            res.setHeader( "Cross-Origin-Opener-Policy", "same-origin" );
            res.setHeader( "Cross-Origin-Embedder-Policy", "require-corp" );
        }
} ).listen( port );
