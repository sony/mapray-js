import replace from 'rollup-plugin-replace'

const localConfig = (appDir) => (
        [
            replace({
                '"@mapray/mapray-js"': JSON.stringify(appDir+"../node_modules/@mapray/mapray-js/src/index.js"),
                delimiters: ['', ''],
                exclude: appDir+"../packages/"
            }),
            replace({
                '"@mapray/mapray-js"': JSON.stringify(appDir+"../../node_modules/@mapray/mapray-js/src/index.js"),
                delimiters: ['', ''],
                include: appDir+"../packages/"
            }),
            replace({
                '"@mapray/ui"': JSON.stringify(appDir+"../node_modules/@mapray/ui/src/index.js"),
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

export function makeExternalPredicate(externalArr) {
    if (externalArr.length === 0) {
        return () => false
    }
    const pattern = new RegExp(`^(${externalArr.join('|')})($|/)`)
    return id => pattern.test(id)
}

