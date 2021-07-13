


class Option {

    globalHandlers: Option.Handler<any>[];

    map: Map<string, Option.PropertyProp<any>>;

    constructor( registries: Option.Property<any>[] ) {
        this.map = new Map();
        this.globalHandlers = [];
        if (registries) {
            registries.forEach(registry => this.register(registry));
        }
    }

    register<T>( property: Option.Property<T> ) {
        const key = property.key; 
        if (!key) throw new Error("?");
        const type = property.type;
        const handlers = property.handlers || [];
        const value = property.value;
        if ( Option.isSelectProperty( property ) ) {
            const valueToOptionMap = new Map<T, Option.LabeledValueObject<T>>();
            const optionOfValue = (value: T) => valueToOptionMap.get( value );
            property.options.forEach( (option: T | Option.LabeledValueObject<T>) => {
                    if ( Option.isLabeledValueObject(option) ) {
                        valueToOptionMap.set( option.value, option );
                    }
                    else {
                        valueToOptionMap.set( option, {
                            label: `${option}`,
                            value: option,
                        });
                    }
            });
            if (typeof(property.value) !== "undefined") {
                if (!optionOfValue(property.value)) {
                    throw new Error(`option not found: "${property.value}" in [${property.options.join(", ")}]`);
                }
            }
            this.map.set( property.key, {
                // @ts-ignore
                key, type, value, handlers, valueToOptionMap, optionOfValue,
                options: property.options, description: property.description,
            });
        }
        else {
            this.map.set( property.key, {
                key, type, value, handlers,
                description: property.description
            });
        }
    }

    set<T>( key: string, value: T ) {
        const property = this.map.get(key);
        if (!property) throw new Error("no property: " + key);
        if ( Option.isSelectPropertyProp( property ) ) {
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

    get( key: string ): any {
        const property = this.map.get(key);
        return property ? property.value : undefined;
    }

    getProperty( key: string ): Option.PropertyProp<any> {
        const proeprty = this.map.get(key);
        if ( !proeprty ) throw new Error("couldn't find " + key);
        return proeprty;
    }

    onChangeAny( handler: Option.Handler<any> ) {
        this.globalHandlers.push(handler);
    }

    onChange( key: string, handler: Option.Handler<any> ) {
        const property = this.map.get(key);
        if (!property) throw new Error("no property: " + key);
        property.handlers.push(handler);
    }
}


interface ButtonParam {
    class?: string;
    onclick?: (button: HTMLElement, event: MouseEvent) => void;
}

interface CheckboxParam {
    class?: string;
    initialValue?: boolean;
    onchange?: (value: boolean, event: Event) => void;
    onui?: (ui: HTMLInputElement) => void;
}

interface SelectParam<T> {
    class?: string;
    initialValue?: string;
    onchange?: (value: T, event: Event) => void;
    onui?: (ui: HTMLSelectElement) => void;
    label?: string;
}



class DomTool {
    static createButton(name: string, options: ButtonParam = {}) {
        const button = document.createElement("button");
        if (options.class) button.setAttribute("class", options.class);
        button.innerHTML = name;
        const onclick = options.onclick;
        if (onclick) {
            button.onclick = event => {
                onclick(button, event);
            };
        }
        return button;
    }

    static createSelect<T>(items: (T|Option.LabeledValueObject<T>)[], options: SelectParam<T> ) {
        const props = {
            mapDomValueToValue: {
            }
        };
        const mapDomValueToValue = new Map();
        const select = items.reduce<HTMLSelectElement>((select, item) => {
                const option = document.createElement("option");
                if (typeof(item) === "object") {
                    // @ts-ignore
                    option.innerHTML = item.label;
                    // @ts-ignore
                    option.value     = item.domValue || item.value.toString();
                    // @ts-ignore
                    mapDomValueToValue.set(option.value, item.value);
                }
                else {
                    // @ts-ignore
                    option.innerHTML = item;
                    // @ts-ignore
                    option.value     = item.toString();
                    mapDomValueToValue.set(option.value, item);
                }
                select.appendChild(option);
                return select;
        }, document.createElement("select"));
        if (options.class) select.setAttribute("class", options.class);
        const onchange = options.onchange;
        if (onchange) {
            select.onchange = event => {
                onchange( mapDomValueToValue.get( select.value) , event );
            }
        }

        if (options.initialValue) {
            for (let i=0; i<select.options.length; i++) {
                const item = select.options.item(i);
                if ( !item ) continue;
                if (mapDomValueToValue.get(item.value)  === options.initialValue ) {
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


    static createCheckbox( name: string, options: CheckboxParam ) {
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
        const onchange = options.onchange;
        if (onchange) checkbox.onchange = (event: Event) => {
            onchange( checkbox.checked, event );
        }
        label.onclick = event => { checkbox.click(); };
        pane.append(checkbox);
        pane.append(label);
        if (options.onui) options.onui(checkbox);
        return pane;
    }

    static createCheckboxOption( option: Option, key: string ) {
        const property = option.getProperty(key);
        if (property.type !== "boolean") throw new Error("unsupported type: " + property.type);
        const checkbox = this.createCheckbox(key, {
                initialValue: option.get(key),
                onui: ui => {
                    option.onChange(key, event => {
                            if (ui.checked != event.value) ui.checked = event.value;
                    });
                },
                onchange: (value, event) => {
                    option.set(key, value);
                }
        });
        return checkbox;
    }

    static createSelectOption( option: Option, key: string ) {
        const property = option.getProperty(key);
        // if (property.type !== "select") throw new Error("unsupported type: " + property.type);
        if ( !Option.isSelectPropertyProp(property) ) throw new Error("unsupported type: " + property.type);
        return this.createSelect(property.options, {
                initialValue: property.value,
                label: key + "\n" + property.description,
                onui: ui => {
                    option.onChange(key, event => {
                            for (let i=0; i<ui.options.length; i++) {
                                const item = ui.options.item(i);
                                if (!item) continue;
                                if (item.value === event.value) {
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
    }
}



namespace Option {



export interface Event<T> {
    key: string;
    value: T;
}


export type Handler<T> = (event: Event<T>) => void;


export interface PropertyProp<T> {
    key: string;
    type: string;
    value?: T;
    description?: string;
    handlers: Handler<T>[];
}

export interface SelectPropertyProp<T> extends PropertyProp<T> {
    type: "select";
    options: (T|LabeledValueObject<T>)[];
    valueToOptionMap: Map<T, LabeledValueObject<T>>;
    optionOfValue: (item: T) => LabeledValueObject<T>;
}
export function isSelectPropertyProp<T>(obj: PropertyProp<T>): obj is SelectPropertyProp<T> {
    return obj.type === "select";
}

export interface Property<T> {
    key: string;
    type: string;
    value?: T;
    description?: string;
    handlers?: Handler<T>[];
}
export interface SelectProperty<T> extends Property<T> {
    type: "select";
    options: (T|LabeledValueObject<T>)[];
}
export function isSelectProperty<T>(obj: Property<T>): obj is SelectProperty<T> {
    return obj.type === "select";
}


export interface LabeledValueObject<T> {
    label: string;
    value: T;
}
export function isLabeledValueObject(obj: any): obj is LabeledValueObject<any> {
    return obj.value !== undefined;
}


}


export default Option;
export { DomTool };
