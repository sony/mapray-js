
class Option {
    constructor(registries) {
        this.map = new Map();
        this.globalHandlers = [];
        if (registries) {
            registries.forEach(registry => this.register(registry));
        }
    }
    register(property) {
        if (!property.key) throw new Error("?");
        if (!property.handlers) property.handlers = [];
        if (property.type === "select") {
            property.valueToOptionMap = {};
            property.optionOfValue = value => property.valueToOptionMap[value];
            property.options.forEach(option => {
                    if (typeof(option) !== "object" ) {
                        option = {
                            label: option,
                            value: option,
                        };
                    }
                    property.valueToOptionMap[option.value] = option;
            });
            if (typeof(property.value) !== "undefined") {
                if (!property.optionOfValue(property.value)) {
                    throw new Error(`option not found: "${property.value}" in [${property.options.join(", ")}]`);
                }
            }
        }
        this.map.set(property.key, property);
    }
    set(key, value) {
        const property = this.map.get(key);
        if (!property) throw new Error("no property: " + key);
        if (property.type === "select") {
            if (!property.optionOfValue(value)) {
                throw new Error(`option not found: "${value}" in [${property.options.join(", ")}]`);
            }
        }
        property.value = value;
        const event = { key, value };
        property.handlers.forEach(handler => {
                handler(event);
        });
        this.globalHandlers.forEach(handler => {
                handler(event);
        });
    }
    get(key) {
        const property = this.map.get(key);
        return property ? property.value : undefined;
    }
    getProperty(key) {
        return this.map.get(key);
    }
    onChangeAny(handler) {
        this.globalHandlers.push(handler);
    }
    onChange(key, handler) {
        const property = this.map.get(key);
        if (!property) throw new Error("no property: " + key);
        property.handlers.push(handler);
    }
}


class DomTool {
    static createButton(name, options) {
        const button = document.createElement("button");
        if (options.class) button.setAttribute("class", options.class);
        button.innerHTML = name;
        if (options.onclick) {
            button.onclick = event => {
                options.onclick(button, event);
            };
        }
        return button;
    }

    static createSelect(items, options) {
        const props = {
            mapDomValueToValue: {
            }
        };
        const select = items.reduce((select, item) => {
                const option = document.createElement("option");
                if (typeof(item) === "object") {
                    option.innerHTML = item.label;
                    option.value     = item.domValue || item.value.toString();
                    props.mapDomValueToValue[option.value] = item.value;
                }
                else {
                    option.innerHTML = item;
                    option.value     = item.toString();
                    props.mapDomValueToValue[option.value] = item;
                }
                select.appendChild(option);
                return select;
        }, document.createElement("select"));
        if (options.class) button.setAttribute("class", options.class);
        if (options.onchange) {
            select.onchange = event => {
                options.onchange(props.mapDomValueToValue[event.target.value], event);
            }
        }

        if (options.initialValue) {
            for (let i=0; i<select.options.length; i++) {
                if (props.mapDomValueToValue[select.options.item(i).value]  === options.initialValue ) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }
        if (options.onui) options.onui(select);
        const div = document.createElement("div");
        div.setAttribute("style", "display:inline-block");
        if (options.label) {
            // div.appendChild(document.createTextNode(options.label));
            div.title = options.label;
        }
        div.appendChild(select);
        return div;
    }

    static createCheckbox(name, options) {
        const pane = document.createElement("div");
        pane.style.display = "inline-block";
        pane.style.padding = "3px";
        const label = document.createElement("div");
        label.style.display = "inline-block";
        label.style.cursor = "pointer";
        label.style.userSelect = "none";
        label.innerText = name;
        const checkbox = document.createElement("input");
        if (options.initialValue !== undefined) checkbox.checked = options.initialValue;
        checkbox.setAttribute("type", "checkbox");
        checkbox.style.cursor = "pointer";
        if (options.class) checkbox.setAttribute("class", options.class);
        if (options.onchange) checkbox.onchange = options.onchange;
        label.onclick = event => { checkbox.click(); };
        pane.append(checkbox);
        pane.append(label);
        if (options.onui) options.onui(checkbox);
        return pane;
    }

    static createCheckboxOption(option, key, domOption) {
        const property = option.getProperty(key);
        if (property.type !== "boolean") throw new Error("unsupported type: " + property.type);
        const checkbox = this.createCheckbox(key, {
                initialValue: option.get(key),
                onui: ui => {
                    option.onChange(key, event => {
                            if (ui.checked != event.value) ui.checked = event.value;
                    });
                },
                onchange: event => {
                    option.set(key, event.target.checked);
                }
        });
        return this.createOuter(checkbox, key, option, domOption);
    }

    static createSelectOption(option, key, domOption) {
        const property = option.getProperty(key);
        if (property.type !== "select") throw new Error("unsupported type: " + property.type);
        const pane = this.createSelect(property.options, {
                initialValue: property.value,
                label: key + "\n" + property.description,
                onui: ui => {
                    option.onChange(key, event => {
                            for (let i=0; i<ui.options.length; i++) {
                                if (ui.options.item(i).value === event.value) {
                                    if (ui.selectedIndex != i) ui.selectedIndex = i;
                                    break;
                                }
                            }
                    })
                },
                onchange: (value, domEvent) => {
                    option.set(key, value);
                }
        });
        return this.createOuter(pane, key, option, domOption);
    }

    static createSlider(option) {
        const min = option.min;
        const max = option.max;
        const N = 100;
        const sliderToValue = slider => slider * (max - min) / N + min;
        const valueToSlider = value => (value - min) / (max - min) * N;
        const pane = document.createElement("div");
        // console.log(property);
        const slider = document.createElement("input");
        slider.style.width = "100%";
        slider.type = "range";
        slider.min = 0;
        slider.max = N;
        const v = option.initialValue;
        slider.value = valueToSlider(v)
        pane.title = option.label ? option.label + ":" + v : v;
        if (option.onchange) {
            slider.oninput = event => {
                const v = sliderToValue(slider.value);
                option.onchange(v, event);
                pane.title = option.label ? option.label + ":" + v : v;
            };
        }
        pane.appendChild(slider);
        if (option.onui) {
            option.onui(slider, {
                    sliderToValue, valueToSlider,
            });
        }
        return this.createOuter(pane, option);
    }

    static createSliderOption(option, key, domOption) {
        const property = option.getProperty(key);
        if (property.type !== "range") throw new Error("unsupported type: " + property.type);
        const pane = this.createSlider({
                min: property.min,
                max: property.max,
                initialValue: property.value,
                onui: (ui, opt) => {
                    option.onChange(key, event => {
                            ui.value = opt.valueToSlider(event.value);
                    })
                },
                onchange: (value, domEvent) => {
                    option.set(key, value);
                },
        });
        return this.createOuter(pane, key, option, domOption);
    }

    static createOuter(pane, key, option, domOption = {}) {
        if (domOption.mode === "key-value-table-row") {
            const row = document.createElement("tr");
            const th = document.createElement("th");
            const td = document.createElement("td");
            const label  = document.createElement("label");
            label.innerText = key;
            th.appendChild(label);
            th.style.textAlign = "right";
            th.style.padding = "0 5px 0 0";
            td.style.padding = "0 5px 0 0";
            td.appendChild(pane);
            row.appendChild(th);
            row.appendChild(td);
            return row;
        }
        return pane;
    }
}


export default Option;
export { DomTool };
