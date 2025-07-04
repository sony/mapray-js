import { spawnSync } from "node:child_process";
import fs from "node:fs";

import Chokidar from "chokidar";


const NAME = "debug/debug-common";
const args = process.argv.slice(2);
const mode_min = args.includes( "min" );
const mode_prod = args.includes( "prod" );
const mode_watch = args.includes( "watch" );
const show_nested = !args.includes( "--hide-nested" );



class Merger {
  constructor(option = {}) {
    this.onFire = option.onFire;
    this.interval = option.interval || 1000;
    this.currentTimeoutID = undefined;
    this.argsList = [];
  }


  mergedFire() {
    this.onFire(this.argsList);
    this.argsList = [];
  }


  fire(...args) {
    this.argsList.push(args);

    if (this.currentTimeoutID) {
      clearTimeout(this.currentTimeoutID);
    }

    this.currentTimeoutID = setTimeout(() => {
        this.currentTimeoutID = undefined;
        this.mergedFire();
    }, this.interval);
  }
}



class Project {

  constructor() {
    this.eventMerger = new Merger({
        onFire: argsList => {
          this.build();
        },
        interval: 100,
    });
    this.buildCount = 0;
  }

  clean() {
    // Remove Cache
    const typescript2CacheDir = "node_modules/.cache/rollup-plugin-typescript2";
    if ( fs.existsSync( typescript2CacheDir ) ) {
        console.log( "Removed Typescript2 Cache Dir" );
        fs.rmdirSync( typescript2CacheDir, { recursive: true, force: true } );
    }

    if ( fs.existsSync( "build-info.json" ) ) {
        const info = {
            name: NAME,
            status: -1,
            stdout: "Not Started",
            stderr: "",
        };
        fs.writeFileSync( "build-info.json", JSON.stringify( info, null, 4 ) );
    }
  }

  build() {
    try {
      console.log(`> Building ${NAME} (${this.buildCount})...`);
      const start = new Date();

      const env = (
        mode_min  ? { BUILD: "production", MINIFY: true  } :
        mode_prod ? { BUILD: "production", MINIFY: false } :
        /*       */ { BUILD: "dev",        MINIFY: false }
      );
      const process = spawnSync("npx", [
          "rollup",
          "-c",
          "--environment", Object.entries( env ).map(([key, value]) => `${key}:${value}`).join(","),
      ]);

      const end = new Date();
      const duration = (end.getTime() - start.getTime());
      const info = {
        name: NAME,
        start, end, duration,
        status: process.status,
        stdout: process.stdout.toString(),
        stderr: process.stderr.toString(),
      };
      fs.writeFileSync( "build-info.json", JSON.stringify( info, null, 4 ) );

      console.log(
        info.stdout + "\n" +
        info.stderr + "\n" +
        `${process.status === 0 ? "Success" : "Error"} ${NAME}: ${end.toLocaleString()} (${Math.floor(duration/1000)}s)`
      );
    }
    catch( exc ) {
      console.log( exc );
    }
    this.buildCount++;
  }

  fireEvent(event, path) {
    this.eventMerger.fire(event, path);
  }

}



const project = new Project();

if ( mode_watch ) {
  project.clean();
  const buildInfos = {
    "../../packages/mapray/build-info.json": { status: 0 },
    "../../packages/ui/build-info.json": { status: 0 },
  };
  const paths = [
    "src",
    ...Object.keys(buildInfos),
  ];
  (Chokidar.watch(paths, {
        ignored: new RegExp(".DS_Store"),
    })
    .on("all", (event, path) => {
        if (project.buildCount > 0) {
          console.log(">> file changed: " + path);
        }
        if (path in buildInfos) {
          buildInfos[path] = JSON.parse(fs.readFileSync(path));
        }
        for (let [pkg, info] of Object.entries(buildInfos)) {
            if (info.status !== 0) {
            if (show_nested) {
              console.log(info.stdout);
              console.log(info.stderr);
              console.log(`Error: ${info.name}`);
            }
            fs.writeFileSync("build-info.json", JSON.stringify(info, null, 4));
            return;
          }
        }
        project.fireEvent(event, path);
    })
  );
}
else {
  project.build();
}
