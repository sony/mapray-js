import mapray from "@mapray/mapray-js";
import BasicTester from "./basic_tester/src/App";
import FlatTester from "./flat_tester/src/App";

export type { mapray };



export type { BasicTester };

export type BasicTesterGlobal = Window & {
    mapray: typeof mapray;
    app: BasicTester;
}



export type { FlatTester };

export type FlatTesterGlobal = Window & {
    mapray: typeof mapray;
    app: FlatTester;
}
