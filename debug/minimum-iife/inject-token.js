const fs = require('node:fs');
const fsPromises = require('node:fs/promises');

const path = require('node:path');


const env = {
    MAPRAY_ACCESS_TOKEN:    process.env.MAPRAY_ACCESS_TOKEN
};

[
    "MAPRAY_ACCESS_TOKEN",
]
    .forEach( key => { if ( !env[key] ) throw new Error( `${key} is missing` ); });


async function main() {
    const sourceFiles = [
        "DebugViewer.js"
    ];
    for (const sourceFile of sourceFiles) {
        const inCode = await fsPromises.readFile(sourceFile, { encoding: "utf-8" });
        const outCode = inCode.replaceAll("<your access token here>", process.env["MAPRAY_ACCESS_TOKEN"]);
        if ( inCode !== outCode ) {
            await fsPromises.writeFile(sourceFile, outCode, { encoding: "utf-8" });
        }
    }
}

main().catch(e => console.log(e));
