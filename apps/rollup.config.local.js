import replace from 'rollup-plugin-replace'

const localConfig = (appDir) => (
        [
            replace({
                '"@mapray/mapray-js"': JSON.stringify(appDir+"../packages/mapray/dist/es/mapray.js"),
                delimiters: ['', ''],
                exclude: appDir+"../packages/"
            }),
            replace({
                '"@mapray/ui"': JSON.stringify(appDir+"../packages/ui/dist/es/maprayui.js"),
                delimiters: ['', ''],
                exclude: appDir+"../packages/"
            })
        ]
)

export function addLocalSettings(env, appDir, bundle) {
    let plugins = bundle.plugins.concat() // copy
    // should insert first replace method
    let index = plugins.findIndex(item => JSON.stringify(item) === '{"name":"commonjs"}' ? true : false)
    
    if (index === -1) {
        index = 0;
    }

    Array.prototype.splice.apply(plugins, [index, 0].concat(localConfig(appDir)))
    bundle.plugins = Object.assign(bundle.plugins, plugins)

    return bundle;
};
