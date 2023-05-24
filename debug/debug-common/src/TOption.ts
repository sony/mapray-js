/**
 * Key-Propertyマッピング型
 */
export type TMapType = {
    [key: string]: TOption.PropertyInfo;
}

/**
 * PropertyInfo型から、そのプロパティの値型を得る
 */
type PropertyTypeOf<T extends TOption.PropertyInfo> = (
    T extends TOption.RangePropertyInfo ? number:
    T extends TOption.BooleanPropertyInfo ? boolean:
    T extends TOption.TextPropertyInfo ? string:
    T extends TOption.ColorPropertyInfo<infer Type extends TOption.ColorType> ? Type:
    T extends TOption.ColorPropertyInfo<any> ? TOption.ColorType:
    T extends TOption.SelectPropertyInfo<infer Item> ? Item:
    T extends TOption.KVSelectPropertyInfo<infer Item> ? Item:
    never
);

/**
 * PropertyInfo型から、Property型を得る
 */
type InternalClassOf<T extends TOption.PropertyInfo> = (
    T extends TOption.RangePropertyInfo ? TOption.RangeProperty:
    T extends TOption.BooleanPropertyInfo ? TOption.BooleanProperty:
    T extends TOption.TextPropertyInfo ? TOption.TextProperty:
    T extends TOption.ColorPropertyInfo<infer Type extends TOption.ColorType> ? TOption.ColorProperty<Type>:
    T extends TOption.SelectPropertyInfo<infer Item> ? TOption.SelectProperty<Item>:
    T extends TOption.KVSelectPropertyInfo<infer Item> ? TOption.SelectProperty<Item>:
    never
);



/**
 * キーバリューストア型のオプション管理クラス。
 * 
 * - オプションオブジェクト生成には {@link create} を利用します。
 * - 値の設定、取得
 *   - `option.set("counter", 7);`
 *   - `const value = option.get("counter");`
 * - プロパティオブジェクトの取得
 *   プロパティオブジェクトを利用すると、値の設定、取得の他、変更を監視することができます。
 *   ```ts
 *   const prop = option.get("counter");
 *   prop.onChange(event => {
 *     console.log("value has been changed" + event.value);
 *   })
 *   ```
 */
class TOption<TMap extends TMapType> {

    private _global_handlers: TOption.Handler<PropertyTypeOf<TMap[keyof TMap]>>[] = [];

    private _tmap = new Map<keyof TMap, InternalClassOf<TMap[keyof TMap]>>();

    /**
     * オプションを生成。
     * 
     * ＠param tmap 値の定義
     * ＠return オプションオブジェクト
     * 
     * @example
     * ```ts
     * const option = TOption.create({
     *   counter: {
     *     type: "range",
     *     min: 0,
     *     max: 10,
     *     value: 5,
     *   },
     *   test: {
     *     type: "boolean",
     *     value: true,
     *   },
     * });
     * ```
     */
    static create<TMap extends TMapType>( tmap: TMap ): TOption<TMap>
    {
        return new TOption<TMap>( tmap );
    }

    /**
     * オブジェクトの生成には {@link create} を利用します。
     * @param tmap 値の定義
     */
    private constructor( tmap: TMap ) {
        for (const key in tmap) {
            this._register( key, tmap[key] );
        }
    }

    private _register<Key extends keyof TMap>( key: Key, property: TMap[Key] ) {
        if ( property.type === "select" ) {
            this._tmap.set( key, new TOption.SelectProperty( this, key.toString(), property ) as InternalClassOf<TMap[Key]>);
        }
        else if ( property.type === "boolean" ) {
            this._tmap.set( key, new TOption.BooleanProperty( this, key.toString(), property ) as InternalClassOf<TMap[Key]>);
        }
        else if ( property.type === "text" ) {
            this._tmap.set( key, new TOption.TextProperty( this, key.toString(), property ) as InternalClassOf<TMap[Key]>);
        }
        else if ( property.type === "color" ) {
            this._tmap.set( key, new TOption.ColorProperty( this, key.toString(), property ) as InternalClassOf<TMap[Key]>);
        }
        else if ( property.type === "range" ) {
            this._tmap.set( key, new TOption.RangeProperty( this, key.toString(), property ) as InternalClassOf<TMap[Key]> );
        }
    }

    /**
     * 現在の値を取得
     * 
     * @param key キー
     * @returns 値
     */
    get<Key extends keyof TMap, ValueType extends PropertyTypeOf<TMap[Key]>>( key: Key ): ValueType
    {
        return this.getProperty( key ).value;
    }

    /**
     * 値を設定
     * 
     * @param key キー
     * @param value 値
     */
    set<Key extends keyof TMap, ValueType extends PropertyTypeOf<TMap[Key]>, InternalClass extends InternalClassOf<TMap[Key]>>( key: Key, value: ValueType ): void
    {
        const property = this.getProperty( key );
        // @ts-ignore
        property.set( value ); // Why?
    }

    /**
     * プロパティオブジェクトを取得
     * 
     * @param key キー
     * @returns プロパティオブジェクト
     */
    getProperty<Key extends keyof TMap, InternalClass extends InternalClassOf<TMap[Key]>>( key: Key ): InternalClass
    {
        if ( !this._tmap.has( key ) ) {
            throw new Error( "key not found: " + key.toString() );
        }
        return this._tmap.get( key ) as InternalClass; // we already checked availability
    }

    /**
     * プロパティオブジェクトからオプションオブジェクトへ、値の変更を通知します。
     *
     * @param event 変更イベント
     * @internal
     */
    _notifyChanged<Key extends keyof TMap, ValueType extends PropertyTypeOf<TMap[Key]>>( event: TOption.Event<ValueType> ): void
    {
        this._global_handlers.forEach(handler => { handler(event); });
    }

    /**
     * 全ての値の変更を監視しハンドラを登録します。
     * 
     * @param handler 変更時に呼び出されるハンドラ
     */
    onChangeAny( handler: TOption.Handler<PropertyTypeOf<TMap[keyof TMap]>> ): void
    {
        this._global_handlers.push(handler);
    }

    /**
     * 特定の値の変更を監視しハンドラを登録します。
     * 
     * @param key キー
     * @param handler 変更時に呼び出されるハンドラ
     */
    onChange<Key extends keyof TMap, ValueType extends PropertyTypeOf<TMap[Key]>>( key: Key, handler: TOption.Handler<ValueType> ): void
    {
        this.getProperty( key ).onChange( handler );
    }
}


interface ButtonParam {
    class?: string;
    onclick?: (button: HTMLElement, domEvent: MouseEvent) => void;
    description?: string;
}

interface CheckboxParam {
    class?: string;
    initialValue?: boolean;
    onchange?: (value: boolean, domEvent: Event) => void;
    onui?: (ui: HTMLInputElement, apply: (value: boolean) => void) => void;
    description?: string;
}

interface TextParam {
    class?: string;
    initialValue?: string;
    onchange?: (value: string, domEvent: Event) => void;
    onui?: (ui: HTMLElement, apply: (value: string) => void) => void;
    description?: string;
}

interface SelectParam<T> {
    class?: string;
    initialValue?: string;
    onchange?: (value: T, domEvent: Event) => void;
    onui?: (ui: HTMLSelectElement) => void;
    description?: string;
}

interface SliderParam {
    min: number;
    max: number;
    initialValue: number;
    onchange?: (value: number, domEvent: Event) => void;
    onui?: (ui: HTMLInputElement, apply: (value: number) => void) => void;
    description?: string;
}

interface NumberInputParam {
    min?: number;
    max?: number;
    step?: number;
    initialValue: number;
    onchange?: (value: number, domEvent: Event) => void;
    onui?: (ui: HTMLInputElement, apply: (value: number) => void) => void;
    description?: string;
}

interface ColorParam<T extends TOption.ColorType = TOption.RGBType> {
    initialValue: T;
    onchange?: (value: T, domEvent: Event) => void;
    onui?: (ui: HTMLElement, apply: (value: T) => void) => void;
    description?: string;
}

interface DomOption {
    name?: string;
    mode?: "key-value-table-row";
}



const LoadedStyles = {
  SLIDER: false,
  COLOR: false,
  CEHCKBOX: false,
  NUMBER: false,
  TEXT: false,
};
let styleTag: HTMLStyleElement;


/**
 * Domを操作するクラスです。
 */
export class TDomTool {

    /**
     * スタイル宣言を追加します。
     * @param cssStyle cssコード
     */
    static insertStyle( cssStyle: string ): void
    {
        if ( !styleTag ) {
            styleTag = document.createElement("style");
            document.head.appendChild(styleTag);
        }
        styleTag.innerHTML += cssStyle + "\n/********************************/\n";
    }

    /**
     * ボタンを作成
     * 
     * @param name ボタン名
     * @param options オプション
     * @returns ボタン要素
     */
    static createButton(name: string, options: ButtonParam = {}): HTMLButtonElement
    {
        const button = document.createElement("button");
        if (options.class) button.setAttribute("class", options.class);
        button.innerHTML = name;
        const onclick = options.onclick;
        if (onclick) {
            button.onclick = event => {
                onclick(button, event);
            };
        }
        if (options.description) {
            button.title = options.description;
        }
        return button;
    }

    /**
     * 複数の選択肢から一つの値を選択するUIを作成
     * 
     * @param items 選択肢
     * @param options オプション
     * @returns 選択要素
     */
    static createSelect<T>(items: T[] | TOption.KeyValue<T>[], options: SelectParam<T> ): HTMLDivElement
    {
        const props = {
            mapDomValueToValue: {
            }
        };
        const mapDomValueToValue = new Map();
        const summary = (items as (T|TOption.KeyValue<T>)[]).reduce<{object:number; value:number}>((summary, item) => {
            if (isKeyValue(item)) summary.object++;
            else summary.value++;
            return summary;
        }, { object: 0, value: 0 });
        if ( summary.object !== 0 && summary.value !== 0 ) {
            throw new Error("?");
        }
        const keyValueFlag = summary.object > 0;
        const select = (items as (T|TOption.KeyValue<T>)[]).reduce<HTMLSelectElement>((select, item) => {
                const option = document.createElement("option");
                if ( keyValueFlag ) {
                    const kvItem = item as TOption.KeyValue<T>;
                    option.innerHTML = kvItem.key;
                    option.value     = kvItem.key;
                    mapDomValueToValue.set(option.value, kvItem.value);
                }
                else {
                    const vItem = item as T;
                    option.innerHTML = vItem + "";
                    option.value     = vItem + "";
                    mapDomValueToValue.set(option.value, vItem);
                }
                select.appendChild(option);
                return select;
        }, document.createElement("select"));
        if (options.class) select.setAttribute("class", options.class);
        const onchange = options.onchange;
        if (onchange) {
            select.onchange = event => {
                onchange( mapDomValueToValue.get( select.value ) , event );
            }
        }

        if (options.initialValue) {
            for (let i=0; i<select.options.length; i++) {
                const item = select.options.item(i);
                if ( !item ) continue;
                if ( mapDomValueToValue.get(item.value) === options.initialValue ) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }
        if (options.onui) options.onui(select);
        const div = document.createElement("div");
        div.setAttribute("style", "display:inline-block");
        if (options.description) {
            // div.appendChild(document.createTextNode(options.label));
            div.title = options.description;
        }
        div.appendChild(select);
        return div;
    }

    /**
     * SelectPropertyオブジェクトを表示、編集するHTML要素を作成
     * 
     * @param property プロパティ
     * @returns HTML要素
     */
    static createSelectOption<T>( property: TOption.SelectProperty<T> ): HTMLDivElement
    {
        return this.createSelect(property.options, {
                initialValue: property.valueToOptionMap.get(property.get())!.key,
                description: property.key + (property.description ? "\n" + property.description : ""),
                onui: ui => {
                    property.onChange(event => {
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
                onchange: (value: T, domEvent: Event) => {
                    property.set( value );
                }
        });
    }

    /**
     * チェックボックスを作成
     * 
     * @param name チェックボックス名
     * @param options オプション
     * @returns チェックボックス要素
     */
    static createCheckbox( name: string, options: CheckboxParam ): HTMLDivElement
    {
        if ( !LoadedStyles.CEHCKBOX ) {
            this.insertStyle(`
                .TDomTool_checkbox {
                    display: flex;
                    align-items: center;
                }
                .TDomTool_checkbox>input {
                    cursor: pointer;
                }
                .TDomTool_checkbox>div {
                    cursor: pointer;
                    user-select: none;
                }
            `);
            LoadedStyles.CEHCKBOX = true;
        }
        const pane = document.createElement("div");
        pane.classList.add("TDomTool_checkbox");

        const checkbox = document.createElement("input");
        if (options.initialValue !== undefined) checkbox.checked = options.initialValue;
        checkbox.type = "checkbox";
        pane.append(checkbox);

        const setValue = (value: boolean) => { checkbox.checked = value; }

        const label = document.createElement("div");
        label.innerText = name;
        pane.append(label);

        if (options.class) checkbox.classList.add(options.class);
        const onchange = options.onchange;
        if (onchange) checkbox.onchange = (event: Event) => {
            onchange( checkbox.checked, event );
        }
        label.onclick = event => { checkbox.click(); };
        if (options.onui) options.onui(checkbox, setValue);
        if (options.description) {
            pane.title = options.description;
        }
        return pane;
    }

    /**
     * Property<boolean>オブジェクトを表示、編集するHTML要素を作成
     * 
     * @param property プロパティ
     * @returns HTML要素
     */
    static createCheckboxOption<TMap extends TMapType, Key extends keyof TMap>( property: TOption.BooleanProperty, options: DomOption = {} ): HTMLDivElement
    {
        const checkbox = this.createCheckbox( options.name ?? property.key, {
            initialValue: property.get(),
            description: property.key + (property.description ? "\n" + property.description : ""),
            onui: (ui, apply) => {
                property.onChange( event => {
                    apply(event.value);
                });
            },
            onchange: (value, event) => {
                property.set( value );
            }
        });
        return checkbox;
    }

    /**
     * テキストフィールドを作成
     * 
     * @param name テキストフィールド名
     * @param options オプション
     * @returns テキストフィールド要素
     */
    static createText( name: string, options: TextParam ): HTMLElement
    {
        if ( !LoadedStyles.TEXT ) {
            this.insertStyle(`
            .TDomTool_text {
                display: flex;
                align-items: center;
            }
            .TDomTool_text > input{
                width: 100%;
            }
    `);
            LoadedStyles.TEXT = true;
        }

        const pane = document.createElement("div");
        pane.classList.add("TDomTool_text");

        const textInput = document.createElement("input");
        textInput.type = "text";
        if (options.initialValue !== undefined) textInput.value = options.initialValue;
        pane.append(textInput);
        const setValue = (text: string) => { textInput.value = text; }

        // const textInput = document.createElement("textarea");
        // if (options.initialValue !== undefined) textInput.innerText = options.initialValue;
        // pane.append(textInput);
        // const setValue = (text: string) => { textInput.innerText = text; }

        if (options.class) textInput.classList.add(options.class);
        const onchange = options.onchange;
        if (onchange) textInput.onchange = (event: Event) => {
            onchange( textInput.value, event );
        }
        if (options.onui) options.onui(textInput, setValue);
        if (options.description) {
            pane.title = options.description;
        }
        return pane;
    }

    /**
     * Property<string>オブジェクトを表示、編集するHTML要素を作成
     *
     * @param property プロパティ
     * @returns HTML要素
     */
    static createTextOption<TMap extends TMapType, Key extends keyof TMap>( property: TOption.TextProperty, domOption: DomOption = {} ): HTMLElement
    {
        const textInput = this.createText( domOption.name ?? property.key, {
            initialValue: property.get(),
            description: property.key + (property.description ? "\n" + property.description : ""),
            onui: (ui, apply) => {
                property.onChange( event => {
                    apply(event.value);
                });
            },
            onchange: (value, event) => {
                property.set( value );
            }
        });
        return this.createOuter(textInput, property.key, domOption);
    }

    /**
     * スライダーを作成
     * 
     * @param property プロパティ
     * @returns HTML要素
     */
    static createSlider(option: SliderParam): HTMLDivElement
    {
        if ( !LoadedStyles.SLIDER ) {
            this.insertStyle(`
                .TDomTool_slider {
                    display: flex;
                    align-items: center;
                }
                .TDomTool_slider>input[type=range] {
                    flex-grow: 10;
                    vertical-align: middle;
                }
                .TDomTool_slider>input[type=number] {
                    flex-basis: 70px;
                    vertical-align: middle;
                }
            `);
            LoadedStyles.SLIDER = true;
        }

        const min = option.min;
        const max = option.max;
        const N = 100;
        const sliderToValue = (slider: string) => Number(slider) * (max - min) / N + min;
        const valueToSlider = (value: number) => ((value - min) / (max - min) * N).toString();
        const value = option.initialValue;

        const pane = document.createElement("div");
        pane.classList.add("TDomTool_slider")
        pane.title = option.description ? option.description + ":" + value.toString() : value.toString();

        const applyers = {
            "slider": (value: number) => {},
            "number": (value: number) => {},
        };
        const apply = (value: number) => {
            applyers["slider"](value);
            applyers["number"](value);
            pane.title = option.description ? option.description + ":" + value.toString() : value.toString();
        }
        const onchange = option.onchange ?? ((value: number, event: Event) => {});
        function updateValue(value: number, domEvent: Event) {
            apply(value);
            onchange(value, domEvent);
        }

        const slider = document.createElement("input");
        {
            slider.type = "range";
            slider.min = String(0);
            slider.max = String(N);
            slider.value = valueToSlider(value);
            applyers["slider"] = (value: number) => {
                slider.value = valueToSlider(value);
            }
            slider.oninput = event => {
                updateValue(sliderToValue(slider.value), event);
            };
            pane.appendChild(slider);
        }

        pane.appendChild(this.createNumberInput({
            min, max, initialValue: value,
            onui: (ui, apply) => applyers["number"] = apply,
            onchange: (value, domEvent) => {
                updateValue(value, domEvent);
                /*
                const newColorValue = colorValue.slice() as T;
                newColorValue[index] = value / 255;
                updateValue(newColorValue, domEvent);
                */
            },
        }));

        if (option.onui) {
            option.onui( slider, apply );
        }
        if (option.description) {
            pane.title = option.description;
        }
        return pane;
    }

    /**
     * RangePropertyオブジェクトを表示、編集するHTML要素を作成
     * 
     * @param property プロパティ
     * @returns HTML要素
     */
    static createSliderOption( property: TOption.RangeProperty, domOption: DomOption = {} ): HTMLElement
    {
        const pane = this.createSlider({
                min: Number(property.min),
                max: Number(property.max),
                initialValue: property.value,
                description: property.key + (property.description ? "\n" + property.description : ""),
                onui: (ui, apply) => {
                    property.onChange(event => {
                        apply(event.value)
                    })
                },
                onchange: (value, domEvent) => {
                    property.set(value);
                },
        });
        return this.createOuter(pane, property.key, domOption);
    }

    /**
     * 数字を編集するUIを作成
     * 
     * @param property プロパティ
     * @returns HTML要素
     */
    static createNumberInput( option: NumberInputParam ) {
        if ( !LoadedStyles.NUMBER ) {
            this.insertStyle(`
                input.TDomTool_number {
                  box-sizing: border-box;
                  width: 80px;
                  background: rgba(0, 0, 0, 0);
                  outline: none;
                  padding: 0 0 0 4px;
                  border: none;
                  color: #999;
                }
                input.TDomTool_number:focus {
                  background: white;
                  color: black;
                }
            `);
            LoadedStyles.NUMBER = true;
        }

        const inputToValue = (input: string) => Number(input);
        const valueToInput = (value: number) => (value).toString();
        const input = document.createElement("input");
        input.type = "number";
        input.classList.add("TDomTool_number");
        if (option.min !== undefined) input.min = option.min.toString();
        if (option.max !== undefined) input.max = option.max.toString();
        if (option.step !== undefined) input.step = option.step.toString();
        const setValue = (value: number) => {
            input.value = valueToInput(value);
        };
        setValue(option.initialValue);
        const onchange = option.onchange;
        if ( onchange ) {
            input.oninput = event => {
                const v = inputToValue(input.value);
                onchange( v, event );
            };
        }
        const onui = option.onui;
        if ( onui ) {
            onui( input, setValue );
        }
        return input;
    }

    /**
     * 色を編集するUIを作成
     * 
     * @param property プロパティ
     * @returns HTML要素
     */
    static createColor<T extends TOption.ColorType = TOption.RGBType>( option: ColorParam<T> ): HTMLDivElement
    {
        if ( !LoadedStyles.COLOR ) {
          this.insertStyle(`
            .TDomTool_color {
                display: flex;
                align-items: center;
            }
            .TDomTool_color>div:first-child { /* colorBox */
                border: solid 1px black;
                height: 80%;
                min-height: 15px;
                width: 20px;
                background: white;
            }
            .TDomTool_color>input { /* red, green, blue*/
                flex-basis: 50px;
            }
          `);
          LoadedStyles.COLOR = true;
        }
        let colorValue = option.initialValue.slice() as T;
        const isRGBA = TOption.isRGBAType( colorValue );
        const pane = document.createElement("div");
        pane.classList.add("TDomTool_color");
        const colorBox = document.createElement("div");
        colorBox.style.background = `rgb(${Math.floor(colorValue[0]*255)},${Math.floor(colorValue[1]*255)},${Math.floor(colorValue[2]*255)})`;
        pane.appendChild(colorBox);
        const onchange = option.onchange ?? ((value: T, domEvent: Event) => {});
        function updateValue(value: T, domEvent: Event) {
            colorValue = value;
            colorBox.style.background = `rgb(${Math.floor(colorValue[0]*255)},${Math.floor(colorValue[1]*255)},${Math.floor(colorValue[2]*255)})`;
            onchange(colorValue, domEvent);
        }

        const applyers: { [key: string]: (value: number) => void } = {
            red: (value: number) => {},
            green: (value: number) => {},
            blue: (value: number) => {},
        };
        if ( isRGBA ) {
            applyers["alpha"] = (value: number) => {};
        }

        Object.keys(applyers).forEach((color, index) => {
            const s = applyers[color];
            const max = index === 3 ? 1 : 255;
            const step = index === 3 ? 0.1 : 10;
            const input = TDomTool.createNumberInput({
                min:0, max: max,
                initialValue: colorValue[index] * max,
                step: step,
                onui: (ui, apply) => applyers[color] = apply,
                onchange: (value, domEvent) => {
                    const newColorValue = colorValue.slice() as T;
                    newColorValue[index] = value / max;
                    updateValue(newColorValue, domEvent);
                },
            });
            pane.appendChild( input );
        })

        const apply = (value: T) => {
            applyers["red"](value[0]*255);
            applyers["green"](value[1]*255);
            applyers["blue"](value[2]*255);
            if (value.length === 4) {
                applyers["alpha"](value[3]);
                colorBox.style.background = `rgba(${Math.floor(value[0]*255)},${Math.floor(value[1]*255)},${Math.floor(value[2]*255)},${Math.floor(value[3])})`;
            }
            else {
                colorBox.style.background = `rgb(${Math.floor(value[0]*255)},${Math.floor(value[1]*255)},${Math.floor(value[2]*255)})`;
            }
        };

        const onui = option.onui;
        if ( onui ) {
            onui(pane, apply);
            // ((ui: HTMLElement, apply: (value: T) => void) => {});
            // property.onChange(event => apply(event.value[1]))
        }
        if (option.description) {
            pane.title = option.description;
        }
        return pane;
    }

    /**
     * ColorPropertyを表示、編集するHTML要素を作成
     * 
     * @param property プロパティ
     * @returns HTML要素
     */
    static createColorOption<T extends TOption.ColorType>( property: TOption.ColorProperty<T>, domOption: DomOption = {} ): HTMLElement
    {
        const pane = this.createColor({
                initialValue: property.value,
                description: property.key + (property.description ? "\n" + property.description : ""),
                onui: (ui: HTMLElement, apply: (value: T) => void) => {
                    property.onChange(event => {
                            apply(event.value);
                    })
                },
                onchange: (value, event) => {
                    property.set(value);
                },
        });
        return this.createOuter(pane, property.key, domOption);
    }

    /**
     * HTML部品の外部要素を用途ごとに設定する
     * 
     * @param pane HTML要素
     * @param key キー
     * @param domOption オプション
     * @returns HTML要素
     */
    private static createOuter(pane: HTMLElement, key: string, domOption: DomOption = {}): HTMLElement
    {
        if (domOption.mode === "key-value-table-row") {
            pane.style.position = "absolute";
            pane.style.left = "0";
            pane.style.right = "0";
            pane.style.top = "0";
            pane.style.bottom = "0";
            const row = document.createElement("tr");
            const th = document.createElement("th");
            th.style.whiteSpace = "nowrap";
            const td = document.createElement("td");
            td.style.width = "100%";
            const label  = document.createElement("label");
            label.innerText = domOption.name ?? key;
            th.appendChild(label);
            th.style.textAlign = "right";
            th.style.padding = "0 5px 0 0";
            td.style.padding = "0 5px 0 0";
            td.style.position = "relative";
            td.appendChild(pane);
            row.appendChild(th);
            row.appendChild(td);
            return row;
        }
        return pane;
    }
}



namespace TOption {

/**
 * 値の変更イベント
 */
export interface Event<T> {
    key: string;
    value: T;
}

/**
 * 値の変更イベントハンドラ
 */
export interface Handler<T> {
    ( event: Event<T> ): void;
}

/**
 * プロパティ情報の抽象表現
 */
export interface AbstractPropertyInfo<T> {
    value: T;
    description?: string;
    handlers?: Handler<T>[];
}

/**
 * プロパティの抽象表現
 */
export class AbstractProperty<T> {
    owner: TOption<any>;
    key: string;
    value: T;
    description: string;
    handlers: Handler<T>[];

    constructor( owner: TOption<any>, key: string, info: AbstractPropertyInfo<T> ) {
        this.owner = owner;
        this.key = key;
        this.value = info.value;
        this.description = info.description ?? "";
        this.handlers = info.handlers ?? [];
    }

    /**
     * 値を取得
     * 
     * @returns 値
     */
    get(): T
    {
        return this.value;
    }

    /**
     * 値を設定
     * @param value 値
     */
    set( value: T ): void
    {
        this.value = value;
        const event: TOption.Event<T> = {
            key: this.key.toString(), // @ToDo: fix this
            value: value,
        };
        this.handlers.forEach(handler => {
                handler(event);
        });
        this.owner._notifyChanged( event );
    }

    /**
     * 値の変更を監視しハンドラを登録します。
     * 
     * @handler ハンドラ
     */
    onChange( handler: TOption.Handler<T> ): void
    {
        this.handlers.push(handler);
    }
}

/**
 * 範囲付き数字プロパティの初期化パラメータ
 */
export interface RangePropertyInfo extends AbstractPropertyInfo<number> {
    type: "range";
    min: number;
    max: number;
}

/**
 * 範囲付き数字プロパティ
 */
export class RangeProperty extends AbstractProperty<number> {
    min: number;
    max: number;

    constructor( owner: TOption<any>, key: string, info: RangePropertyInfo ) {
        super( owner, key, info );
        this.min = info.min
        this.max = info.max
    }
}

/**
 * テキストプロパティの初期化パラメータ
 */
export interface TextPropertyInfo extends AbstractPropertyInfo<string> {
    type: "text";
}

/**
 * テキストプロパティ
 */
export class TextProperty extends AbstractProperty<string> {

    constructor( owner: TOption<any>, key: string, info: TextPropertyInfo ) {
        super( owner, key, info );
    }
}

/**
 * 真偽値プロパティの初期化パラメータ
 */
export interface BooleanPropertyInfo extends AbstractPropertyInfo<boolean> {
    type: "boolean";
}

/**
 * 真偽値プロパティ
 */
export class BooleanProperty extends AbstractProperty<boolean> {
    constructor( owner: TOption<any>, key: string, info: BooleanPropertyInfo ) {
        super( owner, key, info );
    }
}

export type RGBType = [red: number, green: number, blue: number]; // [0.0 - 1.0]
export type RGBAType = [red: number, green: number, blue: number, alpha: number]; // [0.0 - 1.0]
export type ColorType = RGBType | RGBAType;
export function isRGBType( type: ColorType ): type is RGBType {
    return type.length === 3;
}
export function isRGBAType( type: ColorType ): type is RGBAType {
    return type.length === 4;
}

/**
 * 色プロパティの初期化パラメータ
 */
export interface ColorPropertyInfo<T extends ColorType = RGBType> extends AbstractPropertyInfo<T> {
    type: "color";
}

/**
 * 色プロパティ
 */
export class ColorProperty<T extends ColorType> extends AbstractProperty<T> {
    constructor( owner: TOption<any>, key: string, info: ColorPropertyInfo<T> ) {
        super( owner, key, info );
    }
}

/**
 * 複数の選択肢から単一の値を選択するプロパティの初期化パラメータ
 */
export interface SelectPropertyInfo<T> extends AbstractPropertyInfo<T> {
    type: "select";
    values: T[];
}

/**
 * 複数の選択肢から単一の値を選択するプロパティの初期化パラメータ
 * 選択肢の要素は、key-value の組み合わせで、UIの選択肢としてkeyが利用されます。
 */
export interface KVSelectPropertyInfo<T> extends AbstractPropertyInfo<T> {
    type: "select";
    keyValues: KeyValue<T>[];
}

/**
 * 複数の選択肢から単一の値を選択するプロパティ
 */
export class SelectProperty<T> extends AbstractProperty<T> {
    options: KeyValue<T>[];

    valueToOptionMap = new Map<T, TOption.KeyValue<T>>();
    optionOfValue: (value: T) => TOption.KeyValue<T>;

    constructor( owner: TOption<any>, key: string, info: SelectPropertyInfo<T> | KVSelectPropertyInfo<T> ) {
        super( owner, key, info );
        this.options = [];
        this.optionOfValue = (value: T) => {
            return this.valueToOptionMap.get( value ) as TOption.KeyValue<T>;
        };
        if ( isKeyValueInfo( info ) ) {
            info.keyValues.forEach( (option: KeyValue<T>) => {
                this.valueToOptionMap.set( option.value, option );
                this.options.push( option );
            });
        }
        else {
            info.values.forEach( (option: T) => {
                const o = keyValue(`${option}`, option);
                this.valueToOptionMap.set( option, o );
                this.options.push( o );
            });
        }
        if ( info.value !== undefined ) {
            const value = info.value;
            if ( !this.optionOfValue( value ) ) {
                throw new Error(`option not found: "${this.value}" in [${this.options.join(", ")}]`);
            }
        }
    }

    override set( valueOrKeyValue: T ): void
    {
        const value = isKeyValue(valueOrKeyValue) ? valueOrKeyValue.value : valueOrKeyValue;
        if ( !this.optionOfValue( value ) ) {
            throw new Error(`option not found: "${value}" in [${this.options.join(", ")}]`);
        }
        super.set( value );
    }
}

/**
 * 全てのプロパティ初期化パラメータの共用体
 */
export type PropertyInfo = (
    RangePropertyInfo |
    BooleanPropertyInfo |
    TextPropertyInfo |
    ColorPropertyInfo<ColorType> |
    SelectPropertyInfo<any> |
    KVSelectPropertyInfo<any>
);

/**
 * キーバリュー要素型
 */
export interface KeyValue<T> {
    key: string;
    value: T;
}

/**
 * キーバリュー要素を作成します。
 */
export function keyValue<T>(key: string, value: T): KeyValue<T>
{
    return { key, value };
}

/**
 * キーバリューリストを作成します。
 * 
 * @param keyValues 
 * @returns キーバリューリスト
 */
export function keyValues<T>(keyValues: [key: string, value: T][]): KeyValue<T>[]
{
    return keyValues.map(([key, value]) => ({ key, value }));
}

} // namespace TOption


/**
 * キーバリューであるかを判断します。
 */
function isKeyValue(obj: any): obj is TOption.KeyValue<any>
{
    return typeof(obj) === "object" && typeof(obj.key) === "string";
}

/**
 * SelectPropertyInfo と KVSelectPropertyInfo を識別します。
 */
function isKeyValueInfo<T>(info: TOption.SelectPropertyInfo<T> | TOption.KVSelectPropertyInfo<T>): info is TOption.KVSelectPropertyInfo<T>
{
    return "keyValues" in info;
}


export default TOption;
