(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@mapray/mapray-js')) :
typeof define === 'function' && define.amd ? define(['@mapray/mapray-js'], factory) :
(global = global || self, global.maprayui = factory(global.mapray));
}(this, (function (mapray) { 'use strict';

mapray = mapray && mapray.hasOwnProperty('default') ? mapray['default'] : mapray;

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var check = function (it) {
  return it && it.Math == Math && it;
}; // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028


var global_1 = // eslint-disable-next-line no-undef
check(typeof globalThis == 'object' && globalThis) || check(typeof window == 'object' && window) || check(typeof self == 'object' && self) || check(typeof commonjsGlobal == 'object' && commonjsGlobal) || // eslint-disable-next-line no-new-func
Function('return this')();

var fails = function (exec) {
  try {
    return !!exec();
  } catch (error) {
    return true;
  }
};

var descriptors = !fails(function () {
  return Object.defineProperty({}, 1, {
    get: function () {
      return 7;
    }
  })[1] != 7;
});

var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor; // Nashorn ~ JDK8 bug

var NASHORN_BUG = getOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({
  1: 2
}, 1); // `Object.prototype.propertyIsEnumerable` method implementation
// https://tc39.github.io/ecma262/#sec-object.prototype.propertyisenumerable

var f = NASHORN_BUG ? function propertyIsEnumerable(V) {
  var descriptor = getOwnPropertyDescriptor(this, V);
  return !!descriptor && descriptor.enumerable;
} : nativePropertyIsEnumerable;
var objectPropertyIsEnumerable = {
  f: f
};

var createPropertyDescriptor = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var toString = {}.toString;

var classofRaw = function (it) {
  return toString.call(it).slice(8, -1);
};

var split = ''.split; // fallback for non-array-like ES3 and non-enumerable old V8 strings

var indexedObject = fails(function () {
  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
  // eslint-disable-next-line no-prototype-builtins
  return !Object('z').propertyIsEnumerable(0);
}) ? function (it) {
  return classofRaw(it) == 'String' ? split.call(it, '') : Object(it);
} : Object;

// `RequireObjectCoercible` abstract operation
// https://tc39.github.io/ecma262/#sec-requireobjectcoercible
var requireObjectCoercible = function (it) {
  if (it == undefined) throw TypeError("Can't call method on " + it);
  return it;
};

var toIndexedObject = function (it) {
  return indexedObject(requireObjectCoercible(it));
};

var isObject = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

// https://tc39.github.io/ecma262/#sec-toprimitive
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string

var toPrimitive = function (input, PREFERRED_STRING) {
  if (!isObject(input)) return input;
  var fn, val;
  if (PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
  if (typeof (fn = input.valueOf) == 'function' && !isObject(val = fn.call(input))) return val;
  if (!PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
  throw TypeError("Can't convert object to primitive value");
};

var hasOwnProperty = {}.hasOwnProperty;

var has = function (it, key) {
  return hasOwnProperty.call(it, key);
};

var document$1 = global_1.document; // typeof document.createElement is 'object' in old IE

var EXISTS = isObject(document$1) && isObject(document$1.createElement);

var documentCreateElement = function (it) {
  return EXISTS ? document$1.createElement(it) : {};
};

var ie8DomDefine = !descriptors && !fails(function () {
  return Object.defineProperty(documentCreateElement('div'), 'a', {
    get: function () {
      return 7;
    }
  }).a != 7;
});

var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor; // `Object.getOwnPropertyDescriptor` method
// https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptor

var f$1 = descriptors ? nativeGetOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
  O = toIndexedObject(O);
  P = toPrimitive(P, true);
  if (ie8DomDefine) try {
    return nativeGetOwnPropertyDescriptor(O, P);
  } catch (error) {
    /* empty */
  }
  if (has(O, P)) return createPropertyDescriptor(!objectPropertyIsEnumerable.f.call(O, P), O[P]);
};
var objectGetOwnPropertyDescriptor = {
  f: f$1
};

var anObject = function (it) {
  if (!isObject(it)) {
    throw TypeError(String(it) + ' is not an object');
  }

  return it;
};

var nativeDefineProperty = Object.defineProperty; // `Object.defineProperty` method
// https://tc39.github.io/ecma262/#sec-object.defineproperty

var f$2 = descriptors ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (ie8DomDefine) try {
    return nativeDefineProperty(O, P, Attributes);
  } catch (error) {
    /* empty */
  }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};
var objectDefineProperty = {
  f: f$2
};

var createNonEnumerableProperty = descriptors ? function (object, key, value) {
  return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var setGlobal = function (key, value) {
  try {
    createNonEnumerableProperty(global_1, key, value);
  } catch (error) {
    global_1[key] = value;
  }

  return value;
};

var SHARED = '__core-js_shared__';
var store = global_1[SHARED] || setGlobal(SHARED, {});
var sharedStore = store;

var functionToString = Function.toString; // this helper broken in `3.4.1-3.4.4`, so we can't use `shared` helper

if (typeof sharedStore.inspectSource != 'function') {
  sharedStore.inspectSource = function (it) {
    return functionToString.call(it);
  };
}

var inspectSource = sharedStore.inspectSource;

var WeakMap = global_1.WeakMap;
var nativeWeakMap = typeof WeakMap === 'function' && /native code/.test(inspectSource(WeakMap));

var shared = createCommonjsModule(function (module) {
  (module.exports = function (key, value) {
    return sharedStore[key] || (sharedStore[key] = value !== undefined ? value : {});
  })('versions', []).push({
    version: '3.6.4',
    mode:  'global',
    copyright: '© 2020 Denis Pushkarev (zloirock.ru)'
  });
});

var id = 0;
var postfix = Math.random();

var uid = function (key) {
  return 'Symbol(' + String(key === undefined ? '' : key) + ')_' + (++id + postfix).toString(36);
};

var keys = shared('keys');

var sharedKey = function (key) {
  return keys[key] || (keys[key] = uid(key));
};

var hiddenKeys = {};

var WeakMap$1 = global_1.WeakMap;
var set, get, has$1;

var enforce = function (it) {
  return has$1(it) ? get(it) : set(it, {});
};

var getterFor = function (TYPE) {
  return function (it) {
    var state;

    if (!isObject(it) || (state = get(it)).type !== TYPE) {
      throw TypeError('Incompatible receiver, ' + TYPE + ' required');
    }

    return state;
  };
};

if (nativeWeakMap) {
  var store$1 = new WeakMap$1();
  var wmget = store$1.get;
  var wmhas = store$1.has;
  var wmset = store$1.set;

  set = function (it, metadata) {
    wmset.call(store$1, it, metadata);
    return metadata;
  };

  get = function (it) {
    return wmget.call(store$1, it) || {};
  };

  has$1 = function (it) {
    return wmhas.call(store$1, it);
  };
} else {
  var STATE = sharedKey('state');
  hiddenKeys[STATE] = true;

  set = function (it, metadata) {
    createNonEnumerableProperty(it, STATE, metadata);
    return metadata;
  };

  get = function (it) {
    return has(it, STATE) ? it[STATE] : {};
  };

  has$1 = function (it) {
    return has(it, STATE);
  };
}

var internalState = {
  set: set,
  get: get,
  has: has$1,
  enforce: enforce,
  getterFor: getterFor
};

var redefine = createCommonjsModule(function (module) {
  var getInternalState = internalState.get;
  var enforceInternalState = internalState.enforce;
  var TEMPLATE = String(String).split('String');
  (module.exports = function (O, key, value, options) {
    var unsafe = options ? !!options.unsafe : false;
    var simple = options ? !!options.enumerable : false;
    var noTargetGet = options ? !!options.noTargetGet : false;

    if (typeof value == 'function') {
      if (typeof key == 'string' && !has(value, 'name')) createNonEnumerableProperty(value, 'name', key);
      enforceInternalState(value).source = TEMPLATE.join(typeof key == 'string' ? key : '');
    }

    if (O === global_1) {
      if (simple) O[key] = value;else setGlobal(key, value);
      return;
    } else if (!unsafe) {
      delete O[key];
    } else if (!noTargetGet && O[key]) {
      simple = true;
    }

    if (simple) O[key] = value;else createNonEnumerableProperty(O, key, value); // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
  })(Function.prototype, 'toString', function toString() {
    return typeof this == 'function' && getInternalState(this).source || inspectSource(this);
  });
});

var path = global_1;

var aFunction = function (variable) {
  return typeof variable == 'function' ? variable : undefined;
};

var getBuiltIn = function (namespace, method) {
  return arguments.length < 2 ? aFunction(path[namespace]) || aFunction(global_1[namespace]) : path[namespace] && path[namespace][method] || global_1[namespace] && global_1[namespace][method];
};

var ceil = Math.ceil;
var floor = Math.floor; // `ToInteger` abstract operation
// https://tc39.github.io/ecma262/#sec-tointeger

var toInteger = function (argument) {
  return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
};

var min = Math.min; // `ToLength` abstract operation
// https://tc39.github.io/ecma262/#sec-tolength

var toLength = function (argument) {
  return argument > 0 ? min(toInteger(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
};

var max = Math.max;
var min$1 = Math.min; // Helper for a popular repeating case of the spec:
// Let integer be ? ToInteger(index).
// If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).

var toAbsoluteIndex = function (index, length) {
  var integer = toInteger(index);
  return integer < 0 ? max(integer + length, 0) : min$1(integer, length);
};

var createMethod = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIndexedObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value; // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare

    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++]; // eslint-disable-next-line no-self-compare

      if (value != value) return true; // Array#indexOf ignores holes, Array#includes - not
    } else for (; length > index; index++) {
      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
    }
    return !IS_INCLUDES && -1;
  };
};

var arrayIncludes = {
  // `Array.prototype.includes` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  includes: createMethod(true),
  // `Array.prototype.indexOf` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
  indexOf: createMethod(false)
};

var indexOf = arrayIncludes.indexOf;

var objectKeysInternal = function (object, names) {
  var O = toIndexedObject(object);
  var i = 0;
  var result = [];
  var key;

  for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key); // Don't enum bug & hidden keys


  while (names.length > i) if (has(O, key = names[i++])) {
    ~indexOf(result, key) || result.push(key);
  }

  return result;
};

// IE8- don't enum bug keys
var enumBugKeys = ['constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf'];

var hiddenKeys$1 = enumBugKeys.concat('length', 'prototype'); // `Object.getOwnPropertyNames` method
// https://tc39.github.io/ecma262/#sec-object.getownpropertynames

var f$3 = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return objectKeysInternal(O, hiddenKeys$1);
};

var objectGetOwnPropertyNames = {
  f: f$3
};

var f$4 = Object.getOwnPropertySymbols;
var objectGetOwnPropertySymbols = {
  f: f$4
};

var ownKeys = getBuiltIn('Reflect', 'ownKeys') || function ownKeys(it) {
  var keys = objectGetOwnPropertyNames.f(anObject(it));
  var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
  return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
};

var copyConstructorProperties = function (target, source) {
  var keys = ownKeys(source);
  var defineProperty = objectDefineProperty.f;
  var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!has(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
  }
};

var replacement = /#|\.prototype\./;

var isForced = function (feature, detection) {
  var value = data[normalize(feature)];
  return value == POLYFILL ? true : value == NATIVE ? false : typeof detection == 'function' ? fails(detection) : !!detection;
};

var normalize = isForced.normalize = function (string) {
  return String(string).replace(replacement, '.').toLowerCase();
};

var data = isForced.data = {};
var NATIVE = isForced.NATIVE = 'N';
var POLYFILL = isForced.POLYFILL = 'P';
var isForced_1 = isForced;

var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;
/*
  options.target      - name of the target object
  options.global      - target is the global object
  options.stat        - export as static methods of target
  options.proto       - export as prototype methods of target
  options.real        - real prototype method for the `pure` version
  options.forced      - export even if the native feature is available
  options.bind        - bind methods to the target, required for the `pure` version
  options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
  options.unsafe      - use the simple assignment of property instead of delete + defineProperty
  options.sham        - add a flag to not completely full polyfills
  options.enumerable  - export as enumerable property
  options.noTargetGet - prevent calling a getter on target
*/

var _export = function (options, source) {
  var TARGET = options.target;
  var GLOBAL = options.global;
  var STATIC = options.stat;
  var FORCED, target, key, targetProperty, sourceProperty, descriptor;

  if (GLOBAL) {
    target = global_1;
  } else if (STATIC) {
    target = global_1[TARGET] || setGlobal(TARGET, {});
  } else {
    target = (global_1[TARGET] || {}).prototype;
  }

  if (target) for (key in source) {
    sourceProperty = source[key];

    if (options.noTargetGet) {
      descriptor = getOwnPropertyDescriptor$1(target, key);
      targetProperty = descriptor && descriptor.value;
    } else targetProperty = target[key];

    FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced); // contained in target

    if (!FORCED && targetProperty !== undefined) {
      if (typeof sourceProperty === typeof targetProperty) continue;
      copyConstructorProperties(sourceProperty, targetProperty);
    } // add a flag to not completely full polyfills


    if (options.sham || targetProperty && targetProperty.sham) {
      createNonEnumerableProperty(sourceProperty, 'sham', true);
    } // extend global


    redefine(target, key, sourceProperty, options);
  }
};

// https://tc39.github.io/ecma262/#sec-isarray

var isArray = Array.isArray || function isArray(arg) {
  return classofRaw(arg) == 'Array';
};

// https://tc39.github.io/ecma262/#sec-toobject

var toObject = function (argument) {
  return Object(requireObjectCoercible(argument));
};

var createProperty = function (object, key, value) {
  var propertyKey = toPrimitive(key);
  if (propertyKey in object) objectDefineProperty.f(object, propertyKey, createPropertyDescriptor(0, value));else object[propertyKey] = value;
};

var nativeSymbol = !!Object.getOwnPropertySymbols && !fails(function () {
  // Chrome 38 Symbol has incorrect toString conversion
  // eslint-disable-next-line no-undef
  return !String(Symbol());
});

var useSymbolAsUid = nativeSymbol // eslint-disable-next-line no-undef
&& !Symbol.sham // eslint-disable-next-line no-undef
&& typeof Symbol.iterator == 'symbol';

var WellKnownSymbolsStore = shared('wks');
var Symbol$1 = global_1.Symbol;
var createWellKnownSymbol = useSymbolAsUid ? Symbol$1 : Symbol$1 && Symbol$1.withoutSetter || uid;

var wellKnownSymbol = function (name) {
  if (!has(WellKnownSymbolsStore, name)) {
    if (nativeSymbol && has(Symbol$1, name)) WellKnownSymbolsStore[name] = Symbol$1[name];else WellKnownSymbolsStore[name] = createWellKnownSymbol('Symbol.' + name);
  }

  return WellKnownSymbolsStore[name];
};

var SPECIES = wellKnownSymbol('species'); // `ArraySpeciesCreate` abstract operation
// https://tc39.github.io/ecma262/#sec-arrayspeciescreate

var arraySpeciesCreate = function (originalArray, length) {
  var C;

  if (isArray(originalArray)) {
    C = originalArray.constructor; // cross-realm fallback

    if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;else if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  }

  return new (C === undefined ? Array : C)(length === 0 ? 0 : length);
};

var engineUserAgent = getBuiltIn('navigator', 'userAgent') || '';

var process = global_1.process;
var versions = process && process.versions;
var v8 = versions && versions.v8;
var match, version;

if (v8) {
  match = v8.split('.');
  version = match[0] + match[1];
} else if (engineUserAgent) {
  match = engineUserAgent.match(/Edge\/(\d+)/);

  if (!match || match[1] >= 74) {
    match = engineUserAgent.match(/Chrome\/(\d+)/);
    if (match) version = match[1];
  }
}

var engineV8Version = version && +version;

var SPECIES$1 = wellKnownSymbol('species');

var arrayMethodHasSpeciesSupport = function (METHOD_NAME) {
  // We can't use this feature detection in V8 since it causes
  // deoptimization and serious performance degradation
  // https://github.com/zloirock/core-js/issues/677
  return engineV8Version >= 51 || !fails(function () {
    var array = [];
    var constructor = array.constructor = {};

    constructor[SPECIES$1] = function () {
      return {
        foo: 1
      };
    };

    return array[METHOD_NAME](Boolean).foo !== 1;
  });
};

var IS_CONCAT_SPREADABLE = wellKnownSymbol('isConcatSpreadable');
var MAX_SAFE_INTEGER = 0x1FFFFFFFFFFFFF;
var MAXIMUM_ALLOWED_INDEX_EXCEEDED = 'Maximum allowed index exceeded'; // We can't use this feature detection in V8 since it causes
// deoptimization and serious performance degradation
// https://github.com/zloirock/core-js/issues/679

var IS_CONCAT_SPREADABLE_SUPPORT = engineV8Version >= 51 || !fails(function () {
  var array = [];
  array[IS_CONCAT_SPREADABLE] = false;
  return array.concat()[0] !== array;
});
var SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('concat');

var isConcatSpreadable = function (O) {
  if (!isObject(O)) return false;
  var spreadable = O[IS_CONCAT_SPREADABLE];
  return spreadable !== undefined ? !!spreadable : isArray(O);
};

var FORCED = !IS_CONCAT_SPREADABLE_SUPPORT || !SPECIES_SUPPORT; // `Array.prototype.concat` method
// https://tc39.github.io/ecma262/#sec-array.prototype.concat
// with adding support of @@isConcatSpreadable and @@species

_export({
  target: 'Array',
  proto: true,
  forced: FORCED
}, {
  concat: function concat(arg) {
    // eslint-disable-line no-unused-vars
    var O = toObject(this);
    var A = arraySpeciesCreate(O, 0);
    var n = 0;
    var i, k, length, len, E;

    for (i = -1, length = arguments.length; i < length; i++) {
      E = i === -1 ? O : arguments[i];

      if (isConcatSpreadable(E)) {
        len = toLength(E.length);
        if (n + len > MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);

        for (k = 0; k < len; k++, n++) if (k in E) createProperty(A, n, E[k]);
      } else {
        if (n >= MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
        createProperty(A, n++, E);
      }
    }

    A.length = n;
    return A;
  }
});

var aFunction$1 = function (it) {
  if (typeof it != 'function') {
    throw TypeError(String(it) + ' is not a function');
  }

  return it;
};

var functionBindContext = function (fn, that, length) {
  aFunction$1(fn);
  if (that === undefined) return fn;

  switch (length) {
    case 0:
      return function () {
        return fn.call(that);
      };

    case 1:
      return function (a) {
        return fn.call(that, a);
      };

    case 2:
      return function (a, b) {
        return fn.call(that, a, b);
      };

    case 3:
      return function (a, b, c) {
        return fn.call(that, a, b, c);
      };
  }

  return function ()
  /* ...args */
  {
    return fn.apply(that, arguments);
  };
};

var push = [].push; // `Array.prototype.{ forEach, map, filter, some, every, find, findIndex }` methods implementation

var createMethod$1 = function (TYPE) {
  var IS_MAP = TYPE == 1;
  var IS_FILTER = TYPE == 2;
  var IS_SOME = TYPE == 3;
  var IS_EVERY = TYPE == 4;
  var IS_FIND_INDEX = TYPE == 6;
  var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
  return function ($this, callbackfn, that, specificCreate) {
    var O = toObject($this);
    var self = indexedObject(O);
    var boundFunction = functionBindContext(callbackfn, that, 3);
    var length = toLength(self.length);
    var index = 0;
    var create = specificCreate || arraySpeciesCreate;
    var target = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
    var value, result;

    for (; length > index; index++) if (NO_HOLES || index in self) {
      value = self[index];
      result = boundFunction(value, index, O);

      if (TYPE) {
        if (IS_MAP) target[index] = result; // map
        else if (result) switch (TYPE) {
            case 3:
              return true;
            // some

            case 5:
              return value;
            // find

            case 6:
              return index;
            // findIndex

            case 2:
              push.call(target, value);
            // filter
          } else if (IS_EVERY) return false; // every
      }
    }

    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
  };
};

var arrayIteration = {
  // `Array.prototype.forEach` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.foreach
  forEach: createMethod$1(0),
  // `Array.prototype.map` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.map
  map: createMethod$1(1),
  // `Array.prototype.filter` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.filter
  filter: createMethod$1(2),
  // `Array.prototype.some` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.some
  some: createMethod$1(3),
  // `Array.prototype.every` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.every
  every: createMethod$1(4),
  // `Array.prototype.find` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.find
  find: createMethod$1(5),
  // `Array.prototype.findIndex` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
  findIndex: createMethod$1(6)
};

// https://tc39.github.io/ecma262/#sec-object.keys

var objectKeys = Object.keys || function keys(O) {
  return objectKeysInternal(O, enumBugKeys);
};

// https://tc39.github.io/ecma262/#sec-object.defineproperties

var objectDefineProperties = descriptors ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = objectKeys(Properties);
  var length = keys.length;
  var index = 0;
  var key;

  while (length > index) objectDefineProperty.f(O, key = keys[index++], Properties[key]);

  return O;
};

var html = getBuiltIn('document', 'documentElement');

var GT = '>';
var LT = '<';
var PROTOTYPE = 'prototype';
var SCRIPT = 'script';
var IE_PROTO = sharedKey('IE_PROTO');

var EmptyConstructor = function () {
  /* empty */
};

var scriptTag = function (content) {
  return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
}; // Create object with fake `null` prototype: use ActiveX Object with cleared prototype


var NullProtoObjectViaActiveX = function (activeXDocument) {
  activeXDocument.write(scriptTag(''));
  activeXDocument.close();
  var temp = activeXDocument.parentWindow.Object;
  activeXDocument = null; // avoid memory leak

  return temp;
}; // Create object with fake `null` prototype: use iframe Object with cleared prototype


var NullProtoObjectViaIFrame = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = documentCreateElement('iframe');
  var JS = 'java' + SCRIPT + ':';
  var iframeDocument;
  iframe.style.display = 'none';
  html.appendChild(iframe); // https://github.com/zloirock/core-js/issues/475

  iframe.src = String(JS);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(scriptTag('document.F=Object'));
  iframeDocument.close();
  return iframeDocument.F;
}; // Check for document.domain and active x support
// No need to use active x approach when document.domain is not set
// see https://github.com/es-shims/es5-shim/issues/150
// variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
// avoid IE GC bug


var activeXDocument;

var NullProtoObject = function () {
  try {
    /* global ActiveXObject */
    activeXDocument = document.domain && new ActiveXObject('htmlfile');
  } catch (error) {
    /* ignore */
  }

  NullProtoObject = activeXDocument ? NullProtoObjectViaActiveX(activeXDocument) : NullProtoObjectViaIFrame();
  var length = enumBugKeys.length;

  while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];

  return NullProtoObject();
};

hiddenKeys[IE_PROTO] = true; // `Object.create` method
// https://tc39.github.io/ecma262/#sec-object.create

var objectCreate = Object.create || function create(O, Properties) {
  var result;

  if (O !== null) {
    EmptyConstructor[PROTOTYPE] = anObject(O);
    result = new EmptyConstructor();
    EmptyConstructor[PROTOTYPE] = null; // add "__proto__" for Object.getPrototypeOf polyfill

    result[IE_PROTO] = O;
  } else result = NullProtoObject();

  return Properties === undefined ? result : objectDefineProperties(result, Properties);
};

var UNSCOPABLES = wellKnownSymbol('unscopables');
var ArrayPrototype = Array.prototype; // Array.prototype[@@unscopables]
// https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables

if (ArrayPrototype[UNSCOPABLES] == undefined) {
  objectDefineProperty.f(ArrayPrototype, UNSCOPABLES, {
    configurable: true,
    value: objectCreate(null)
  });
} // add a key to Array.prototype[@@unscopables]


var addToUnscopables = function (key) {
  ArrayPrototype[UNSCOPABLES][key] = true;
};

var defineProperty = Object.defineProperty;
var cache = {};

var thrower = function (it) {
  throw it;
};

var arrayMethodUsesToLength = function (METHOD_NAME, options) {
  if (has(cache, METHOD_NAME)) return cache[METHOD_NAME];
  if (!options) options = {};
  var method = [][METHOD_NAME];
  var ACCESSORS = has(options, 'ACCESSORS') ? options.ACCESSORS : false;
  var argument0 = has(options, 0) ? options[0] : thrower;
  var argument1 = has(options, 1) ? options[1] : undefined;
  return cache[METHOD_NAME] = !!method && !fails(function () {
    if (ACCESSORS && !descriptors) return true;
    var O = {
      length: -1
    };
    if (ACCESSORS) defineProperty(O, 1, {
      enumerable: true,
      get: thrower
    });else O[1] = 1;
    method.call(O, argument0, argument1);
  });
};

var $find = arrayIteration.find;
var FIND = 'find';
var SKIPS_HOLES = true;
var USES_TO_LENGTH = arrayMethodUsesToLength(FIND); // Shouldn't skip holes

if (FIND in []) Array(1)[FIND](function () {
  SKIPS_HOLES = false;
}); // `Array.prototype.find` method
// https://tc39.github.io/ecma262/#sec-array.prototype.find

_export({
  target: 'Array',
  proto: true,
  forced: SKIPS_HOLES || !USES_TO_LENGTH
}, {
  find: function find(callbackfn
  /* , that = undefined */
  ) {
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
}); // https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables

addToUnscopables(FIND);

var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('slice');
var USES_TO_LENGTH$1 = arrayMethodUsesToLength('slice', {
  ACCESSORS: true,
  0: 0,
  1: 2
});
var SPECIES$2 = wellKnownSymbol('species');
var nativeSlice = [].slice;
var max$1 = Math.max; // `Array.prototype.slice` method
// https://tc39.github.io/ecma262/#sec-array.prototype.slice
// fallback for not array-like ES3 strings and DOM objects

_export({
  target: 'Array',
  proto: true,
  forced: !HAS_SPECIES_SUPPORT || !USES_TO_LENGTH$1
}, {
  slice: function slice(start, end) {
    var O = toIndexedObject(this);
    var length = toLength(O.length);
    var k = toAbsoluteIndex(start, length);
    var fin = toAbsoluteIndex(end === undefined ? length : end, length); // inline `ArraySpeciesCreate` for usage native `Array#slice` where it's possible

    var Constructor, result, n;

    if (isArray(O)) {
      Constructor = O.constructor; // cross-realm fallback

      if (typeof Constructor == 'function' && (Constructor === Array || isArray(Constructor.prototype))) {
        Constructor = undefined;
      } else if (isObject(Constructor)) {
        Constructor = Constructor[SPECIES$2];
        if (Constructor === null) Constructor = undefined;
      }

      if (Constructor === Array || Constructor === undefined) {
        return nativeSlice.call(O, k, fin);
      }
    }

    result = new (Constructor === undefined ? Array : Constructor)(max$1(fin - k, 0));

    for (n = 0; k < fin; k++, n++) if (k in O) createProperty(result, n, O[k]);

    result.length = n;
    return result;
  }
});

var slice = [].slice;
var factories = {};

var construct = function (C, argsLength, args) {
  if (!(argsLength in factories)) {
    for (var list = [], i = 0; i < argsLength; i++) list[i] = 'a[' + i + ']'; // eslint-disable-next-line no-new-func


    factories[argsLength] = Function('C,a', 'return new C(' + list.join(',') + ')');
  }

  return factories[argsLength](C, args);
}; // `Function.prototype.bind` method implementation
// https://tc39.github.io/ecma262/#sec-function.prototype.bind


var functionBind = Function.bind || function bind(that
/* , ...args */
) {
  var fn = aFunction$1(this);
  var partArgs = slice.call(arguments, 1);

  var boundFunction = function bound()
  /* args... */
  {
    var args = partArgs.concat(slice.call(arguments));
    return this instanceof boundFunction ? construct(fn, args.length, args) : fn.apply(that, args);
  };

  if (isObject(fn.prototype)) boundFunction.prototype = fn.prototype;
  return boundFunction;
};

// https://tc39.github.io/ecma262/#sec-function.prototype.bind

_export({
  target: 'Function',
  proto: true
}, {
  bind: functionBind
});

// `Math.sign` method implementation
// https://tc39.github.io/ecma262/#sec-math.sign
var mathSign = Math.sign || function sign(x) {
  // eslint-disable-next-line no-self-compare
  return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
};

// https://tc39.github.io/ecma262/#sec-math.sign

_export({
  target: 'Math',
  stat: true
}, {
  sign: mathSign
});

// https://tc39.github.io/ecma262/#sec-thisnumbervalue

var thisNumberValue = function (value) {
  if (typeof value != 'number' && classofRaw(value) != 'Number') {
    throw TypeError('Incorrect invocation');
  }

  return +value;
};

// https://tc39.github.io/ecma262/#sec-string.prototype.repeat


var stringRepeat = ''.repeat || function repeat(count) {
  var str = String(requireObjectCoercible(this));
  var result = '';
  var n = toInteger(count);
  if (n < 0 || n == Infinity) throw RangeError('Wrong number of repetitions');

  for (; n > 0; (n >>>= 1) && (str += str)) if (n & 1) result += str;

  return result;
};

var nativeToFixed = 1.0.toFixed;
var floor$1 = Math.floor;

var pow = function (x, n, acc) {
  return n === 0 ? acc : n % 2 === 1 ? pow(x, n - 1, acc * x) : pow(x * x, n / 2, acc);
};

var log = function (x) {
  var n = 0;
  var x2 = x;

  while (x2 >= 4096) {
    n += 12;
    x2 /= 4096;
  }

  while (x2 >= 2) {
    n += 1;
    x2 /= 2;
  }

  return n;
};

var FORCED$1 = nativeToFixed && (0.00008.toFixed(3) !== '0.000' || 0.9.toFixed(0) !== '1' || 1.255.toFixed(2) !== '1.25' || 1000000000000000128.0.toFixed(0) !== '1000000000000000128') || !fails(function () {
  // V8 ~ Android 4.3-
  nativeToFixed.call({});
}); // `Number.prototype.toFixed` method
// https://tc39.github.io/ecma262/#sec-number.prototype.tofixed

_export({
  target: 'Number',
  proto: true,
  forced: FORCED$1
}, {
  // eslint-disable-next-line max-statements
  toFixed: function toFixed(fractionDigits) {
    var number = thisNumberValue(this);
    var fractDigits = toInteger(fractionDigits);
    var data = [0, 0, 0, 0, 0, 0];
    var sign = '';
    var result = '0';
    var e, z, j, k;

    var multiply = function (n, c) {
      var index = -1;
      var c2 = c;

      while (++index < 6) {
        c2 += n * data[index];
        data[index] = c2 % 1e7;
        c2 = floor$1(c2 / 1e7);
      }
    };

    var divide = function (n) {
      var index = 6;
      var c = 0;

      while (--index >= 0) {
        c += data[index];
        data[index] = floor$1(c / n);
        c = c % n * 1e7;
      }
    };

    var dataToString = function () {
      var index = 6;
      var s = '';

      while (--index >= 0) {
        if (s !== '' || index === 0 || data[index] !== 0) {
          var t = String(data[index]);
          s = s === '' ? t : s + stringRepeat.call('0', 7 - t.length) + t;
        }
      }

      return s;
    };

    if (fractDigits < 0 || fractDigits > 20) throw RangeError('Incorrect fraction digits'); // eslint-disable-next-line no-self-compare

    if (number != number) return 'NaN';
    if (number <= -1e21 || number >= 1e21) return String(number);

    if (number < 0) {
      sign = '-';
      number = -number;
    }

    if (number > 1e-21) {
      e = log(number * pow(2, 69, 1)) - 69;
      z = e < 0 ? number * pow(2, -e, 1) : number / pow(2, e, 1);
      z *= 0x10000000000000;
      e = 52 - e;

      if (e > 0) {
        multiply(0, z);
        j = fractDigits;

        while (j >= 7) {
          multiply(1e7, 0);
          j -= 7;
        }

        multiply(pow(10, j, 1), 0);
        j = e - 1;

        while (j >= 23) {
          divide(1 << 23);
          j -= 23;
        }

        divide(1 << j);
        multiply(1, 1);
        divide(2);
        result = dataToString();
      } else {
        multiply(0, z);
        multiply(1 << -e, 0);
        result = dataToString() + stringRepeat.call('0', fractDigits);
      }
    }

    if (fractDigits > 0) {
      k = result.length;
      result = sign + (k <= fractDigits ? '0.' + stringRepeat.call('0', fractDigits - k) + result : result.slice(0, k - fractDigits) + '.' + result.slice(k - fractDigits));
    } else {
      result = sign + result;
    }

    return result;
  }
});

var TO_STRING_TAG = wellKnownSymbol('toStringTag');
var test = {};
test[TO_STRING_TAG] = 'z';
var toStringTagSupport = String(test) === '[object z]';

var TO_STRING_TAG$1 = wellKnownSymbol('toStringTag'); // ES3 wrong here

var CORRECT_ARGUMENTS = classofRaw(function () {
  return arguments;
}()) == 'Arguments'; // fallback for IE11 Script Access Denied error

var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (error) {
    /* empty */
  }
}; // getting tag from ES6+ `Object.prototype.toString`


var classof = toStringTagSupport ? classofRaw : function (it) {
  var O, tag, result;
  return it === undefined ? 'Undefined' : it === null ? 'Null' // @@toStringTag case
  : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG$1)) == 'string' ? tag // builtinTag case
  : CORRECT_ARGUMENTS ? classofRaw(O) // ES3 arguments fallback
  : (result = classofRaw(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : result;
};

// https://tc39.github.io/ecma262/#sec-object.prototype.tostring


var objectToString = toStringTagSupport ? {}.toString : function toString() {
  return '[object ' + classof(this) + ']';
};

// https://tc39.github.io/ecma262/#sec-object.prototype.tostring

if (!toStringTagSupport) {
  redefine(Object.prototype, 'toString', objectToString, {
    unsafe: true
  });
}

// a string of all valid unicode whitespaces
// eslint-disable-next-line max-len
var whitespaces = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

var whitespace = '[' + whitespaces + ']';
var ltrim = RegExp('^' + whitespace + whitespace + '*');
var rtrim = RegExp(whitespace + whitespace + '*$'); // `String.prototype.{ trim, trimStart, trimEnd, trimLeft, trimRight }` methods implementation

var createMethod$2 = function (TYPE) {
  return function ($this) {
    var string = String(requireObjectCoercible($this));
    if (TYPE & 1) string = string.replace(ltrim, '');
    if (TYPE & 2) string = string.replace(rtrim, '');
    return string;
  };
};

var stringTrim = {
  // `String.prototype.{ trimLeft, trimStart }` methods
  // https://tc39.github.io/ecma262/#sec-string.prototype.trimstart
  start: createMethod$2(1),
  // `String.prototype.{ trimRight, trimEnd }` methods
  // https://tc39.github.io/ecma262/#sec-string.prototype.trimend
  end: createMethod$2(2),
  // `String.prototype.trim` method
  // https://tc39.github.io/ecma262/#sec-string.prototype.trim
  trim: createMethod$2(3)
};

var trim = stringTrim.trim;
var $parseFloat = global_1.parseFloat;
var FORCED$2 = 1 / $parseFloat(whitespaces + '-0') !== -Infinity; // `parseFloat` method
// https://tc39.github.io/ecma262/#sec-parsefloat-string

var numberParseFloat = FORCED$2 ? function parseFloat(string) {
  var trimmedString = trim(String(string));
  var result = $parseFloat(trimmedString);
  return result === 0 && trimmedString.charAt(0) == '-' ? -0 : result;
} : $parseFloat;

// https://tc39.github.io/ecma262/#sec-parsefloat-string

_export({
  global: true,
  forced: parseFloat != numberParseFloat
}, {
  parseFloat: numberParseFloat
});

var nativePromiseConstructor = global_1.Promise;

var redefineAll = function (target, src, options) {
  for (var key in src) redefine(target, key, src[key], options);

  return target;
};

var defineProperty$1 = objectDefineProperty.f;
var TO_STRING_TAG$2 = wellKnownSymbol('toStringTag');

var setToStringTag = function (it, TAG, STATIC) {
  if (it && !has(it = STATIC ? it : it.prototype, TO_STRING_TAG$2)) {
    defineProperty$1(it, TO_STRING_TAG$2, {
      configurable: true,
      value: TAG
    });
  }
};

var SPECIES$3 = wellKnownSymbol('species');

var setSpecies = function (CONSTRUCTOR_NAME) {
  var Constructor = getBuiltIn(CONSTRUCTOR_NAME);
  var defineProperty = objectDefineProperty.f;

  if (descriptors && Constructor && !Constructor[SPECIES$3]) {
    defineProperty(Constructor, SPECIES$3, {
      configurable: true,
      get: function () {
        return this;
      }
    });
  }
};

var anInstance = function (it, Constructor, name) {
  if (!(it instanceof Constructor)) {
    throw TypeError('Incorrect ' + (name ? name + ' ' : '') + 'invocation');
  }

  return it;
};

var iterators = {};

var ITERATOR = wellKnownSymbol('iterator');
var ArrayPrototype$1 = Array.prototype; // check on default Array iterator

var isArrayIteratorMethod = function (it) {
  return it !== undefined && (iterators.Array === it || ArrayPrototype$1[ITERATOR] === it);
};

var ITERATOR$1 = wellKnownSymbol('iterator');

var getIteratorMethod = function (it) {
  if (it != undefined) return it[ITERATOR$1] || it['@@iterator'] || iterators[classof(it)];
};

var callWithSafeIterationClosing = function (iterator, fn, value, ENTRIES) {
  try {
    return ENTRIES ? fn(anObject(value)[0], value[1]) : fn(value); // 7.4.6 IteratorClose(iterator, completion)
  } catch (error) {
    var returnMethod = iterator['return'];
    if (returnMethod !== undefined) anObject(returnMethod.call(iterator));
    throw error;
  }
};

var iterate_1 = createCommonjsModule(function (module) {
  var Result = function (stopped, result) {
    this.stopped = stopped;
    this.result = result;
  };

  var iterate = module.exports = function (iterable, fn, that, AS_ENTRIES, IS_ITERATOR) {
    var boundFunction = functionBindContext(fn, that, AS_ENTRIES ? 2 : 1);
    var iterator, iterFn, index, length, result, next, step;

    if (IS_ITERATOR) {
      iterator = iterable;
    } else {
      iterFn = getIteratorMethod(iterable);
      if (typeof iterFn != 'function') throw TypeError('Target is not iterable'); // optimisation for array iterators

      if (isArrayIteratorMethod(iterFn)) {
        for (index = 0, length = toLength(iterable.length); length > index; index++) {
          result = AS_ENTRIES ? boundFunction(anObject(step = iterable[index])[0], step[1]) : boundFunction(iterable[index]);
          if (result && result instanceof Result) return result;
        }

        return new Result(false);
      }

      iterator = iterFn.call(iterable);
    }

    next = iterator.next;

    while (!(step = next.call(iterator)).done) {
      result = callWithSafeIterationClosing(iterator, boundFunction, step.value, AS_ENTRIES);
      if (typeof result == 'object' && result && result instanceof Result) return result;
    }

    return new Result(false);
  };

  iterate.stop = function (result) {
    return new Result(true, result);
  };
});

var ITERATOR$2 = wellKnownSymbol('iterator');
var SAFE_CLOSING = false;

try {
  var called = 0;
  var iteratorWithReturn = {
    next: function () {
      return {
        done: !!called++
      };
    },
    'return': function () {
      SAFE_CLOSING = true;
    }
  };

  iteratorWithReturn[ITERATOR$2] = function () {
    return this;
  }; // eslint-disable-next-line no-throw-literal


  Array.from(iteratorWithReturn, function () {
    throw 2;
  });
} catch (error) {
  /* empty */
}

var checkCorrectnessOfIteration = function (exec, SKIP_CLOSING) {
  if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
  var ITERATION_SUPPORT = false;

  try {
    var object = {};

    object[ITERATOR$2] = function () {
      return {
        next: function () {
          return {
            done: ITERATION_SUPPORT = true
          };
        }
      };
    };

    exec(object);
  } catch (error) {
    /* empty */
  }

  return ITERATION_SUPPORT;
};

var SPECIES$4 = wellKnownSymbol('species'); // `SpeciesConstructor` abstract operation
// https://tc39.github.io/ecma262/#sec-speciesconstructor

var speciesConstructor = function (O, defaultConstructor) {
  var C = anObject(O).constructor;
  var S;
  return C === undefined || (S = anObject(C)[SPECIES$4]) == undefined ? defaultConstructor : aFunction$1(S);
};

var engineIsIos = /(iphone|ipod|ipad).*applewebkit/i.test(engineUserAgent);

var location = global_1.location;
var set$1 = global_1.setImmediate;
var clear = global_1.clearImmediate;
var process$1 = global_1.process;
var MessageChannel = global_1.MessageChannel;
var Dispatch = global_1.Dispatch;
var counter = 0;
var queue = {};
var ONREADYSTATECHANGE = 'onreadystatechange';
var defer, channel, port;

var run = function (id) {
  // eslint-disable-next-line no-prototype-builtins
  if (queue.hasOwnProperty(id)) {
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};

var runner = function (id) {
  return function () {
    run(id);
  };
};

var listener = function (event) {
  run(event.data);
};

var post = function (id) {
  // old engines have not location.origin
  global_1.postMessage(id + '', location.protocol + '//' + location.host);
}; // Node.js 0.9+ & IE10+ has setImmediate, otherwise:


if (!set$1 || !clear) {
  set$1 = function setImmediate(fn) {
    var args = [];
    var i = 1;

    while (arguments.length > i) args.push(arguments[i++]);

    queue[++counter] = function () {
      // eslint-disable-next-line no-new-func
      (typeof fn == 'function' ? fn : Function(fn)).apply(undefined, args);
    };

    defer(counter);
    return counter;
  };

  clear = function clearImmediate(id) {
    delete queue[id];
  }; // Node.js 0.8-


  if (classofRaw(process$1) == 'process') {
    defer = function (id) {
      process$1.nextTick(runner(id));
    }; // Sphere (JS game engine) Dispatch API

  } else if (Dispatch && Dispatch.now) {
    defer = function (id) {
      Dispatch.now(runner(id));
    }; // Browsers with MessageChannel, includes WebWorkers
    // except iOS - https://github.com/zloirock/core-js/issues/624

  } else if (MessageChannel && !engineIsIos) {
    channel = new MessageChannel();
    port = channel.port2;
    channel.port1.onmessage = listener;
    defer = functionBindContext(port.postMessage, port, 1); // Browsers with postMessage, skip WebWorkers
    // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if (global_1.addEventListener && typeof postMessage == 'function' && !global_1.importScripts && !fails(post)) {
    defer = post;
    global_1.addEventListener('message', listener, false); // IE8-
  } else if (ONREADYSTATECHANGE in documentCreateElement('script')) {
    defer = function (id) {
      html.appendChild(documentCreateElement('script'))[ONREADYSTATECHANGE] = function () {
        html.removeChild(this);
        run(id);
      };
    }; // Rest old browsers

  } else {
    defer = function (id) {
      setTimeout(runner(id), 0);
    };
  }
}

var task = {
  set: set$1,
  clear: clear
};

var getOwnPropertyDescriptor$2 = objectGetOwnPropertyDescriptor.f;
var macrotask = task.set;
var MutationObserver = global_1.MutationObserver || global_1.WebKitMutationObserver;
var process$2 = global_1.process;
var Promise$1 = global_1.Promise;
var IS_NODE = classofRaw(process$2) == 'process'; // Node.js 11 shows ExperimentalWarning on getting `queueMicrotask`

var queueMicrotaskDescriptor = getOwnPropertyDescriptor$2(global_1, 'queueMicrotask');
var queueMicrotask = queueMicrotaskDescriptor && queueMicrotaskDescriptor.value;
var flush, head, last, notify, toggle, node, promise, then; // modern engines have queueMicrotask method

if (!queueMicrotask) {
  flush = function () {
    var parent, fn;
    if (IS_NODE && (parent = process$2.domain)) parent.exit();

    while (head) {
      fn = head.fn;
      head = head.next;

      try {
        fn();
      } catch (error) {
        if (head) notify();else last = undefined;
        throw error;
      }
    }

    last = undefined;
    if (parent) parent.enter();
  }; // Node.js


  if (IS_NODE) {
    notify = function () {
      process$2.nextTick(flush);
    }; // browsers with MutationObserver, except iOS - https://github.com/zloirock/core-js/issues/339

  } else if (MutationObserver && !engineIsIos) {
    toggle = true;
    node = document.createTextNode('');
    new MutationObserver(flush).observe(node, {
      characterData: true
    });

    notify = function () {
      node.data = toggle = !toggle;
    }; // environments with maybe non-completely correct, but existent Promise

  } else if (Promise$1 && Promise$1.resolve) {
    // Promise.resolve without an argument throws an error in LG WebOS 2
    promise = Promise$1.resolve(undefined);
    then = promise.then;

    notify = function () {
      then.call(promise, flush);
    }; // for other environments - macrotask based on:
    // - setImmediate
    // - MessageChannel
    // - window.postMessag
    // - onreadystatechange
    // - setTimeout

  } else {
    notify = function () {
      // strange IE + webpack dev server bug - use .call(global)
      macrotask.call(global_1, flush);
    };
  }
}

var microtask = queueMicrotask || function (fn) {
  var task = {
    fn: fn,
    next: undefined
  };
  if (last) last.next = task;

  if (!head) {
    head = task;
    notify();
  }

  last = task;
};

var PromiseCapability = function (C) {
  var resolve, reject;
  this.promise = new C(function ($$resolve, $$reject) {
    if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject = $$reject;
  });
  this.resolve = aFunction$1(resolve);
  this.reject = aFunction$1(reject);
}; // 25.4.1.5 NewPromiseCapability(C)


var f$5 = function (C) {
  return new PromiseCapability(C);
};

var newPromiseCapability = {
  f: f$5
};

var promiseResolve = function (C, x) {
  anObject(C);
  if (isObject(x) && x.constructor === C) return x;
  var promiseCapability = newPromiseCapability.f(C);
  var resolve = promiseCapability.resolve;
  resolve(x);
  return promiseCapability.promise;
};

var hostReportErrors = function (a, b) {
  var console = global_1.console;

  if (console && console.error) {
    arguments.length === 1 ? console.error(a) : console.error(a, b);
  }
};

var perform = function (exec) {
  try {
    return {
      error: false,
      value: exec()
    };
  } catch (error) {
    return {
      error: true,
      value: error
    };
  }
};

var task$1 = task.set;
var SPECIES$5 = wellKnownSymbol('species');
var PROMISE = 'Promise';
var getInternalState = internalState.get;
var setInternalState = internalState.set;
var getInternalPromiseState = internalState.getterFor(PROMISE);
var PromiseConstructor = nativePromiseConstructor;
var TypeError$1 = global_1.TypeError;
var document$2 = global_1.document;
var process$3 = global_1.process;
var $fetch = getBuiltIn('fetch');
var newPromiseCapability$1 = newPromiseCapability.f;
var newGenericPromiseCapability = newPromiseCapability$1;
var IS_NODE$1 = classofRaw(process$3) == 'process';
var DISPATCH_EVENT = !!(document$2 && document$2.createEvent && global_1.dispatchEvent);
var UNHANDLED_REJECTION = 'unhandledrejection';
var REJECTION_HANDLED = 'rejectionhandled';
var PENDING = 0;
var FULFILLED = 1;
var REJECTED = 2;
var HANDLED = 1;
var UNHANDLED = 2;
var Internal, OwnPromiseCapability, PromiseWrapper, nativeThen;
var FORCED$3 = isForced_1(PROMISE, function () {
  var GLOBAL_CORE_JS_PROMISE = inspectSource(PromiseConstructor) !== String(PromiseConstructor);

  if (!GLOBAL_CORE_JS_PROMISE) {
    // V8 6.6 (Node 10 and Chrome 66) have a bug with resolving custom thenables
    // https://bugs.chromium.org/p/chromium/issues/detail?id=830565
    // We can't detect it synchronously, so just check versions
    if (engineV8Version === 66) return true; // Unhandled rejections tracking support, NodeJS Promise without it fails @@species test

    if (!IS_NODE$1 && typeof PromiseRejectionEvent != 'function') return true;
  } // We need Promise#finally in the pure version for preventing prototype pollution
  // deoptimization and performance degradation
  // https://github.com/zloirock/core-js/issues/679

  if (engineV8Version >= 51 && /native code/.test(PromiseConstructor)) return false; // Detect correctness of subclassing with @@species support

  var promise = PromiseConstructor.resolve(1);

  var FakePromise = function (exec) {
    exec(function () {
      /* empty */
    }, function () {
      /* empty */
    });
  };

  var constructor = promise.constructor = {};
  constructor[SPECIES$5] = FakePromise;
  return !(promise.then(function () {
    /* empty */
  }) instanceof FakePromise);
});
var INCORRECT_ITERATION = FORCED$3 || !checkCorrectnessOfIteration(function (iterable) {
  PromiseConstructor.all(iterable)['catch'](function () {
    /* empty */
  });
}); // helpers

var isThenable = function (it) {
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};

var notify$1 = function (promise, state, isReject) {
  if (state.notified) return;
  state.notified = true;
  var chain = state.reactions;
  microtask(function () {
    var value = state.value;
    var ok = state.state == FULFILLED;
    var index = 0; // variable length - can't use forEach

    while (chain.length > index) {
      var reaction = chain[index++];
      var handler = ok ? reaction.ok : reaction.fail;
      var resolve = reaction.resolve;
      var reject = reaction.reject;
      var domain = reaction.domain;
      var result, then, exited;

      try {
        if (handler) {
          if (!ok) {
            if (state.rejection === UNHANDLED) onHandleUnhandled(promise, state);
            state.rejection = HANDLED;
          }

          if (handler === true) result = value;else {
            if (domain) domain.enter();
            result = handler(value); // can throw

            if (domain) {
              domain.exit();
              exited = true;
            }
          }

          if (result === reaction.promise) {
            reject(TypeError$1('Promise-chain cycle'));
          } else if (then = isThenable(result)) {
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch (error) {
        if (domain && !exited) domain.exit();
        reject(error);
      }
    }

    state.reactions = [];
    state.notified = false;
    if (isReject && !state.rejection) onUnhandled(promise, state);
  });
};

var dispatchEvent = function (name, promise, reason) {
  var event, handler;

  if (DISPATCH_EVENT) {
    event = document$2.createEvent('Event');
    event.promise = promise;
    event.reason = reason;
    event.initEvent(name, false, true);
    global_1.dispatchEvent(event);
  } else event = {
    promise: promise,
    reason: reason
  };

  if (handler = global_1['on' + name]) handler(event);else if (name === UNHANDLED_REJECTION) hostReportErrors('Unhandled promise rejection', reason);
};

var onUnhandled = function (promise, state) {
  task$1.call(global_1, function () {
    var value = state.value;
    var IS_UNHANDLED = isUnhandled(state);
    var result;

    if (IS_UNHANDLED) {
      result = perform(function () {
        if (IS_NODE$1) {
          process$3.emit('unhandledRejection', value, promise);
        } else dispatchEvent(UNHANDLED_REJECTION, promise, value);
      }); // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should

      state.rejection = IS_NODE$1 || isUnhandled(state) ? UNHANDLED : HANDLED;
      if (result.error) throw result.value;
    }
  });
};

var isUnhandled = function (state) {
  return state.rejection !== HANDLED && !state.parent;
};

var onHandleUnhandled = function (promise, state) {
  task$1.call(global_1, function () {
    if (IS_NODE$1) {
      process$3.emit('rejectionHandled', promise);
    } else dispatchEvent(REJECTION_HANDLED, promise, state.value);
  });
};

var bind = function (fn, promise, state, unwrap) {
  return function (value) {
    fn(promise, state, value, unwrap);
  };
};

var internalReject = function (promise, state, value, unwrap) {
  if (state.done) return;
  state.done = true;
  if (unwrap) state = unwrap;
  state.value = value;
  state.state = REJECTED;
  notify$1(promise, state, true);
};

var internalResolve = function (promise, state, value, unwrap) {
  if (state.done) return;
  state.done = true;
  if (unwrap) state = unwrap;

  try {
    if (promise === value) throw TypeError$1("Promise can't be resolved itself");
    var then = isThenable(value);

    if (then) {
      microtask(function () {
        var wrapper = {
          done: false
        };

        try {
          then.call(value, bind(internalResolve, promise, wrapper, state), bind(internalReject, promise, wrapper, state));
        } catch (error) {
          internalReject(promise, wrapper, error, state);
        }
      });
    } else {
      state.value = value;
      state.state = FULFILLED;
      notify$1(promise, state, false);
    }
  } catch (error) {
    internalReject(promise, {
      done: false
    }, error, state);
  }
}; // constructor polyfill


if (FORCED$3) {
  // 25.4.3.1 Promise(executor)
  PromiseConstructor = function Promise(executor) {
    anInstance(this, PromiseConstructor, PROMISE);
    aFunction$1(executor);
    Internal.call(this);
    var state = getInternalState(this);

    try {
      executor(bind(internalResolve, this, state), bind(internalReject, this, state));
    } catch (error) {
      internalReject(this, state, error);
    }
  }; // eslint-disable-next-line no-unused-vars


  Internal = function Promise(executor) {
    setInternalState(this, {
      type: PROMISE,
      done: false,
      notified: false,
      parent: false,
      reactions: [],
      rejection: false,
      state: PENDING,
      value: undefined
    });
  };

  Internal.prototype = redefineAll(PromiseConstructor.prototype, {
    // `Promise.prototype.then` method
    // https://tc39.github.io/ecma262/#sec-promise.prototype.then
    then: function then(onFulfilled, onRejected) {
      var state = getInternalPromiseState(this);
      var reaction = newPromiseCapability$1(speciesConstructor(this, PromiseConstructor));
      reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail = typeof onRejected == 'function' && onRejected;
      reaction.domain = IS_NODE$1 ? process$3.domain : undefined;
      state.parent = true;
      state.reactions.push(reaction);
      if (state.state != PENDING) notify$1(this, state, false);
      return reaction.promise;
    },
    // `Promise.prototype.catch` method
    // https://tc39.github.io/ecma262/#sec-promise.prototype.catch
    'catch': function (onRejected) {
      return this.then(undefined, onRejected);
    }
  });

  OwnPromiseCapability = function () {
    var promise = new Internal();
    var state = getInternalState(promise);
    this.promise = promise;
    this.resolve = bind(internalResolve, promise, state);
    this.reject = bind(internalReject, promise, state);
  };

  newPromiseCapability.f = newPromiseCapability$1 = function (C) {
    return C === PromiseConstructor || C === PromiseWrapper ? new OwnPromiseCapability(C) : newGenericPromiseCapability(C);
  };

  if ( typeof nativePromiseConstructor == 'function') {
    nativeThen = nativePromiseConstructor.prototype.then; // wrap native Promise#then for native async functions

    redefine(nativePromiseConstructor.prototype, 'then', function then(onFulfilled, onRejected) {
      var that = this;
      return new PromiseConstructor(function (resolve, reject) {
        nativeThen.call(that, resolve, reject);
      }).then(onFulfilled, onRejected); // https://github.com/zloirock/core-js/issues/640
    }, {
      unsafe: true
    }); // wrap fetch result

    if (typeof $fetch == 'function') _export({
      global: true,
      enumerable: true,
      forced: true
    }, {
      // eslint-disable-next-line no-unused-vars
      fetch: function fetch(input
      /* , init */
      ) {
        return promiseResolve(PromiseConstructor, $fetch.apply(global_1, arguments));
      }
    });
  }
}

_export({
  global: true,
  wrap: true,
  forced: FORCED$3
}, {
  Promise: PromiseConstructor
});
setToStringTag(PromiseConstructor, PROMISE, false);
setSpecies(PROMISE);
PromiseWrapper = getBuiltIn(PROMISE); // statics

_export({
  target: PROMISE,
  stat: true,
  forced: FORCED$3
}, {
  // `Promise.reject` method
  // https://tc39.github.io/ecma262/#sec-promise.reject
  reject: function reject(r) {
    var capability = newPromiseCapability$1(this);
    capability.reject.call(undefined, r);
    return capability.promise;
  }
});
_export({
  target: PROMISE,
  stat: true,
  forced:  FORCED$3
}, {
  // `Promise.resolve` method
  // https://tc39.github.io/ecma262/#sec-promise.resolve
  resolve: function resolve(x) {
    return promiseResolve( this, x);
  }
});
_export({
  target: PROMISE,
  stat: true,
  forced: INCORRECT_ITERATION
}, {
  // `Promise.all` method
  // https://tc39.github.io/ecma262/#sec-promise.all
  all: function all(iterable) {
    var C = this;
    var capability = newPromiseCapability$1(C);
    var resolve = capability.resolve;
    var reject = capability.reject;
    var result = perform(function () {
      var $promiseResolve = aFunction$1(C.resolve);
      var values = [];
      var counter = 0;
      var remaining = 1;
      iterate_1(iterable, function (promise) {
        var index = counter++;
        var alreadyCalled = false;
        values.push(undefined);
        remaining++;
        $promiseResolve.call(C, promise).then(function (value) {
          if (alreadyCalled) return;
          alreadyCalled = true;
          values[index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if (result.error) reject(result.value);
    return capability.promise;
  },
  // `Promise.race` method
  // https://tc39.github.io/ecma262/#sec-promise.race
  race: function race(iterable) {
    var C = this;
    var capability = newPromiseCapability$1(C);
    var reject = capability.reject;
    var result = perform(function () {
      var $promiseResolve = aFunction$1(C.resolve);
      iterate_1(iterable, function (promise) {
        $promiseResolve.call(C, promise).then(capability.resolve, reject);
      });
    });
    if (result.error) reject(result.value);
    return capability.promise;
  }
});

// https://tc39.github.io/ecma262/#sec-get-regexp.prototype.flags


var regexpFlags = function () {
  var that = anObject(this);
  var result = '';
  if (that.global) result += 'g';
  if (that.ignoreCase) result += 'i';
  if (that.multiline) result += 'm';
  if (that.dotAll) result += 's';
  if (that.unicode) result += 'u';
  if (that.sticky) result += 'y';
  return result;
};

// so we use an intermediate function.


function RE(s, f) {
  return RegExp(s, f);
}

var UNSUPPORTED_Y = fails(function () {
  // babel-minify transpiles RegExp('a', 'y') -> /a/y and it causes SyntaxError
  var re = RE('a', 'y');
  re.lastIndex = 2;
  return re.exec('abcd') != null;
});
var BROKEN_CARET = fails(function () {
  // https://bugzilla.mozilla.org/show_bug.cgi?id=773687
  var re = RE('^r', 'gy');
  re.lastIndex = 2;
  return re.exec('str') != null;
});
var regexpStickyHelpers = {
  UNSUPPORTED_Y: UNSUPPORTED_Y,
  BROKEN_CARET: BROKEN_CARET
};

var nativeExec = RegExp.prototype.exec; // This always refers to the native implementation, because the
// String#replace polyfill uses ./fix-regexp-well-known-symbol-logic.js,
// which loads this file before patching the method.

var nativeReplace = String.prototype.replace;
var patchedExec = nativeExec;

var UPDATES_LAST_INDEX_WRONG = function () {
  var re1 = /a/;
  var re2 = /b*/g;
  nativeExec.call(re1, 'a');
  nativeExec.call(re2, 'a');
  return re1.lastIndex !== 0 || re2.lastIndex !== 0;
}();

var UNSUPPORTED_Y$1 = regexpStickyHelpers.UNSUPPORTED_Y || regexpStickyHelpers.BROKEN_CARET; // nonparticipating capturing group, copied from es5-shim's String#split patch.

var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;
var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED || UNSUPPORTED_Y$1;

if (PATCH) {
  patchedExec = function exec(str) {
    var re = this;
    var lastIndex, reCopy, match, i;
    var sticky = UNSUPPORTED_Y$1 && re.sticky;
    var flags = regexpFlags.call(re);
    var source = re.source;
    var charsAdded = 0;
    var strCopy = str;

    if (sticky) {
      flags = flags.replace('y', '');

      if (flags.indexOf('g') === -1) {
        flags += 'g';
      }

      strCopy = String(str).slice(re.lastIndex); // Support anchored sticky behavior.

      if (re.lastIndex > 0 && (!re.multiline || re.multiline && str[re.lastIndex - 1] !== '\n')) {
        source = '(?: ' + source + ')';
        strCopy = ' ' + strCopy;
        charsAdded++;
      } // ^(? + rx + ) is needed, in combination with some str slicing, to
      // simulate the 'y' flag.


      reCopy = new RegExp('^(?:' + source + ')', flags);
    }

    if (NPCG_INCLUDED) {
      reCopy = new RegExp('^' + source + '$(?!\\s)', flags);
    }

    if (UPDATES_LAST_INDEX_WRONG) lastIndex = re.lastIndex;
    match = nativeExec.call(sticky ? reCopy : re, strCopy);

    if (sticky) {
      if (match) {
        match.input = match.input.slice(charsAdded);
        match[0] = match[0].slice(charsAdded);
        match.index = re.lastIndex;
        re.lastIndex += match[0].length;
      } else re.lastIndex = 0;
    } else if (UPDATES_LAST_INDEX_WRONG && match) {
      re.lastIndex = re.global ? match.index + match[0].length : lastIndex;
    }

    if (NPCG_INCLUDED && match && match.length > 1) {
      // Fix browsers whose `exec` methods don't consistently return `undefined`
      // for NPCG, like IE8. NOTE: This doesn' work for /(.?)?/
      nativeReplace.call(match[0], reCopy, function () {
        for (i = 1; i < arguments.length - 2; i++) {
          if (arguments[i] === undefined) match[i] = undefined;
        }
      });
    }

    return match;
  };
}

var regexpExec = patchedExec;

_export({
  target: 'RegExp',
  proto: true,
  forced: /./.exec !== regexpExec
}, {
  exec: regexpExec
});

var SPECIES$6 = wellKnownSymbol('species');
var REPLACE_SUPPORTS_NAMED_GROUPS = !fails(function () {
  // #replace needs built-in support for named groups.
  // #match works fine because it just return the exec results, even if it has
  // a "grops" property.
  var re = /./;

  re.exec = function () {
    var result = [];
    result.groups = {
      a: '7'
    };
    return result;
  };

  return ''.replace(re, '$<a>') !== '7';
}); // IE <= 11 replaces $0 with the whole match, as if it was $&
// https://stackoverflow.com/questions/6024666/getting-ie-to-replace-a-regex-with-the-literal-string-0

var REPLACE_KEEPS_$0 = function () {
  return 'a'.replace(/./, '$0') === '$0';
}();

var REPLACE = wellKnownSymbol('replace'); // Safari <= 13.0.3(?) substitutes nth capture where n>m with an empty string

var REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE = function () {
  if (/./[REPLACE]) {
    return /./[REPLACE]('a', '$0') === '';
  }

  return false;
}(); // Chrome 51 has a buggy "split" implementation when RegExp#exec !== nativeExec
// Weex JS has frozen built-in prototypes, so use try / catch wrapper


var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = !fails(function () {
  var re = /(?:)/;
  var originalExec = re.exec;

  re.exec = function () {
    return originalExec.apply(this, arguments);
  };

  var result = 'ab'.split(re);
  return result.length !== 2 || result[0] !== 'a' || result[1] !== 'b';
});

var fixRegexpWellKnownSymbolLogic = function (KEY, length, exec, sham) {
  var SYMBOL = wellKnownSymbol(KEY);
  var DELEGATES_TO_SYMBOL = !fails(function () {
    // String methods call symbol-named RegEp methods
    var O = {};

    O[SYMBOL] = function () {
      return 7;
    };

    return ''[KEY](O) != 7;
  });
  var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL && !fails(function () {
    // Symbol-named RegExp methods call .exec
    var execCalled = false;
    var re = /a/;

    if (KEY === 'split') {
      // We can't use real regex here since it causes deoptimization
      // and serious performance degradation in V8
      // https://github.com/zloirock/core-js/issues/306
      re = {}; // RegExp[@@split] doesn't call the regex's exec method, but first creates
      // a new one. We need to return the patched regex when creating the new one.

      re.constructor = {};

      re.constructor[SPECIES$6] = function () {
        return re;
      };

      re.flags = '';
      re[SYMBOL] = /./[SYMBOL];
    }

    re.exec = function () {
      execCalled = true;
      return null;
    };

    re[SYMBOL]('');
    return !execCalled;
  });

  if (!DELEGATES_TO_SYMBOL || !DELEGATES_TO_EXEC || KEY === 'replace' && !(REPLACE_SUPPORTS_NAMED_GROUPS && REPLACE_KEEPS_$0 && !REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE) || KEY === 'split' && !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC) {
    var nativeRegExpMethod = /./[SYMBOL];
    var methods = exec(SYMBOL, ''[KEY], function (nativeMethod, regexp, str, arg2, forceStringMethod) {
      if (regexp.exec === regexpExec) {
        if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
          // The native String method already delegates to @@method (this
          // polyfilled function), leasing to infinite recursion.
          // We avoid it by directly calling the native @@method method.
          return {
            done: true,
            value: nativeRegExpMethod.call(regexp, str, arg2)
          };
        }

        return {
          done: true,
          value: nativeMethod.call(str, regexp, arg2)
        };
      }

      return {
        done: false
      };
    }, {
      REPLACE_KEEPS_$0: REPLACE_KEEPS_$0,
      REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE: REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE
    });
    var stringMethod = methods[0];
    var regexMethod = methods[1];
    redefine(String.prototype, KEY, stringMethod);
    redefine(RegExp.prototype, SYMBOL, length == 2 // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
    // 21.2.5.11 RegExp.prototype[@@split](string, limit)
    ? function (string, arg) {
      return regexMethod.call(string, this, arg);
    } // 21.2.5.6 RegExp.prototype[@@match](string)
    // 21.2.5.9 RegExp.prototype[@@search](string)
    : function (string) {
      return regexMethod.call(string, this);
    });
  }

  if (sham) createNonEnumerableProperty(RegExp.prototype[SYMBOL], 'sham', true);
};

var createMethod$3 = function (CONVERT_TO_STRING) {
  return function ($this, pos) {
    var S = String(requireObjectCoercible($this));
    var position = toInteger(pos);
    var size = S.length;
    var first, second;
    if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
    first = S.charCodeAt(position);
    return first < 0xD800 || first > 0xDBFF || position + 1 === size || (second = S.charCodeAt(position + 1)) < 0xDC00 || second > 0xDFFF ? CONVERT_TO_STRING ? S.charAt(position) : first : CONVERT_TO_STRING ? S.slice(position, position + 2) : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
  };
};

var stringMultibyte = {
  // `String.prototype.codePointAt` method
  // https://tc39.github.io/ecma262/#sec-string.prototype.codepointat
  codeAt: createMethod$3(false),
  // `String.prototype.at` method
  // https://github.com/mathiasbynens/String.prototype.at
  charAt: createMethod$3(true)
};

var charAt = stringMultibyte.charAt; // `AdvanceStringIndex` abstract operation
// https://tc39.github.io/ecma262/#sec-advancestringindex

var advanceStringIndex = function (S, index, unicode) {
  return index + (unicode ? charAt(S, index).length : 1);
};

// https://tc39.github.io/ecma262/#sec-regexpexec

var regexpExecAbstract = function (R, S) {
  var exec = R.exec;

  if (typeof exec === 'function') {
    var result = exec.call(R, S);

    if (typeof result !== 'object') {
      throw TypeError('RegExp exec method returned something other than an Object or null');
    }

    return result;
  }

  if (classofRaw(R) !== 'RegExp') {
    throw TypeError('RegExp#exec called on incompatible receiver');
  }

  return regexpExec.call(R, S);
};

var max$2 = Math.max;
var min$2 = Math.min;
var floor$2 = Math.floor;
var SUBSTITUTION_SYMBOLS = /\$([$&'`]|\d\d?|<[^>]*>)/g;
var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&'`]|\d\d?)/g;

var maybeToString = function (it) {
  return it === undefined ? it : String(it);
}; // @@replace logic


fixRegexpWellKnownSymbolLogic('replace', 2, function (REPLACE, nativeReplace, maybeCallNative, reason) {
  var REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE = reason.REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE;
  var REPLACE_KEEPS_$0 = reason.REPLACE_KEEPS_$0;
  var UNSAFE_SUBSTITUTE = REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE ? '$' : '$0';
  return [// `String.prototype.replace` method
  // https://tc39.github.io/ecma262/#sec-string.prototype.replace
  function replace(searchValue, replaceValue) {
    var O = requireObjectCoercible(this);
    var replacer = searchValue == undefined ? undefined : searchValue[REPLACE];
    return replacer !== undefined ? replacer.call(searchValue, O, replaceValue) : nativeReplace.call(String(O), searchValue, replaceValue);
  }, // `RegExp.prototype[@@replace]` method
  // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@replace
  function (regexp, replaceValue) {
    if (!REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE && REPLACE_KEEPS_$0 || typeof replaceValue === 'string' && replaceValue.indexOf(UNSAFE_SUBSTITUTE) === -1) {
      var res = maybeCallNative(nativeReplace, regexp, this, replaceValue);
      if (res.done) return res.value;
    }

    var rx = anObject(regexp);
    var S = String(this);
    var functionalReplace = typeof replaceValue === 'function';
    if (!functionalReplace) replaceValue = String(replaceValue);
    var global = rx.global;

    if (global) {
      var fullUnicode = rx.unicode;
      rx.lastIndex = 0;
    }

    var results = [];

    while (true) {
      var result = regexpExecAbstract(rx, S);
      if (result === null) break;
      results.push(result);
      if (!global) break;
      var matchStr = String(result[0]);
      if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
    }

    var accumulatedResult = '';
    var nextSourcePosition = 0;

    for (var i = 0; i < results.length; i++) {
      result = results[i];
      var matched = String(result[0]);
      var position = max$2(min$2(toInteger(result.index), S.length), 0);
      var captures = []; // NOTE: This is equivalent to
      //   captures = result.slice(1).map(maybeToString)
      // but for some reason `nativeSlice.call(result, 1, result.length)` (called in
      // the slice polyfill when slicing native arrays) "doesn't work" in safari 9 and
      // causes a crash (https://pastebin.com/N21QzeQA) when trying to debug it.

      for (var j = 1; j < result.length; j++) captures.push(maybeToString(result[j]));

      var namedCaptures = result.groups;

      if (functionalReplace) {
        var replacerArgs = [matched].concat(captures, position, S);
        if (namedCaptures !== undefined) replacerArgs.push(namedCaptures);
        var replacement = String(replaceValue.apply(undefined, replacerArgs));
      } else {
        replacement = getSubstitution(matched, S, position, captures, namedCaptures, replaceValue);
      }

      if (position >= nextSourcePosition) {
        accumulatedResult += S.slice(nextSourcePosition, position) + replacement;
        nextSourcePosition = position + matched.length;
      }
    }

    return accumulatedResult + S.slice(nextSourcePosition);
  }]; // https://tc39.github.io/ecma262/#sec-getsubstitution

  function getSubstitution(matched, str, position, captures, namedCaptures, replacement) {
    var tailPos = position + matched.length;
    var m = captures.length;
    var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;

    if (namedCaptures !== undefined) {
      namedCaptures = toObject(namedCaptures);
      symbols = SUBSTITUTION_SYMBOLS;
    }

    return nativeReplace.call(replacement, symbols, function (match, ch) {
      var capture;

      switch (ch.charAt(0)) {
        case '$':
          return '$';

        case '&':
          return matched;

        case '`':
          return str.slice(0, position);

        case "'":
          return str.slice(tailPos);

        case '<':
          capture = namedCaptures[ch.slice(1, -1)];
          break;

        default:
          // \d\d?
          var n = +ch;
          if (n === 0) return match;

          if (n > m) {
            var f = floor$2(n / 10);
            if (f === 0) return match;
            if (f <= m) return captures[f - 1] === undefined ? ch.charAt(1) : captures[f - 1] + ch.charAt(1);
            return match;
          }

          capture = captures[n - 1];
      }

      return capture === undefined ? '' : capture;
    });
  }
});

var MATCH = wellKnownSymbol('match'); // `IsRegExp` abstract operation
// https://tc39.github.io/ecma262/#sec-isregexp

var isRegexp = function (it) {
  var isRegExp;
  return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : classofRaw(it) == 'RegExp');
};

var arrayPush = [].push;
var min$3 = Math.min;
var MAX_UINT32 = 0xFFFFFFFF; // babel-minify transpiles RegExp('x', 'y') -> /x/y and it causes SyntaxError

var SUPPORTS_Y = !fails(function () {
  return !RegExp(MAX_UINT32, 'y');
}); // @@split logic

fixRegexpWellKnownSymbolLogic('split', 2, function (SPLIT, nativeSplit, maybeCallNative) {
  var internalSplit;

  if ('abbc'.split(/(b)*/)[1] == 'c' || 'test'.split(/(?:)/, -1).length != 4 || 'ab'.split(/(?:ab)*/).length != 2 || '.'.split(/(.?)(.?)/).length != 4 || '.'.split(/()()/).length > 1 || ''.split(/.?/).length) {
    // based on es5-shim implementation, need to rework it
    internalSplit = function (separator, limit) {
      var string = String(requireObjectCoercible(this));
      var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
      if (lim === 0) return [];
      if (separator === undefined) return [string]; // If `separator` is not a regex, use native split

      if (!isRegexp(separator)) {
        return nativeSplit.call(string, separator, lim);
      }

      var output = [];
      var flags = (separator.ignoreCase ? 'i' : '') + (separator.multiline ? 'm' : '') + (separator.unicode ? 'u' : '') + (separator.sticky ? 'y' : '');
      var lastLastIndex = 0; // Make `global` and avoid `lastIndex` issues by working with a copy

      var separatorCopy = new RegExp(separator.source, flags + 'g');
      var match, lastIndex, lastLength;

      while (match = regexpExec.call(separatorCopy, string)) {
        lastIndex = separatorCopy.lastIndex;

        if (lastIndex > lastLastIndex) {
          output.push(string.slice(lastLastIndex, match.index));
          if (match.length > 1 && match.index < string.length) arrayPush.apply(output, match.slice(1));
          lastLength = match[0].length;
          lastLastIndex = lastIndex;
          if (output.length >= lim) break;
        }

        if (separatorCopy.lastIndex === match.index) separatorCopy.lastIndex++; // Avoid an infinite loop
      }

      if (lastLastIndex === string.length) {
        if (lastLength || !separatorCopy.test('')) output.push('');
      } else output.push(string.slice(lastLastIndex));

      return output.length > lim ? output.slice(0, lim) : output;
    }; // Chakra, V8

  } else if ('0'.split(undefined, 0).length) {
    internalSplit = function (separator, limit) {
      return separator === undefined && limit === 0 ? [] : nativeSplit.call(this, separator, limit);
    };
  } else internalSplit = nativeSplit;

  return [// `String.prototype.split` method
  // https://tc39.github.io/ecma262/#sec-string.prototype.split
  function split(separator, limit) {
    var O = requireObjectCoercible(this);
    var splitter = separator == undefined ? undefined : separator[SPLIT];
    return splitter !== undefined ? splitter.call(separator, O, limit) : internalSplit.call(String(O), separator, limit);
  }, // `RegExp.prototype[@@split]` method
  // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@split
  //
  // NOTE: This cannot be properly polyfilled in engines that don't support
  // the 'y' flag.
  function (regexp, limit) {
    var res = maybeCallNative(internalSplit, regexp, this, limit, internalSplit !== nativeSplit);
    if (res.done) return res.value;
    var rx = anObject(regexp);
    var S = String(this);
    var C = speciesConstructor(rx, RegExp);
    var unicodeMatching = rx.unicode;
    var flags = (rx.ignoreCase ? 'i' : '') + (rx.multiline ? 'm' : '') + (rx.unicode ? 'u' : '') + (SUPPORTS_Y ? 'y' : 'g'); // ^(? + rx + ) is needed, in combination with some S slicing, to
    // simulate the 'y' flag.

    var splitter = new C(SUPPORTS_Y ? rx : '^(?:' + rx.source + ')', flags);
    var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
    if (lim === 0) return [];
    if (S.length === 0) return regexpExecAbstract(splitter, S) === null ? [S] : [];
    var p = 0;
    var q = 0;
    var A = [];

    while (q < S.length) {
      splitter.lastIndex = SUPPORTS_Y ? q : 0;
      var z = regexpExecAbstract(splitter, SUPPORTS_Y ? S : S.slice(q));
      var e;

      if (z === null || (e = min$3(toLength(splitter.lastIndex + (SUPPORTS_Y ? 0 : q)), S.length)) === p) {
        q = advanceStringIndex(S, q, unicodeMatching);
      } else {
        A.push(S.slice(p, q));
        if (A.length === lim) return A;

        for (var i = 1; i <= z.length - 1; i++) {
          A.push(z[i]);
          if (A.length === lim) return A;
        }

        q = p = e;
      }
    }

    A.push(S.slice(p));
    return A;
  }];
}, !SUPPORTS_Y);

var runtime_1 = createCommonjsModule(function (module) {
  /**
   * Copyright (c) 2014-present, Facebook, Inc.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  var runtime = function (exports) {

    var Op = Object.prototype;
    var hasOwn = Op.hasOwnProperty;
    var undefined$1; // More compressible than void 0.

    var $Symbol = typeof Symbol === "function" ? Symbol : {};
    var iteratorSymbol = $Symbol.iterator || "@@iterator";
    var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
    var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

    function define(obj, key, value) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
      return obj[key];
    }

    try {
      // IE 8 has a broken Object.defineProperty that only works on DOM objects.
      define({}, "");
    } catch (err) {
      define = function (obj, key, value) {
        return obj[key] = value;
      };
    }

    function wrap(innerFn, outerFn, self, tryLocsList) {
      // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
      var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
      var generator = Object.create(protoGenerator.prototype);
      var context = new Context(tryLocsList || []); // The ._invoke method unifies the implementations of the .next,
      // .throw, and .return methods.

      generator._invoke = makeInvokeMethod(innerFn, self, context);
      return generator;
    }

    exports.wrap = wrap; // Try/catch helper to minimize deoptimizations. Returns a completion
    // record like context.tryEntries[i].completion. This interface could
    // have been (and was previously) designed to take a closure to be
    // invoked without arguments, but in all the cases we care about we
    // already have an existing method we want to call, so there's no need
    // to create a new function object. We can even get away with assuming
    // the method takes exactly one argument, since that happens to be true
    // in every case, so we don't have to touch the arguments object. The
    // only additional allocation required is the completion record, which
    // has a stable shape and so hopefully should be cheap to allocate.

    function tryCatch(fn, obj, arg) {
      try {
        return {
          type: "normal",
          arg: fn.call(obj, arg)
        };
      } catch (err) {
        return {
          type: "throw",
          arg: err
        };
      }
    }

    var GenStateSuspendedStart = "suspendedStart";
    var GenStateSuspendedYield = "suspendedYield";
    var GenStateExecuting = "executing";
    var GenStateCompleted = "completed"; // Returning this object from the innerFn has the same effect as
    // breaking out of the dispatch switch statement.

    var ContinueSentinel = {}; // Dummy constructor functions that we use as the .constructor and
    // .constructor.prototype properties for functions that return Generator
    // objects. For full spec compliance, you may wish to configure your
    // minifier not to mangle the names of these two functions.

    function Generator() {}

    function GeneratorFunction() {}

    function GeneratorFunctionPrototype() {} // This is a polyfill for %IteratorPrototype% for environments that
    // don't natively support it.


    var IteratorPrototype = {};

    IteratorPrototype[iteratorSymbol] = function () {
      return this;
    };

    var getProto = Object.getPrototypeOf;
    var NativeIteratorPrototype = getProto && getProto(getProto(values([])));

    if (NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
      // This environment has a native %IteratorPrototype%; use it instead
      // of the polyfill.
      IteratorPrototype = NativeIteratorPrototype;
    }

    var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
    GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
    GeneratorFunctionPrototype.constructor = GeneratorFunction;
    GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"); // Helper for defining the .next, .throw, and .return methods of the
    // Iterator interface in terms of a single ._invoke method.

    function defineIteratorMethods(prototype) {
      ["next", "throw", "return"].forEach(function (method) {
        define(prototype, method, function (arg) {
          return this._invoke(method, arg);
        });
      });
    }

    exports.isGeneratorFunction = function (genFun) {
      var ctor = typeof genFun === "function" && genFun.constructor;
      return ctor ? ctor === GeneratorFunction || // For the native GeneratorFunction constructor, the best we can
      // do is to check its .name property.
      (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
    };

    exports.mark = function (genFun) {
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
      } else {
        genFun.__proto__ = GeneratorFunctionPrototype;
        define(genFun, toStringTagSymbol, "GeneratorFunction");
      }

      genFun.prototype = Object.create(Gp);
      return genFun;
    }; // Within the body of any async function, `await x` is transformed to
    // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
    // `hasOwn.call(value, "__await")` to determine if the yielded value is
    // meant to be awaited.


    exports.awrap = function (arg) {
      return {
        __await: arg
      };
    };

    function AsyncIterator(generator, PromiseImpl) {
      function invoke(method, arg, resolve, reject) {
        var record = tryCatch(generator[method], generator, arg);

        if (record.type === "throw") {
          reject(record.arg);
        } else {
          var result = record.arg;
          var value = result.value;

          if (value && typeof value === "object" && hasOwn.call(value, "__await")) {
            return PromiseImpl.resolve(value.__await).then(function (value) {
              invoke("next", value, resolve, reject);
            }, function (err) {
              invoke("throw", err, resolve, reject);
            });
          }

          return PromiseImpl.resolve(value).then(function (unwrapped) {
            // When a yielded Promise is resolved, its final value becomes
            // the .value of the Promise<{value,done}> result for the
            // current iteration.
            result.value = unwrapped;
            resolve(result);
          }, function (error) {
            // If a rejected Promise was yielded, throw the rejection back
            // into the async generator function so it can be handled there.
            return invoke("throw", error, resolve, reject);
          });
        }
      }

      var previousPromise;

      function enqueue(method, arg) {
        function callInvokeWithMethodAndArg() {
          return new PromiseImpl(function (resolve, reject) {
            invoke(method, arg, resolve, reject);
          });
        }

        return previousPromise = // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, // Avoid propagating failures to Promises returned by later
        // invocations of the iterator.
        callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
      } // Define the unified helper method that is used to implement .next,
      // .throw, and .return (see defineIteratorMethods).


      this._invoke = enqueue;
    }

    defineIteratorMethods(AsyncIterator.prototype);

    AsyncIterator.prototype[asyncIteratorSymbol] = function () {
      return this;
    };

    exports.AsyncIterator = AsyncIterator; // Note that simple async functions are implemented on top of
    // AsyncIterator objects; they just return a Promise for the value of
    // the final result produced by the iterator.

    exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
      if (PromiseImpl === void 0) PromiseImpl = Promise;
      var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
      return exports.isGeneratorFunction(outerFn) ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function (result) {
        return result.done ? result.value : iter.next();
      });
    };

    function makeInvokeMethod(innerFn, self, context) {
      var state = GenStateSuspendedStart;
      return function invoke(method, arg) {
        if (state === GenStateExecuting) {
          throw new Error("Generator is already running");
        }

        if (state === GenStateCompleted) {
          if (method === "throw") {
            throw arg;
          } // Be forgiving, per 25.3.3.3.3 of the spec:
          // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume


          return doneResult();
        }

        context.method = method;
        context.arg = arg;

        while (true) {
          var delegate = context.delegate;

          if (delegate) {
            var delegateResult = maybeInvokeDelegate(delegate, context);

            if (delegateResult) {
              if (delegateResult === ContinueSentinel) continue;
              return delegateResult;
            }
          }

          if (context.method === "next") {
            // Setting context._sent for legacy support of Babel's
            // function.sent implementation.
            context.sent = context._sent = context.arg;
          } else if (context.method === "throw") {
            if (state === GenStateSuspendedStart) {
              state = GenStateCompleted;
              throw context.arg;
            }

            context.dispatchException(context.arg);
          } else if (context.method === "return") {
            context.abrupt("return", context.arg);
          }

          state = GenStateExecuting;
          var record = tryCatch(innerFn, self, context);

          if (record.type === "normal") {
            // If an exception is thrown from innerFn, we leave state ===
            // GenStateExecuting and loop back for another invocation.
            state = context.done ? GenStateCompleted : GenStateSuspendedYield;

            if (record.arg === ContinueSentinel) {
              continue;
            }

            return {
              value: record.arg,
              done: context.done
            };
          } else if (record.type === "throw") {
            state = GenStateCompleted; // Dispatch the exception by looping back around to the
            // context.dispatchException(context.arg) call above.

            context.method = "throw";
            context.arg = record.arg;
          }
        }
      };
    } // Call delegate.iterator[context.method](context.arg) and handle the
    // result, either by returning a { value, done } result from the
    // delegate iterator, or by modifying context.method and context.arg,
    // setting context.delegate to null, and returning the ContinueSentinel.


    function maybeInvokeDelegate(delegate, context) {
      var method = delegate.iterator[context.method];

      if (method === undefined$1) {
        // A .throw or .return when the delegate iterator has no .throw
        // method always terminates the yield* loop.
        context.delegate = null;

        if (context.method === "throw") {
          // Note: ["return"] must be used for ES3 parsing compatibility.
          if (delegate.iterator["return"]) {
            // If the delegate iterator has a return method, give it a
            // chance to clean up.
            context.method = "return";
            context.arg = undefined$1;
            maybeInvokeDelegate(delegate, context);

            if (context.method === "throw") {
              // If maybeInvokeDelegate(context) changed context.method from
              // "return" to "throw", let that override the TypeError below.
              return ContinueSentinel;
            }
          }

          context.method = "throw";
          context.arg = new TypeError("The iterator does not provide a 'throw' method");
        }

        return ContinueSentinel;
      }

      var record = tryCatch(method, delegate.iterator, context.arg);

      if (record.type === "throw") {
        context.method = "throw";
        context.arg = record.arg;
        context.delegate = null;
        return ContinueSentinel;
      }

      var info = record.arg;

      if (!info) {
        context.method = "throw";
        context.arg = new TypeError("iterator result is not an object");
        context.delegate = null;
        return ContinueSentinel;
      }

      if (info.done) {
        // Assign the result of the finished delegate to the temporary
        // variable specified by delegate.resultName (see delegateYield).
        context[delegate.resultName] = info.value; // Resume execution at the desired location (see delegateYield).

        context.next = delegate.nextLoc; // If context.method was "throw" but the delegate handled the
        // exception, let the outer generator proceed normally. If
        // context.method was "next", forget context.arg since it has been
        // "consumed" by the delegate iterator. If context.method was
        // "return", allow the original .return call to continue in the
        // outer generator.

        if (context.method !== "return") {
          context.method = "next";
          context.arg = undefined$1;
        }
      } else {
        // Re-yield the result returned by the delegate method.
        return info;
      } // The delegate iterator is finished, so forget it and continue with
      // the outer generator.


      context.delegate = null;
      return ContinueSentinel;
    } // Define Generator.prototype.{next,throw,return} in terms of the
    // unified ._invoke helper method.


    defineIteratorMethods(Gp);
    define(Gp, toStringTagSymbol, "Generator"); // A Generator should always return itself as the iterator object when the
    // @@iterator function is called on it. Some browsers' implementations of the
    // iterator prototype chain incorrectly implement this, causing the Generator
    // object to not be returned from this call. This ensures that doesn't happen.
    // See https://github.com/facebook/regenerator/issues/274 for more details.

    Gp[iteratorSymbol] = function () {
      return this;
    };

    Gp.toString = function () {
      return "[object Generator]";
    };

    function pushTryEntry(locs) {
      var entry = {
        tryLoc: locs[0]
      };

      if (1 in locs) {
        entry.catchLoc = locs[1];
      }

      if (2 in locs) {
        entry.finallyLoc = locs[2];
        entry.afterLoc = locs[3];
      }

      this.tryEntries.push(entry);
    }

    function resetTryEntry(entry) {
      var record = entry.completion || {};
      record.type = "normal";
      delete record.arg;
      entry.completion = record;
    }

    function Context(tryLocsList) {
      // The root entry object (effectively a try statement without a catch
      // or a finally block) gives us a place to store values thrown from
      // locations where there is no enclosing try statement.
      this.tryEntries = [{
        tryLoc: "root"
      }];
      tryLocsList.forEach(pushTryEntry, this);
      this.reset(true);
    }

    exports.keys = function (object) {
      var keys = [];

      for (var key in object) {
        keys.push(key);
      }

      keys.reverse(); // Rather than returning an object with a next method, we keep
      // things simple and return the next function itself.

      return function next() {
        while (keys.length) {
          var key = keys.pop();

          if (key in object) {
            next.value = key;
            next.done = false;
            return next;
          }
        } // To avoid creating an additional object, we just hang the .value
        // and .done properties off the next function object itself. This
        // also ensures that the minifier will not anonymize the function.


        next.done = true;
        return next;
      };
    };

    function values(iterable) {
      if (iterable) {
        var iteratorMethod = iterable[iteratorSymbol];

        if (iteratorMethod) {
          return iteratorMethod.call(iterable);
        }

        if (typeof iterable.next === "function") {
          return iterable;
        }

        if (!isNaN(iterable.length)) {
          var i = -1,
              next = function next() {
            while (++i < iterable.length) {
              if (hasOwn.call(iterable, i)) {
                next.value = iterable[i];
                next.done = false;
                return next;
              }
            }

            next.value = undefined$1;
            next.done = true;
            return next;
          };

          return next.next = next;
        }
      } // Return an iterator with no values.


      return {
        next: doneResult
      };
    }

    exports.values = values;

    function doneResult() {
      return {
        value: undefined$1,
        done: true
      };
    }

    Context.prototype = {
      constructor: Context,
      reset: function (skipTempReset) {
        this.prev = 0;
        this.next = 0; // Resetting context._sent for legacy support of Babel's
        // function.sent implementation.

        this.sent = this._sent = undefined$1;
        this.done = false;
        this.delegate = null;
        this.method = "next";
        this.arg = undefined$1;
        this.tryEntries.forEach(resetTryEntry);

        if (!skipTempReset) {
          for (var name in this) {
            // Not sure about the optimal order of these conditions:
            if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
              this[name] = undefined$1;
            }
          }
        }
      },
      stop: function () {
        this.done = true;
        var rootEntry = this.tryEntries[0];
        var rootRecord = rootEntry.completion;

        if (rootRecord.type === "throw") {
          throw rootRecord.arg;
        }

        return this.rval;
      },
      dispatchException: function (exception) {
        if (this.done) {
          throw exception;
        }

        var context = this;

        function handle(loc, caught) {
          record.type = "throw";
          record.arg = exception;
          context.next = loc;

          if (caught) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            context.method = "next";
            context.arg = undefined$1;
          }

          return !!caught;
        }

        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];
          var record = entry.completion;

          if (entry.tryLoc === "root") {
            // Exception thrown outside of any try block that could handle
            // it, so set the completion value of the entire function to
            // throw the exception.
            return handle("end");
          }

          if (entry.tryLoc <= this.prev) {
            var hasCatch = hasOwn.call(entry, "catchLoc");
            var hasFinally = hasOwn.call(entry, "finallyLoc");

            if (hasCatch && hasFinally) {
              if (this.prev < entry.catchLoc) {
                return handle(entry.catchLoc, true);
              } else if (this.prev < entry.finallyLoc) {
                return handle(entry.finallyLoc);
              }
            } else if (hasCatch) {
              if (this.prev < entry.catchLoc) {
                return handle(entry.catchLoc, true);
              }
            } else if (hasFinally) {
              if (this.prev < entry.finallyLoc) {
                return handle(entry.finallyLoc);
              }
            } else {
              throw new Error("try statement without catch or finally");
            }
          }
        }
      },
      abrupt: function (type, arg) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];

          if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
            var finallyEntry = entry;
            break;
          }
        }

        if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
          // Ignore the finally entry if control is not jumping to a
          // location outside the try/catch block.
          finallyEntry = null;
        }

        var record = finallyEntry ? finallyEntry.completion : {};
        record.type = type;
        record.arg = arg;

        if (finallyEntry) {
          this.method = "next";
          this.next = finallyEntry.finallyLoc;
          return ContinueSentinel;
        }

        return this.complete(record);
      },
      complete: function (record, afterLoc) {
        if (record.type === "throw") {
          throw record.arg;
        }

        if (record.type === "break" || record.type === "continue") {
          this.next = record.arg;
        } else if (record.type === "return") {
          this.rval = this.arg = record.arg;
          this.method = "return";
          this.next = "end";
        } else if (record.type === "normal" && afterLoc) {
          this.next = afterLoc;
        }

        return ContinueSentinel;
      },
      finish: function (finallyLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];

          if (entry.finallyLoc === finallyLoc) {
            this.complete(entry.completion, entry.afterLoc);
            resetTryEntry(entry);
            return ContinueSentinel;
          }
        }
      },
      "catch": function (tryLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];

          if (entry.tryLoc === tryLoc) {
            var record = entry.completion;

            if (record.type === "throw") {
              var thrown = record.arg;
              resetTryEntry(entry);
            }

            return thrown;
          }
        } // The context.catch method must only be called with a location
        // argument that corresponds to a known catch block.


        throw new Error("illegal catch attempt");
      },
      delegateYield: function (iterable, resultName, nextLoc) {
        this.delegate = {
          iterator: values(iterable),
          resultName: resultName,
          nextLoc: nextLoc
        };

        if (this.method === "next") {
          // Deliberately forget the last sent value so that we don't
          // accidentally pass it on to the delegate.
          this.arg = undefined$1;
        }

        return ContinueSentinel;
      }
    }; // Regardless of whether this script is executing as a CommonJS module
    // or not, return the runtime object so that we can declare the variable
    // regeneratorRuntime in the outer scope, which allows this module to be
    // injected easily by `bin/regenerator --include-runtime script.js`.

    return exports;
  }( // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   module.exports );

  try {
    regeneratorRuntime = runtime;
  } catch (accidentalStrictMode) {
    // This module should not be running in strict mode, so the above
    // assignment should always work unless something is misconfigured. Just
    // in case runtime.js accidentally runs in strict mode, we can escape
    // strict mode using a global Function call. This could conceivably fail
    // if a Content Security Policy forbids using Function, but in that case
    // the proper solution is to fix the accidental strict mode problem. If
    // you've misconfigured your bundler to force strict mode and applied a
    // CSP to forbid Function, and you're not willing to fix either of those
    // problems, please detail your unique predicament in a GitHub issue.
    Function("r", "regeneratorRuntime = r")(runtime);
  }
});

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  }

  return _assertThisInitialized(self);
}

var GeoMath = mapray.GeoMath;
var GeoPoint = mapray.GeoPoint;
/**
 * @summary 標準Maprayビューワ
 *
 * @class StandardUIViewer
 * @extends {mapray.RenderCallback}
 */

var StandardUIViewer =
/*#__PURE__*/
function (_mapray$RenderCallbac) {
  _inherits(StandardUIViewer, _mapray$RenderCallbac);

  /**
   * @summary コンストラクタ
   * @param {string|Element}              container                               ビューワ作成先のコンテナ（IDまたは要素）
   * @param {string}                      access_token                            アクセストークン
   * @param {object}                      options                                 生成オプション
   * @param {mapray.DemProvider}          options.dem_provider                    DEMプロバイダ
   * @param {mapray.ImageProvider}        options.image_provider                  画像プロバイダ
   * @param {array}                       options.layers                          地図レイヤー配列
   * @param {mapray.Viewer.RenderMode}    options.render_mode                     レンダリングモード
   * @param {boolean}                     options.ground_visibility=true          地表の可視性
   * @param {boolean}                     options.entity_visibility=true          エンティティの可視性
   * @param {mapray.DebugStats}           options.debug_stats                     デバッグ統計オブジェクト
   * @param {mapray.Attributionontroller} options.attribution_controller          著作権表示の表示制御
   * @param {object}                      options.camera_position                 カメラ位置
   * @param {number}                      options.camera_position.latitude        緯度（度）
   * @param {number}                      options.camera_position.longitude       経度（度）
   * @param {number}                      options.camera_position.height          高さ（m）
   * @param {object}                      options.lookat_position                 注視点位置
   * @param {number}                      options.lookat_position.latitude        緯度（度）
   * @param {number}                      options.lookat_position.longitude       経度（度）
   * @param {number}                      options.lookat_position.height          高さ（m）
   * @param {object}                      options.camera_parameter                カメラパラメータ
   * @param {number}                      options.camera_parameter.fov            画角（度）
   * @param {number}                      options.camera_parameter.near           近接平面距離（m）
   * @param {number}                      options.camera_parameter.far            遠方平面距離（m）
   * @param {number}                      options.camera_parameter.speed_factor   移動速度係数
   * @memberof StandardUIViewer
   */
  function StandardUIViewer(container, access_token, options) {
    var _this;

    _classCallCheck(this, StandardUIViewer);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(StandardUIViewer).call(this));

    _this.createViewer(container, access_token, options); // カメラパラメータ


    _this._camera_parameter = {
      latitude: 0,
      // 緯度
      longitude: 0,
      // 経度
      height: 0,
      // 高度
      pitch: 0,
      // 上下（X軸）回転
      yaw: 0,
      // 左右（Z軸）回転
      fov: 0,
      // 画角
      near: 0,
      // 近接平面距離
      far: 0 // 遠方平面距離

    };
    _this._operation_mode = StandardUIViewer.OperationMode.NONE; // 操作モード

    _this._mouse_down_position = GeoMath.createVector2f(); // マウスダウンした位置

    _this._pre_mouse_position = GeoMath.createVector2f(); // 直前のマウス位置

    _this._rotate_center = GeoMath.createVector3(); // 回転中心

    _this._translate_drag = GeoMath.createVector2f(); // 平行移動の移動量（マウスの移動量）

    _this._translate_eye_drag = GeoMath.createVector2f(); // 平行移動の移動量（マウスの移動量）

    _this._rotate_drag = GeoMath.createVector2f(); // 回転の移動量（マウスの移動量）

    _this._free_rotate_drag = GeoMath.createVector2f(); // 自由回転の移動量（マウスの移動量）

    _this._height_drag = GeoMath.createVector2f(); // 高度変更の移動量（マウスの移動量）

    _this._zoom_wheel = 0; // 視線方向への移動量（ホイールの移動量）

    _this._fovy_key = 0; // 画角変更の指定回数

    _this._default_fov = StandardUIViewer.DEFAULT_CAMERA_PARAMETER.fov; // リセット用の画角

    _this._key_mode = false; // キー操作中

    _this._update_url_hash = false; // URLHash更新フラグ

    _this._update_url_hash_full_digits = false; // URLに含む値の桁数(true:全桁, false:桁数制限)

    _this._last_camera_parameter = {
      latitude: -1,
      // 緯度
      longitude: -1,
      // 経度
      height: 0,
      // 高度
      pitch: 0,
      // 上下（X軸）回転
      yaw: 0,
      // 左右（Z軸）回転
      fov: 0,
      // 画角
      near: 0,
      // 近接平面距離
      far: 0 // 遠方平面距離

    }; // for FlyCamera

    _this._viewerCameraMode = StandardUIViewer.CameraMode.CAMERA_FREE;
    _this._animation = new mapray.animation.EasyBindingBlock();
    _this._updater = new mapray.animation.Updater();
    _this._curve_move = null;
    _this._curve_rotation = null;
    _this._flycamera_total_time = 0;
    _this._flycamera_target_time = 0;
    _this._flyPosition = new mapray.GeoPoint(0, 0, 0);
    _this._flyRotation = GeoMath.setIdentity(GeoMath.createMatrix()); // カメラパラメータの初期化

    _this._initCameraParameter(options);

    return _this;
  }
  /**
   * @summary ビューワの作成
   * @param {string|Element}              container                               ビューワ作成先のコンテナ（IDまたは要素）
   * @param {string}                      access_token                            アクセストークン
   * @param {object}                      options                                 生成オプション
   * @param {mapray.DemProvider}          options.dem_provider                    DEMプロバイダ
   * @param {mapray.ImageProvider}        options.image_provider                  画像プロバイダ
   * @param {array}                       options.layers                          地図レイヤー配列
   * @param {mapray.Viewer.RenderMode}    options.render_mode                     レンダリングモード
   * @param {boolean}                     options.ground_visibility=true          地表の可視性
   * @param {boolean}                     options.entity_visibility=true          エンティティの可視性
   * @param {mapray.DebugStats}           options.debug_stats                     デバッグ統計オブジェクト
   * @param {mapray.Attributionontroller} options.attribution_controller          著作権表示の表示制御
   */


  _createClass(StandardUIViewer, [{
    key: "createViewer",
    value: function createViewer(container, access_token, options) {
      if (this._viewer) {
        this.destroy();
      }

      this._viewer = new mapray.Viewer(container, {
        dem_provider: this._createDemProvider(access_token, options),
        image_provider: this._createImageProvider(options),
        layers: options && options.layers || null,
        render_callback: this,
        ground_visibility: options && options.ground_visibility !== undefined ? options.ground_visibility : true,
        entity_visibility: options && options.entity_visibility !== undefined ? options.entity_visibility : true,
        render_mode: options && options.render_mode || mapray.Viewer.RenderMode.SURFACE,
        debug_stats: options && options.debug_stats || null,
        attribution_controller: options && options.attribution_controller || null
      }); // 右クリックメニューの無効化

      var element = this._viewer._canvas_element;
      element.setAttribute("oncontextmenu", "return false;"); // For getting KeybordEvent

      element.setAttribute('tabindex', '0'); // イベントリスナーの追加

      this._addEventListener();

      return this._viewer;
    }
    /**
     * @summary 破棄関数
     *
     * @memberof StandardUIViewer
     */

  }, {
    key: "destroy",
    value: function destroy() {
      if (!this._viewer) {
        return;
      }

      this._removeEventListener();

      this._viewer.destroy();

      this._viewer = null;
    }
    /**
     * @summary ビューワ
     * @type {mapray.viewer}
     * @readonly
     * @memberof StandardUIViewer
     */

  }, {
    key: "_createDemProvider",

    /**
     * @summary DEMプロバイダの生成
     *
     * @private
     * @param {string}                      access_token            アクセストークン
     * @param {object}                      options                 生成オプション
     * @param {mapray.DemProvider}          options.dem_provider    DEMプロバイダ
     * @returns {mapray.DemProvider}                                DEMプロバイダ
     * @memberof StandardUIViewer
     */
    value: function _createDemProvider(access_token, options) {
      return options && options.dem_provider || new mapray.CloudDemProvider(access_token);
    }
    /**
     * @summary 画像プロバイダの生成
     *
     * @private
     * @param {object}                      options                 生成オプション
     * @param {mapray.ImageProvider}        options.image_provider  画像プロバイダ
     * @returns {mapray.ImageProvider}                              画像プロバイダ
     * @memberof StandardUIViewer
     */

  }, {
    key: "_createImageProvider",
    value: function _createImageProvider(options) {
      return options && options.image_provider || new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18);
    }
    /**
     * @summary カメラパラメータの初期化
     *
     * @private
     * @param {object}                      [options]                               オプション
     * @param {object}                      options.camera_position                 カメラ位置
     * @param {number}                      options.camera_position.latitude        緯度（度）
     * @param {number}                      options.camera_position.longitude       経度（度）
     * @param {number}                      options.camera_position.height          高さ（m）
     * @param {object}                      options.lookat_position                 注視点位置
     * @param {number}                      options.lookat_position.latitude        緯度（度）
     * @param {number}                      options.lookat_position.longitude       経度（度）
     * @param {number}                      options.lookat_position.height          高さ（m）
     * @param {object}                      options.camera_parameter                カメラパラメータ
     * @param {number}                      options.camera_parameter.fov            画角（度）
     * @param {number}                      options.camera_parameter.near           近接平面距離（m）
     * @param {number}                      options.camera_parameter.far            遠方平面距離（m）
     * @param {number}                      options.camera_parameter.speed_factor   移動速度係数
     * @memberof StandardUIViewer
     */

  }, {
    key: "_initCameraParameter",
    value: function _initCameraParameter() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var camera_position = options.camera_position || StandardUIViewer.DEFAULT_CAMERA_POSITION;
      var lookat_position = options.lookat_position || StandardUIViewer.DEFAULT_LOOKAT_POSITION;
      var camera_parameter = options.camera_parameter || StandardUIViewer.DEFAULT_CAMERA_PARAMETER; // カメラ位置の設定

      this.setCameraPosition(camera_position); //　注視点位置の設定

      this.setLookAtPosition(lookat_position); // カメラパラメータの設定

      this.setCameraParameter(camera_parameter); // カメラ姿勢の確定

      this._updateViewerCamera();
    }
    /**
     * @summary URLによるカメラパラメータの初期化
     * @desc
     * <p> URL指定直後はDEMデータが存在しない、または精度が荒いため地表付近の位置を指定した時、カメラの高度補正によりカメラ高度が高く設定されることがあります </p>
     *
     * @param {object}                      [options]                               オプション
     * @param {object}                      options.camera_position                 カメラ位置
     * @param {number}                      options.camera_position.latitude        緯度（度）
     * @param {number}                      options.camera_position.longitude       経度（度）
     * @param {number}                      options.camera_position.height          高さ（m）
     * @param {object}                      options.lookat_position                 注視点位置
     * @param {number}                      options.lookat_position.latitude        緯度（度）
     * @param {number}                      options.lookat_position.longitude       経度（度）
     * @param {number}                      options.lookat_position.height          高さ（m）
     * @param {object}                      options.camera_parameter                カメラパラメータ
     * @param {number}                      options.camera_parameter.fov            画角（度）
     * @param {number}                      options.camera_parameter.near           近接平面距離（m）
     * @param {number}                      options.camera_parameter.far            遠方平面距離（m）
     * @param {number}                      options.camera_parameter.speed_factor   移動速度係数
     * @param {boolean}                     options.url_update                      URL Hash更新
     * @memberof StandardUIViewer
     */

  }, {
    key: "initCameraParameterFromURL",
    value: function initCameraParameterFromURL() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var camera_position = options.camera_position || StandardUIViewer.DEFAULT_CAMERA_POSITION;
      var lookat_position = options.lookat_position || StandardUIViewer.DEFAULT_LOOKAT_POSITION;
      var camera_parameter = options.camera_parameter || StandardUIViewer.DEFAULT_CAMERA_PARAMETER;
      var url_yaw = 0;

      if (options.url_update) {
        this.setURLUpdate(options.url_update);
      }

      var url_parameter = this._extractURLParameter();

      if (url_parameter) {
        camera_position = url_parameter.camera_position;
        lookat_position = url_parameter.lookat_position;
        url_yaw = url_parameter.yaw;
      } // カメラ位置の設定


      this.setCameraPosition(camera_position); //　注視点位置の設定

      this.setLookAtPosition(lookat_position, url_yaw); // カメラパラメータの設定

      this.setCameraParameter(camera_parameter); // カメラ姿勢の確定

      this._updateViewerCamera();
    }
    /**
     * @summary URLのパラメータの抽出と、カメラパラメータの算出
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_extractURLParameter",
    value: function _extractURLParameter() {
      var urlHash = window.location.hash;

      if (urlHash.length === 0) {
        // URLに位置情報は無し または 不正
        return;
      } // 先頭の#を削除


      urlHash = urlHash.slice(1);
      var split_parameter = urlHash.split('/');

      if (split_parameter.length < 2) {
        // パラメータ不足
        return;
      } // 1,2番目のパラメータは lat, lon


      var value = parseFloat(split_parameter[0]);

      if (!(typeof value === 'number' && isFinite(value))) {
        return;
      }

      var latitude = value;
      value = parseFloat(split_parameter[1]);

      if (!(typeof value === 'number' && isFinite(value))) {
        return;
      }

      var longitude = value; // デフォルトとして地面高さを入れておく
      // const target_altitude = this._viewer.getElevation(latitude, longitude);

      var target_altitude = 8000; //今は高精度DEMが取得できないのでデフォルトは8000m

      var altitude = target_altitude; // default

      var range = 1000;
      var tilt = 0;
      var heading = 0; // パラメータの解析

      for (var num = 2; split_parameter.length > num; num++) {
        var _value = split_parameter[num];

        var converted_value = this._getURLParameterValue(_value);

        if (!isNaN(converted_value)) {
          // 記号チェック
          switch (_value.slice(-1)) {
            case 'a':
              altitude = converted_value;
              break;

            case 't':
              tilt = converted_value;
              break;

            case 'r':
              range = converted_value;
              break;

            case 'h':
              heading = converted_value;
              break;
          }
        }
      }

      var tilt_theta = tilt * GeoMath.DEGREE;
      var camera_z = range * Math.cos(tilt_theta);
      var flat_length = range * Math.sin(tilt_theta);

      var camera_geoPoint = this._destination(longitude, latitude, flat_length, heading);

      var camera_position = {
        height: altitude + camera_z,
        longitude: camera_geoPoint.longitude,
        latitude: camera_geoPoint.latitude
      };
      var lookat_position = {
        height: altitude,
        longitude: longitude,
        latitude: latitude
      };
      return {
        camera_position: camera_position,
        lookat_position: lookat_position,
        yaw: heading
      };
    }
    /**
     * @summary URLに含まれるパラメータの数値化
     *
     * @private
     * @param {string}  str     URLから抽出されたパラメータ文字列
     * @memberof StandardUIViewer
     */

  }, {
    key: "_getURLParameterValue",
    value: function _getURLParameterValue(str) {
      var value = parseFloat(str);

      if (typeof value === 'number' && isFinite(value)) {
        return value;
      }

      return NaN;
    }
    /**
     * @summary イベントリスナーの追加
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_addEventListener",
    value: function _addEventListener() {
      var canvas = this._viewer._canvas_element;
      var self = this;
      this._onBlur = this._onBlur.bind(this);
      this._onMouseDown = this._onMouseDown.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      this._onMouseWheel = this._onMouseWheel.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onKeyUp = this._onKeyUp.bind(this);
      window.addEventListener("blur", self._onBlur, {
        passive: false
      });
      canvas.addEventListener("mousedown", self._onMouseDown, {
        passive: true
      });
      canvas.addEventListener("mousemove", self._onMouseMove, {
        passive: true
      });
      document.addEventListener("mousemove", self._onMouseMove, {
        capture: true
      });
      canvas.addEventListener("mouseup", self._onMouseUp, {
        passive: true
      });
      document.addEventListener("mouseup", self._onMouseUp, {
        capture: false
      });
      canvas.addEventListener("wheel", self._onMouseWheel, {
        passive: false
      });
      canvas.addEventListener("keydown", self._onKeyDown, {
        capture: false,
        passive: false
      });
      canvas.addEventListener("keyup", self._onKeyUp, {
        passive: true
      });
    }
    /**
     * @summary イベントリスナーの削除
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_removeEventListener",
    value: function _removeEventListener() {
      var canvas = this._viewer._canvas_element;
      var self = this;
      window.removeEventListener("blur", self._onBlur, {
        passive: false
      });
      canvas.removeEventListener("mousedown", self._onMouseDown, {
        passive: true
      });
      canvas.removeEventListener("mousemove", self._onMouseMove, {
        passive: true
      });
      document.removeEventListener("mousemove", self._onMouseMove, {
        capture: true
      });
      canvas.removeEventListener("mouseup", self._onMouseUp, {
        passive: true
      });
      document.removeEventListener("mouseup", self._onMouseUp, {
        capture: false
      });
      canvas.removeEventListener("wheel", self._onMouseWheel, {
        passive: false
      });
      canvas.removeEventListener("keydown", self._onKeyDown, {
        capture: false,
        passive: false
      });
      canvas.removeEventListener("keyup", self._onKeyUp, {
        passive: true
      });
    }
    /**
     * @summary レンダリングループ開始の処理
     *
     * @memberof StandardUIViewer
     */

  }, {
    key: "onStart",
    value: function onStart() {}
    /**
     * @summary レンダリングループ終了の処理
     *
     * @memberof StandardUIViewer
     */

  }, {
    key: "onStop",
    value: function onStop() {}
    /**
     * @summary フレームレンダリング前の処理
     *
     * @param {number} delta_time  全フレームからの経過時間（秒）
     * @memberof StandardUIViewer
     */

  }, {
    key: "onUpdateFrame",
    value: function onUpdateFrame(delta_time) {
      if (this._viewerCameraMode === StandardUIViewer.CameraMode.CAMERA_FLY) {
        this.updateFlyCamera(delta_time);
      } else {
        // 平行移動
        this._translation(delta_time); // 回転


        this._rotation(); // 自由回転


        this._freeRotation(delta_time); // 高さ変更


        this._translationOfHeight(); //　視線方向移動


        this._translationOfEyeDirection(); // 画角変更


        this._changeFovy(); // 高度補正


        this._correctAltitude(); // クリップ範囲の更新


        this._updateClipPlane(); // カメラ姿勢の確定


        this._updateViewerCamera();
      }
    }
    /**
     * @summary カメラの位置・向きの更新
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_updateViewerCamera",
    value: function _updateViewerCamera() {
      var camera = this._viewer.camera;
      var camera_geoPoint = new GeoPoint(this._camera_parameter.longitude, this._camera_parameter.latitude, this._camera_parameter.height);
      var camera_matrix = camera_geoPoint.getMlocsToGocsMatrix(GeoMath.createMatrix());
      var pitch_matrix = GeoMath.rotation_matrix([1, 0, 0], this._camera_parameter.pitch, GeoMath.createMatrix());
      var yaw_matrix = GeoMath.rotation_matrix([0, 0, 1], this._camera_parameter.yaw, GeoMath.createMatrix());
      var eye_matrix = GeoMath.mul_AA(yaw_matrix, pitch_matrix, GeoMath.createMatrix());
      camera.view_to_gocs = GeoMath.mul_AA(camera_matrix, eye_matrix, GeoMath.createMatrix());
      camera.fov = this._camera_parameter.fov;
      camera.near = this._camera_parameter.near;
      camera.far = this._camera_parameter.far; // URL書き換え

      this._updateURLHash();
    }
    /**
     * @summary URL Hashの更新設定
     *
     * @param {boolean} flag  更新設定 trueでURL更新
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "setURLUpdate",
    value: function setURLUpdate(flag) {
      this._update_url_hash = flag;
    }
    /**
     * @summary URLHashの更新
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_updateURLHash",
    value: function _updateURLHash() {
      if (this._update_url_hash && this._operation_mode === StandardUIViewer.OperationMode.NONE) {
        if (this._last_camera_parameter.latitude !== this._camera_parameter.latitude || this._last_camera_parameter.longitude !== this._camera_parameter.longitude || this._last_camera_parameter.height !== this._camera_parameter.height || this._last_camera_parameter.pitch !== this._camera_parameter.pitch || this._last_camera_parameter.yaw !== this._camera_parameter.yaw) {
          // 注視点
          // 画面中央を移動基準にする
          var canvas = this._viewer.canvas_element;
          var center_position = [canvas.width / 2, canvas.height / 2]; // キャンバス座標のレイを取得

          var ray = this.viewer.camera.getCanvasRay(center_position, new mapray.Ray()); // レイと地表の交点を求める

          var cross_point = this.viewer.getRayIntersection(ray);

          if (cross_point != null) {
            var cross_geoPoint = new mapray.GeoPoint();
            cross_geoPoint.setFromGocs(cross_point);

            var cross_altitude = this._viewer.getElevation(cross_geoPoint.latitude, cross_geoPoint.longitude);

            var target_geoPoint = new mapray.GeoPoint(cross_geoPoint.longitude, cross_geoPoint.latitude, cross_altitude);
            var target_pos = target_geoPoint.getAsGocs(GeoMath.createVector3());
            var camera = this._viewer.camera;
            var len_x = camera.view_to_gocs[12] - target_pos[0];
            var len_y = camera.view_to_gocs[13] - target_pos[1];
            var len_z = camera.view_to_gocs[14] - target_pos[2];
            var length = Math.sqrt(len_x * len_x + len_y * len_y + len_z * len_z); // URLの生成

            var new_hash = '';
            var lat, lon, alt, tilt, range, heading;

            if (this._update_url_hash_full_digits) {
              lat = cross_geoPoint.latitude;
              lon = cross_geoPoint.longitude;
              alt = cross_altitude;
              tilt = this._camera_parameter.pitch;
              range = length;
              heading = this._camera_parameter.yaw;
            } else {
              lat = cross_geoPoint.latitude.toFixed(10);
              lon = cross_geoPoint.longitude.toFixed(10);
              alt = cross_altitude.toFixed(5);
              tilt = this._camera_parameter.pitch.toFixed(5);
              range = length.toFixed(5);
              heading = this._camera_parameter.yaw.toFixed(5);
            }

            new_hash = "#".concat(lat, "/").concat(lon, "/").concat(alt, "a/").concat(tilt, "t/").concat(range, "r/").concat(heading, "h");
            this._last_camera_parameter.latitude = this._camera_parameter.latitude;
            this._last_camera_parameter.longitude = this._camera_parameter.longitude;
            this._last_camera_parameter.height = this._camera_parameter.height;
            this._last_camera_parameter.pitch = this._camera_parameter.pitch;
            this._last_camera_parameter.yaw = this._camera_parameter.yaw;
            var new_url = window.location.href.replace(window.location.hash, new_hash);
            window.location.replace(new_url);
          }
        }
      }
    }
    /**
     * @summary クリップ範囲の更新
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_updateClipPlane",
    value: function _updateClipPlane() {
      // 地表面の標高
      var elevation = this._viewer.getElevation(this._camera_parameter.latitude, this._camera_parameter.longitude);

      var altitude = Math.max(this._camera_parameter.height - elevation, StandardUIViewer.MINIMUM_HEIGHT);
      this._camera_parameter.near = Math.max(altitude * StandardUIViewer.NEAR_FACTOR, StandardUIViewer.MINIMUM_NEAR);
      this._camera_parameter.far = Math.max(this._camera_parameter.near * StandardUIViewer.FAR_FACTOR, StandardUIViewer.MINIMUM_FAR);
    }
    /**
     * @summary 高度の補正（地表面以下にならないようにする）
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_correctAltitude",
    value: function _correctAltitude() {
      var elevation = this._viewer.getElevation(this._camera_parameter.latitude, this._camera_parameter.longitude);

      this._camera_parameter.height = Math.max(this._camera_parameter.height, elevation + StandardUIViewer.MINIMUM_HEIGHT);
    }
    /**
     * @summary 操作系のイベントをリセットする(公開関数)
     *
     * @memberof StandardUIViewer
     */

  }, {
    key: "resetOpEvent",
    value: function resetOpEvent() {
      this._resetEventParameter();
    }
    /**
     * @summary フォーカスが外れた時のイベント(公開関数)
     *
     * @param {Event} event  イベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "onBlur",
    value: function onBlur(event) {
      this._resetEventParameter();
    }
    /**
     * @summary フォーカスが外れた時のイベント
     *
     * @private
     * @param {Event} event  イベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "_onBlur",
    value: function _onBlur(event) {
      this.onBlur(event);
    }
    /**
     * @summary マウスを押した時のイベント(公開関数）
     *
     * @param {array} point 要素上の座標
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "onMouseDown",
    value: function onMouseDown(point, event) {
      this._mouse_down_position = point;
      this._pre_mouse_position = point; // 左ボタン

      if (event.button === 0) {
        if (event.shiftKey) {
          this._operation_mode = StandardUIViewer.OperationMode.ROTATE;
          var camera = this._viewer.camera;
          var ray = camera.getCanvasRay(this._mouse_down_position);
          this._rotate_center = this._viewer.getRayIntersection(ray);
        } else if (event.ctrlKey) {
          this._operation_mode = StandardUIViewer.OperationMode.FREE_ROTATE;
        } else {
          this._operation_mode = StandardUIViewer.OperationMode.TRANSLATE;
        }
      } // 中ボタン
      else if (event.button === 1) {
          this._operation_mode = StandardUIViewer.OperationMode.ROTATE;
          var camera = this._viewer.camera;
          var ray = camera.getCanvasRay(this._mouse_down_position);
          this._rotate_center = this._viewer.getRayIntersection(ray);
        } // 右ボタン
        else if (event.button === 2) {
            this._operation_mode = event.shiftKey ? StandardUIViewer.OperationMode.HEIGHT_TRANSLATE : StandardUIViewer.OperationMode.EYE_TRANSLATE;
          }
    }
    /**
     * @summary マウスを押した時のイベント
     *
     * @private
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "_onMouseDown",
    value: function _onMouseDown(event) {
      var point = this._mousePos(this._viewer._canvas_element, event);

      this.onMouseDown(point, event);
    }
    /**
     * @summary マウスを動かした時のイベント（公開間数）
     *
     * @param {array} point 要素上の座標
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "onMouseMove",
    value: function onMouseMove(point, event) {
      var mouse_position = point; //　平行移動

      if (this._operation_mode === StandardUIViewer.OperationMode.TRANSLATE) {
        this._translate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
        this._translate_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
      } //　回転移動
      else if (this._operation_mode === StandardUIViewer.OperationMode.ROTATE) {
          this._rotate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
          this._rotate_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
        } else if (this._operation_mode === StandardUIViewer.OperationMode.FREE_ROTATE) {
          this._free_rotate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
          this._free_rotate_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
        } // 高度変更
        else if (this._operation_mode === StandardUIViewer.OperationMode.HEIGHT_TRANSLATE) {
            // 横方向は平行移動する
            this._translate_drag[0] += mouse_position[0] - this._pre_mouse_position[0];
            this._height_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
          } else if (this._operation_mode === StandardUIViewer.OperationMode.EYE_TRANSLATE) {
            this._translate_eye_drag[1] += mouse_position[1] - this._pre_mouse_position[1];
          } // マウス位置の更新


      this._pre_mouse_position = mouse_position;
    }
    /**
     * @summary マウスを動かした時のイベント
     *
     * @private
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "_onMouseMove",
    value: function _onMouseMove(event) {
      var point = this._mousePos(this._viewer._canvas_element, event);

      this.onMouseMove(point, event);
    }
    /**
     * @summary マウスを上げた時のイベント（公開関数）
     *
     * @param {array} point 要素上の座標
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "onMouseUp",
    value: function onMouseUp(point, event) {
      this._resetEventParameter();
    }
    /**
     * @summary マウスを上げた時のイベント
     *
     * @private
     * @param {MouseEvent} event  マウスイベントデータ
     * @memberof StandardUIViewer
     */

  }, {
    key: "_onMouseUp",
    value: function _onMouseUp(event) {
      var point = this._mousePos(this._viewer._canvas_element, event);

      this.onMouseUp(point, event);
    }
    /**
     * @summary マウスホイールを動かした時のイベント
     *
     * @param {array} point 要素上の座標
     * @param {MouseWheelEvent} event
     * @memberof StandardUIViewer
     */

  }, {
    key: "onMouseWheel",
    value: function onMouseWheel(point, event) {
      event.preventDefault();

      if (this._viewerCameraMode != StandardUIViewer.CameraMode.CAMERA_FREE) {
        return;
      }

      this._mouse_down_position = point;
      var zoom = 0;
      zoom = -1 * Math.sign(event.deltaY) * Math.ceil(Math.abs(event.deltaY) / 100);
      this._zoom_wheel += zoom;
    }
    /**
     * @summary マウスホイールを動かした時のイベント
     *
     * @private
     * @param {MouseWheelEvent} event
     * @memberof StandardUIViewer
     */

  }, {
    key: "_onMouseWheel",
    value: function _onMouseWheel(event) {
      var point = this._mousePos(this._viewer._canvas_element, event);

      this.onMouseWheel(point, event);
    }
    /**
     * @summary キーを押した時のイベント(公開関数)
     *
     * @param {KeyboardEvent} event
     * @memberof StandardUIViewer
     */

  }, {
    key: "onKeyDown",
    value: function onKeyDown(event) {
      switch (event.key) {
        // [c] 画角の拡大
        case "c":
        case "C":
          this._operation_mode = StandardUIViewer.OperationMode.CHANGE_FOVY;
          this._fovy_key = 1;
          break;
        // [z] 画角の縮小

        case "z":
        case "Z":
          this._operation_mode = StandardUIViewer.OperationMode.CHANGE_FOVY;
          this._fovy_key = -1;
          break;
        // [x] 画角の初期化

        case "x":
        case "X":
          this._camera_parameter.fov = this._default_fov;
          break;
        // ↑ 前進

        case "ArrowUp":
          event.preventDefault(); // 画面中央を移動基準にする

          var canvas = this._viewer.canvas_element;
          var mouse_position = [canvas.width / 2, canvas.height / 2];
          this._mouse_down_position = mouse_position;
          this._translate_drag[1] = 100;
          this._key_mode = true;
          break;
        // ↓ 後退

        case "ArrowDown":
          event.preventDefault(); // 画面中央を移動基準にする

          var canvas = this._viewer.canvas_element;
          var mouse_position = [canvas.width / 2, canvas.height / 2];
          this._mouse_down_position = mouse_position;
          this._translate_drag[1] = -100;
          this._key_mode = true;
          break;
        // ← 左回転

        case "ArrowLeft":
          event.preventDefault(); // 画面中央を移動基準にする

          this._free_rotate_drag[0] = 100;
          this._key_mode = true;
          break;

        case "ArrowRight":
          // 画面中央を移動基準にする
          event.preventDefault();
          this._free_rotate_drag[0] = -100;
          this._key_mode = true;
          break;
      }
    }
    /**
     * @summary キーを押した時のイベント
     *
     * @private
     * @param {KeyboardEvent} event
     * @memberof StandardUIViewer
     */

  }, {
    key: "_onKeyDown",
    value: function _onKeyDown(event) {
      this.onKeyDown(event);
    }
    /**
     * @summary キーを挙げた時のイベント(公開関数）
     *
     * @param {KeyboardEvent} event
     * @memberof StandardUIViewer
     */

  }, {
    key: "onKeyUp",
    value: function onKeyUp(event) {
      switch (event.key) {
        // [c] 画角の拡大
        case "c":
        case "C":
          this._operation_mode = StandardUIViewer.OperationMode.NONE;
          this._fovy_key = 0;
          break;
        // [z] 画角の縮小

        case "z":
        case "Z":
          this._operation_mode = StandardUIViewer.OperationMode.NONE;
          this._fovy_key = 0;
          break;
        // ↑ 前進

        case "ArrowUp":
          this._operation_mode = StandardUIViewer.OperationMode.NONE;
          this._translate_drag[1] = 0;
          this._key_mode = false;
          break;
        // ↓ 後退

        case "ArrowDown":
          this._operation_mode = StandardUIViewer.OperationMode.NONE;
          this._translate_drag[1] = 0;
          this._key_mode = false;
          break;
        // ← 左回転

        case "ArrowLeft":
          this._operation_mode = StandardUIViewer.OperationMode.NONE;
          this._free_rotate_drag[0] = 0;
          this._key_mode = false;
          break;

        case "ArrowRight":
          this._operation_mode = StandardUIViewer.OperationMode.NONE;
          this._free_rotate_drag[0] = 0;
          this._key_mode = false;
          break;
      }
    }
    /**
     * @summary キーを挙げた時のイベント
     *
     * @private
     * @param {KeyboardEvent} event
     * @memberof StandardUIViewer
     */

  }, {
    key: "_onKeyUp",
    value: function _onKeyUp(event) {
      this.onKeyUp(event);
    }
    /**
     * @summary イベントパラメータの初期化
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_resetEventParameter",
    value: function _resetEventParameter() {
      this._translate_drag[0] = 0;
      this._translate_drag[1] = 0;
      this._rotate_drag[0] = 0;
      this._rotate_drag[1] = 0;
      this._free_rotate_drag[0] = 0;
      this._free_rotate_drag[1] = 0;
      this._height_drag[0] = 0;
      this._height_drag[1] = 0;
      this._operation_mode = StandardUIViewer.OperationMode.NONE;
    }
    /**
     * @カメラの平行移動
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_translation",
    value: function _translation(delta_time) {
      if (this._translate_drag[0] != 0 || this._translate_drag[1] != 0) {
        if (this._key_mode) {
          this._translate_drag[0] *= delta_time;
          this._translate_drag[1] *= delta_time;
        }

        var camera = this._viewer.camera;
        var ray = camera.getCanvasRay(this._mouse_down_position);

        var start_position = this._viewer.getRayIntersection(ray);

        var end_mouse_position = [this._mouse_down_position[0] + this._translate_drag[0], this._mouse_down_position[1] + this._translate_drag[1]];
        ray = camera.getCanvasRay(end_mouse_position);

        var end_position = this._viewer.getRayIntersection(ray);

        if (start_position == null || end_position == null) {
          return;
        }

        var start_spherical_position = new mapray.GeoPoint();
        start_spherical_position.setFromGocs(start_position);
        var end_spherical_position = new mapray.GeoPoint();
        end_spherical_position.setFromGocs(end_position); // 球とレイの交点計算

        var variable_A = Math.pow(this._getVectorLength(ray.direction), 2);
        var variable_B = 2 * GeoMath.dot3(ray.position, ray.direction);
        var variable_C = Math.pow(this._getVectorLength(ray.position), 2) - Math.pow(start_spherical_position.altitude + GeoMath.EARTH_RADIUS, 2);
        var variable_D = variable_B * variable_B - 4 * variable_A * variable_C; // カメラより選択した場所の高度が高い、交点が取れない場合は補正しない

        if (start_spherical_position.altitude < this._camera_parameter.height && end_spherical_position.altitude < this._camera_parameter.height && variable_D > 0) {
          var variable_t1 = (-variable_B + Math.sqrt(variable_D)) / 2 * variable_A;
          var variable_t2 = (-variable_B - Math.sqrt(variable_D)) / 2 * variable_A;
          var variable_t = Math.min(variable_t1, variable_t2);
          end_position[0] = ray.position[0] + variable_t * ray.direction[0];
          end_position[1] = ray.position[1] + variable_t * ray.direction[1];
          end_position[2] = ray.position[2] + variable_t * ray.direction[2];
          end_spherical_position.setFromGocs(end_position);
        }

        var delta_latitude = end_spherical_position.latitude - start_spherical_position.latitude;
        var delta_longitude = end_spherical_position.longitude - start_spherical_position.longitude;
        this._camera_parameter.latitude -= delta_latitude;
        this._camera_parameter.longitude -= delta_longitude;
        this._translate_drag[0] = 0;
        this._translate_drag[1] = 0; // マウスダウンの位置を更新する

        this._mouse_down_position = this._pre_mouse_position;
      }
    }
    /**
     * @summary カメラの回転（回転中心指定）
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_rotation",
    value: function _rotation() {
      if (this._rotate_drag[0] != 0 || this._rotate_drag[1] != 0) {
        if (this._rotate_center == null) {
          this._rotate_drag[0] = 0;
          this._rotate_drag[1] = 0;
          return;
        }

        var camera = this._viewer.camera;
        var camera_direction = GeoMath.createVector3();
        camera_direction[0] = camera.view_to_gocs[12] - this._rotate_center[0];
        camera_direction[1] = camera.view_to_gocs[13] - this._rotate_center[1];
        camera_direction[2] = camera.view_to_gocs[14] - this._rotate_center[2];
        var center_geoPoint = new mapray.GeoPoint();
        center_geoPoint.setFromGocs(this._rotate_center);
        var center_matrix = center_geoPoint.getMlocsToGocsMatrix(GeoMath.createMatrix());
        var rotate_axis = GeoMath.createVector3();
        rotate_axis[0] = center_matrix[8];
        rotate_axis[1] = center_matrix[9];
        rotate_axis[2] = center_matrix[10];
        rotate_axis = GeoMath.normalize3(rotate_axis, GeoMath.createVector3()); // カメラ自身を回転

        var yaw_angle = -this._rotate_drag[0] / 10;
        var pitch_angle = -this._rotate_drag[1] / 10;

        var rotated_direction = this._rotateVector(camera_direction, rotate_axis, yaw_angle);

        var after_pitch = GeoMath.clamp(this._camera_parameter.pitch + pitch_angle, 0, 90);

        if (after_pitch != this._camera_parameter.pitch) {
          rotate_axis[0] = camera.view_to_gocs[0];
          rotate_axis[1] = camera.view_to_gocs[1];
          rotate_axis[2] = camera.view_to_gocs[2];
          rotated_direction = this._rotateVector(rotated_direction, rotate_axis, pitch_angle);
        }

        var new_position = GeoMath.createVector3();
        new_position[0] = this._rotate_center[0] + rotated_direction[0];
        new_position[1] = this._rotate_center[1] + rotated_direction[1];
        new_position[2] = this._rotate_center[2] + rotated_direction[2];
        var new_spherical_position = new mapray.GeoPoint();
        new_spherical_position.setFromGocs(new_position);
        this._camera_parameter.latitude = new_spherical_position.latitude;
        this._camera_parameter.longitude = new_spherical_position.longitude;
        this._camera_parameter.height = new_spherical_position.altitude;
        this._camera_parameter.yaw += yaw_angle;
        this._camera_parameter.pitch = after_pitch;
        this._rotate_drag[0] = 0;
        this._rotate_drag[1] = 0;
      }
    }
    /**
     * @summary カメラの回転（自由回転）
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_freeRotation",
    value: function _freeRotation(delta_time) {
      if (this._free_rotate_drag[0] != 0 || this._free_rotate_drag[1] != 0) {
        if (this._key_mode) {
          this._free_rotate_drag[0] *= delta_time;
          this._free_rotate_drag[1] *= delta_time;
        } // カメラ自身を回転


        var yaw_angle = this._free_rotate_drag[0] / 10;
        var pitch_angle = this._free_rotate_drag[1] / 10;
        var after_pitch = GeoMath.clamp(this._camera_parameter.pitch + pitch_angle, 0, 90);
        this._camera_parameter.yaw += yaw_angle;
        this._camera_parameter.pitch = after_pitch;
        this._free_rotate_drag[0] = 0;
        this._free_rotate_drag[1] = 0;
      }
    }
    /**
     * @summary 高度変更
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_translationOfHeight",
    value: function _translationOfHeight() {
      if (this._height_drag[0] != 0 || this._height_drag[1] != 0) {
        var height_drag = this._height_drag[1];
        var factor = GeoMath.gudermannian((this._camera_parameter.height - 50000) / 10000) + Math.PI / 2;
        var delta_height = height_drag * 100 * factor;
        this._camera_parameter.height += delta_height;
        this._height_drag[0] = 0;
        this._height_drag[1] = 0;
      }
    }
    /**
     * @summary 視線方向への移動
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_translationOfEyeDirection",
    value: function _translationOfEyeDirection() {
      var zoom = 0;

      if (this._zoom_wheel != 0) {
        zoom = Math.pow(0.9, this._zoom_wheel);
        this._zoom_wheel = 0;
      } else if (this._translate_eye_drag[1] != 0) {
        zoom = Math.pow(0.995, this._translate_eye_drag[1]);
        this._translate_eye_drag[1] = 0;
      }

      if (zoom !== 0) {
        var camera = this._viewer.camera; // 移動中心

        var ray = camera.getCanvasRay(this._mouse_down_position);

        var translation_center = this._viewer.getRayIntersection(ray);

        if (translation_center == null) {
          return;
        }

        var center_spherical_position = new mapray.GeoPoint();
        center_spherical_position.setFromGocs(translation_center);
        var translation_vector = GeoMath.createVector3();
        translation_vector[0] = (translation_center[0] - camera.view_to_gocs[12]) * zoom;
        translation_vector[1] = (translation_center[1] - camera.view_to_gocs[13]) * zoom;
        translation_vector[2] = (translation_center[2] - camera.view_to_gocs[14]) * zoom;
        var new_camera_gocs_position = GeoMath.createVector3();
        new_camera_gocs_position[0] = translation_center[0] - translation_vector[0];
        new_camera_gocs_position[1] = translation_center[1] - translation_vector[1];
        new_camera_gocs_position[2] = translation_center[2] - translation_vector[2];
        var new_camera_spherical_position = new mapray.GeoPoint();
        new_camera_spherical_position.setFromGocs(new_camera_gocs_position);

        var elevation = this._viewer.getElevation(new_camera_spherical_position.latitude, new_camera_spherical_position.longitude);

        if (elevation + StandardUIViewer.MINIMUM_HEIGHT > new_camera_spherical_position.altitude) {
          // z_over だけ高い位置になるようにカメラ方向に移動する
          var z_over = new_camera_spherical_position.altitude - (elevation + StandardUIViewer.MINIMUM_HEIGHT);
          var up = center_spherical_position.getUpwardVector(GeoMath.createVector3());
          var translation_vector_length = Math.sqrt(translation_vector[0] * translation_vector[0] + translation_vector[1] * translation_vector[1] + translation_vector[2] * translation_vector[2]);
          var up_dot_dir = GeoMath.dot3(translation_vector, up) / translation_vector_length;
          GeoMath.scale3(1 - z_over / up_dot_dir / translation_vector_length, translation_vector, translation_vector);
          new_camera_gocs_position[0] = translation_center[0] - translation_vector[0];
          new_camera_gocs_position[1] = translation_center[1] - translation_vector[1];
          new_camera_gocs_position[2] = translation_center[2] - translation_vector[2];
          new_camera_spherical_position.setFromGocs(new_camera_gocs_position);
        }

        this._camera_parameter.latitude = new_camera_spherical_position.latitude;
        this._camera_parameter.longitude = new_camera_spherical_position.longitude;
        this._camera_parameter.height = new_camera_spherical_position.altitude;
        this._zoom_wheel = 0;
      }
    }
    /**
     * @summary 画角変更
     *
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_changeFovy",
    value: function _changeFovy() {
      var tanθh = Math.tan(0.5 * this._camera_parameter.fov * GeoMath.DEGREE);
      var θ = 2 * Math.atan(tanθh * Math.pow(StandardUIViewer.FOV_FACTOR, -this._fovy_key));
      var range = StandardUIViewer.FOV_RANGE;
      this._camera_parameter.fov = GeoMath.clamp(θ / GeoMath.DEGREE, range.min, range.max);
      this._fovy_key = 0;
    }
    /**
     * @カメラ位置の設定
     *
     * @param {object}  position            カメラ位置
     * @param {number}  position.latitude   緯度
     * @param {number}  position.longitude  経度
     * @param {number}  position.height     高さ
     * @memberof StandardUIViewer
     */

  }, {
    key: "setCameraPosition",
    value: function setCameraPosition(position) {
      this._camera_parameter.latitude = position.latitude;
      this._camera_parameter.longitude = position.longitude;
      this._camera_parameter.height = position.height; // 最低高度補正

      if (this._camera_parameter.height < StandardUIViewer.MINIMUM_HEIGHT) {
        this._camera_parameter.height = StandardUIViewer.MINIMUM_HEIGHT;
      }
    }
    /**
     * @閾値のある同一判定
     *
     * @param {number}  value1 値1
     * @param {number}  value1 値2
     * @param {number}  threshold 閾値
     * @returns {boolean}  判定結果
     * @private
     * @memberof StandardUIViewer
     */

  }, {
    key: "_isSame",
    value: function _isSame(value1, value2, threshold) {
      var threshold_value = threshold || 0.000001;

      if (Math.abs(value1 - value2) < threshold_value) {
        return true;
      }

      return false;
    }
    /**
     * @注視点の設定
     *
     * @param {object}  position            カメラ位置
     * @param {number}  position.latitude   緯度
     * @param {number}  position.longitude  経度
     * @param {number}  position.height     高さ
     * @memberof StandardUIViewer
     */

  }, {
    key: "setLookAtPosition",
    value: function setLookAtPosition(position, yaw) {
      if (this._isSame(this._camera_parameter.longitude, position.longitude) && this._isSame(this._camera_parameter.latitude, position.latitude)) {
        this._camera_parameter.yaw = yaw || 0;
        this._camera_parameter.pitch = 0;
        return;
      } // 現在の視線方向を取得


      var current_camera_geoPoint = new GeoPoint(this._camera_parameter.longitude, this._camera_parameter.latitude, this._camera_parameter.height);
      var current_camera_matrix = current_camera_geoPoint.getMlocsToGocsMatrix(GeoMath.createMatrix());
      var current_y_direction = GeoMath.createVector3();
      current_y_direction[0] = current_camera_matrix[4];
      current_y_direction[1] = current_camera_matrix[5];
      current_y_direction[2] = current_camera_matrix[6];
      var target_camera_geoPoint = new GeoPoint(position.longitude, position.latitude, position.height);
      var target_camera_matrix = target_camera_geoPoint.getMlocsToGocsMatrix(GeoMath.createMatrix());
      var target_camera_direction = GeoMath.createVector3();
      target_camera_direction[0] = target_camera_matrix[12] - current_camera_matrix[12];
      target_camera_direction[1] = target_camera_matrix[13] - current_camera_matrix[13];
      target_camera_direction[2] = target_camera_matrix[14] - current_camera_matrix[14];
      current_y_direction = GeoMath.normalize3(current_y_direction, GeoMath.createVector3());
      target_camera_direction = GeoMath.normalize3(target_camera_direction, GeoMath.createVector3());
      var rotate_axis = GeoMath.createVector3();
      rotate_axis[0] = current_camera_matrix[8];
      rotate_axis[1] = current_camera_matrix[9];
      rotate_axis[2] = current_camera_matrix[10];

      var yaw_angle = this._calculateAngle(rotate_axis, current_y_direction, target_camera_direction);

      this._camera_parameter.yaw = yaw_angle;
      var current_camera_direction = GeoMath.createVector3();
      current_camera_direction[0] = current_camera_matrix[8];
      current_camera_direction[1] = current_camera_matrix[9];
      current_camera_direction[2] = current_camera_matrix[10];
      var pitch_axis = GeoMath.createVector3();
      pitch_axis[0] = current_camera_matrix[0];
      pitch_axis[1] = current_camera_matrix[1];
      pitch_axis[2] = current_camera_matrix[2];
      rotate_axis = this._rotateVector(pitch_axis, rotate_axis, yaw_angle);
      target_camera_direction[0] = -1 * target_camera_direction[0];
      target_camera_direction[1] = -1 * target_camera_direction[1];
      target_camera_direction[2] = -1 * target_camera_direction[2];
      this._camera_parameter.pitch = GeoMath.clamp(Math.abs(this._calculateAngle(rotate_axis, current_camera_direction, target_camera_direction)), 0, 90);
    }
    /**
     * @summary カメラパラメータの設定
     *
     * @param {object}  parameter               カメラパラメータ
     * @param {number}  parameter.fov           画角
     * @param {number}  parameter.near          近接平面距離
     * @param {number}  parameter.far           遠方平面距離
     * @param {number}  parameter.speed_factor  移動速度係数
     * @memberof StandardUIViewer
     */

  }, {
    key: "setCameraParameter",
    value: function setCameraParameter(parameter) {
      if (parameter.fov) {
        this._camera_parameter.fov = parameter.fov;
        this._default_fov = parameter.fov;
      }

      if (parameter.near) {
        this._camera_parameter.near = parameter.near;
      }

      if (parameter.far) {
        this._camera_parameter.far = parameter.far;
      }

      if (parameter.speed_factor) {
        this._camera_parameter.speed_factor = parameter.speed_factor;
      }
    }
    /**
     * @summary レイヤの取得
     *
     * @param {number} index    レイヤ番号
     * @returns {mapray.Layer}  レイヤ
     * @memberof StandardUIViewer
     */

  }, {
    key: "getLayer",
    value: function getLayer(index) {
      return this._viewer.layers.getLayer(index);
    }
    /**
     * @summary レイヤ数の取得
     *
     * @returns {number}    レイヤ数
     * @memberof StandardUIViewer
     */

  }, {
    key: "getLayerNum",
    value: function getLayerNum() {
      return this._viewer.layers.num_layers();
    }
    /**
     * @summary レイヤの追加（末尾）
     *
     * @param {object}               layer                  作成するレイヤのプロパティ
     * @param {mapray.ImageProvider} layer.image_provider   画像プロバイダ
     * @param {boolean}              layer.visibility       可視性フラグ
     * @param {number}               layer.opacity          不透明度
     * @memberof StandardUIViewer
     */

  }, {
    key: "addLayer",
    value: function addLayer(layer) {
      this._viewer.layers.add(layer);
    }
    /**
     * @summary レイヤの追加（任意）
     *
     * @param {number}               index                  挿入場所
     * @param {object}               layer                  作成するレイヤのプロパティ
     * @param {mapray.ImageProvider} layer.image_provider   画像プロバイダ
     * @param {boolean}              layer.visibility       可視性フラグ
     * @param {number}               layer.opacity          不透明度
     * @memberof StandardUIViewer
     */

  }, {
    key: "insertLayer",
    value: function insertLayer(index, layer) {
      this._viewer.layers.insert(index, layer);
    }
    /**
     * @summary レイヤの削除
     *
     * @param {number} index    レイヤ番号
     * @memberof StandardUIViewer
     */

  }, {
    key: "removeLayer",
    value: function removeLayer(index) {
      this._viewer.layers.remove(index);
    }
    /**
     * @summary レイヤの全削除
     *
     * @memberof StandardUIViewer
     */

  }, {
    key: "clearLayer",
    value: function clearLayer() {
      this._viewer.layers.clear();
    }
    /**
     * @summary エンティティの取得
     *
     * @param {number} index     エンティティ番号
     * @returns {mapray.Entity}  エンティティ
     * @memberof StandardUIViewer
     */

  }, {
    key: "getEntity",
    value: function getEntity(index) {
      return this._viewer.scene.getEntity(index);
    }
    /**
     * @summary エンティティ数の取得
     *
     * @returns {number}    エンティティ数
     * @memberof StandardUIViewer
     */

  }, {
    key: "getEntityNum",
    value: function getEntityNum() {
      return this._viewer.scene.num_entities();
    }
    /**
     * @summary エンティティの追加
     *
     * @param {mapray.Entity} entity    エンティティ
     * @memberof StandardUIViewer
     */

  }, {
    key: "addEntity",
    value: function addEntity(entity) {
      this._viewer.scene.addEntity(entity);
    }
    /**
     * @summary エンティティの削除
     *
     * @param {mapray.Entity} entity    エンティティ
     * @memberof StandardUIViewer
     */

  }, {
    key: "removeEntity",
    value: function removeEntity(entity) {
      this._viewer.scene.removeEntity(entity);
    }
    /**
     * @summary エンティティの全削除
     *
     * @memberof StandardUIViewer
     */

  }, {
    key: "clearEntity",
    value: function clearEntity() {
      this._viewer.scene.clearEntity();
    }
    /**
     * @summary 3次元ベクトルの長さの算出
     *
     * @private
     * @param {mapray.Vector3} vector   対象ベクトル
     * @returns {number}                長さ
     * @memberof StandardUIViewer
     */

  }, {
    key: "_getVectorLength",
    value: function _getVectorLength(vector) {
      return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2) + Math.pow(vector[2], 2));
    }
    /**
     * @summary 3次元ベクトルの任意軸の回転
     *
     * @private
     * @param {mapray.Vector3} vector   対象ベクトル
     * @param {mapray.Vector3} axis     回転軸
     * @param {number}         angle    回転角度（deg.）
     * @returns {mapray.Vector3}        回転後ベクトル
     * @memberof StandardUIViewer
     */

  }, {
    key: "_rotateVector",
    value: function _rotateVector(vector, axis, angle) {
      var rotate_matrix = GeoMath.rotation_matrix(axis, angle, GeoMath.createMatrix());
      var target_vector = GeoMath.createVector3();
      target_vector[0] = vector[0] * rotate_matrix[0] + vector[1] * rotate_matrix[4] + vector[2] * rotate_matrix[8] + rotate_matrix[12];
      target_vector[1] = vector[0] * rotate_matrix[1] + vector[1] * rotate_matrix[5] + vector[2] * rotate_matrix[9] + rotate_matrix[13];
      target_vector[2] = vector[0] * rotate_matrix[2] + vector[1] * rotate_matrix[6] + vector[2] * rotate_matrix[10] + rotate_matrix[14];
      return target_vector;
    }
    /**
     * @summary 任意軸回りの回転角度の算出
     *
     * @private
     * @param {mapray.Vector3} axis             回転軸
     * @param {mapray.Vector3} basis_vector     基準ベクトル
     * @param {mapray.Vector3} target_vector    目標ベクトル
     * @returns {number}                        回転角度（deg.）
     * @memberof StandardUIViewer
     */

  }, {
    key: "_calculateAngle",
    value: function _calculateAngle(axis, basis_vector, target_vector) {
      var a_vector = GeoMath.createVector3();
      var dot_value = GeoMath.dot3(axis, basis_vector);

      for (var i = 0; i < 3; i++) {
        a_vector[i] = basis_vector[i] - dot_value * axis[i];
      }

      var b_vector = GeoMath.createVector3();
      dot_value = GeoMath.dot3(axis, target_vector);

      for (var i = 0; i < 3; i++) {
        b_vector[i] = target_vector[i] - dot_value * axis[i];
      }

      GeoMath.normalize3(a_vector, a_vector);
      GeoMath.normalize3(b_vector, b_vector);

      if (Math.abs(this._getVectorLength(a_vector) < 1.0e-6) || Math.abs(this._getVectorLength(b_vector) < 1.0e-6)) {
        angle = 0;
      } else {
        var angle = Math.acos(GeoMath.clamp(GeoMath.dot3(a_vector, b_vector) / (this._getVectorLength(a_vector) * this._getVectorLength(b_vector)), -1, 1)) / GeoMath.DEGREE;
        var cross_vector = GeoMath.cross3(a_vector, b_vector, GeoMath.createVector3());
        cross_vector = GeoMath.normalize3(cross_vector, GeoMath.createVector3());

        if (GeoMath.dot3(axis, cross_vector) < 0) {
          angle *= -1;
        }
      }

      return angle;
    }
    /**
     * @summary 要素上での座標を取得
     *
     * @private
     * @param {HTMLElement} el    HTMLElement
     * @param {MouseEvent | window.TouchEvent | Touch} event  イベントオブジェクト
     * @returns {array} 要素(el)の上での座標
     * @memberof StandardUIViewer
     */

  }, {
    key: "_mousePos",
    value: function _mousePos(el, event) {
      var rect = el.getBoundingClientRect();
      return [event.clientX - rect.left - el.clientLeft, event.clientY - rect.top - el.clientTop];
    }
  }, {
    key: "startFlyCamera",

    /**
     * @summary ２点間のカメラアニメーション
     *
     * @desc
     * <p>指定した位置間でカメラアニメーションを行う</p>
     * <p> iscs_startで指定した位置、もしくは現在のカメラの位置から、</p>
     * <p> iscs_endで指定した位置から20km南側、上方向に+20kmの高度の位置からiscs_endを注視点とした位置と方向に</p>
     * <p> timeで指定された秒数でカメラアニメーションを行う。</p>
     * <p> 途中、高度200kmまでカメラが上昇する</p>
     *
     * @param  {object} options 引数オブジェクト
     * @param  {number} options.time  移動までにかかる時間を秒で指定
     * @param  {mapray.GeoPoint} [options.iscs_start] スタート位置. 省略時は現在のカメラ位置
     * @param  {mapray.GeoPoint} options.iscs_end  終了位置でのカメラの注視点。target_clampがtrueの場合は高度を自動計算
     * @param  {boolean} [options.target_clamp]  終了位置でカメラの注視点をiscs_endの緯度経度位置直下の標高にするならtrue 省略時はtrue
     * @param  {number} [options.end_altitude] 最終カメラ位置の高さ(m) 省略時は20000m
     * @param  {number} [options.end_from_lookat] 最終カメラ位置を南方向に注視点からどの位置に配置するか(m) 省略時は20000m
     */
    value: function () {
      var _startFlyCamera = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee(options) {
        var _this2 = this;

        var curves;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(this._viewerCameraMode !== StandardUIViewer.CameraMode.CAMERA_FREE)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return");

              case 2:
                if (!(!options.time || !options.iscs_end)) {
                  _context.next = 4;
                  break;
                }

                return _context.abrupt("return");

              case 4:
                // animation
                // 経過時間の初期化
                this._flycamera_total_time = 0;
                this._flycamera_target_time = options.time; // km/s
                // create curve

                curves = this.createFlyCurve(options);
                this._curve_move = curves.move;
                this._curve_rotation = curves.rotation; // EasyBindingBlock

                this._setupAnimationBindingBlock(); // bind


                this._animation.bind("position", this._updater, this._curve_move);

                this._animation.bind("orientation", this._updater, this._curve_rotation);

                this._update_url_hash_backup = this._update_url_hash; // URL更新フラグの待避

                this._update_url_hash = false;
                this._viewerCameraMode = StandardUIViewer.CameraMode.CAMERA_FLY;
                _context.next = 17;
                return new Promise(function (onSuccess, onError) {
                  // onSuccess, onErrorは関数です。onSuccessを呼ぶまで、このプロミスは完了しません。
                  _this2._flycamera_on_success = onSuccess; // onSuccessをグローバル変数に登録
                });

              case 17:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function startFlyCamera(_x) {
        return _startFlyCamera.apply(this, arguments);
      }

      return startFlyCamera;
    }()
    /**
     * @summary KeyFrameでの位置や回転を算出
     *
     * @param  {object} options 引数オブジェクト
     * @param  {number} options.time  移動までにかかる時間を秒で指定
     * @param  {mapray.GeoPoint} [options.iscs_start] スタート位置. 省略時は現在のカメラ位置
     * @param  {mapray.GeoPoint} options.iscs_end  終了位置でのカメラの注視点。target_clampがtrueの場合は高度を自動計算
     * @param  {boolean} [options.target_clamp]  終了位置でカメラの注視点をiscs_endの緯度経度位置直下の標高にするならtrue 省略時はtrue
     * @param  {number} [options.end_altitude] 最終カメラ位置の高さ(m) 省略時は20000m
     * @param  {number} [options.end_from_lookat] 最終カメラ位置を南方向に注視点からどの位置に配置するか(m) 省略時は20000m
     * @returns {object} fly_param 算出した情報
     * @private
     */

  }, {
    key: "_calculateKeyPoint",
    value: function _calculateKeyPoint(options) {
      // fly parameters
      var fly_param = {
        fly_iscs_start: options.iscs_start || null,
        fly_iscs_end: null,
        target_angle: 0,
        start_top: null,
        end_top: null,
        heading: 0,
        tilt: 0,
        roll: 0
      }; // start from current position

      if (options.iscs_start == null) {
        var view_to_gocs = this._viewer.camera.view_to_gocs;
        fly_param.fly_iscs_start = new mapray.GeoPoint().setFromGocs(mapray.GeoMath.createVector3([view_to_gocs[12], view_to_gocs[13], view_to_gocs[14]]));
      }

      var TOP_ALTITUDE = 1200000; // meter

      var end_from_lookat = options.end_from_lookat || 20000;
      var end_altitude = options.end_altitude || 20000;
      var target_clamp = options.target_clamp || true; // [アニメーションに利用する途中と最終の位置情報]
      // カメラの最終地点を計算

      var to_camera = this._destination(options.iscs_end.longitude, options.iscs_end.latitude, end_from_lookat, 0);

      fly_param.fly_iscs_end = new mapray.GeoPoint(to_camera.longitude, to_camera.latitude, end_altitude);

      var getElevationFunc = this._viewer.getElevation.bind(this._viewer);

      if (getElevationFunc) {
        fly_param.fly_iscs_end.altitude += getElevationFunc(fly_param.fly_iscs_end.latitude, fly_param.fly_iscs_end.longitude);
      } // カメラの注視点から最終アングル決定


      var cam_target = options.iscs_end;

      if (getElevationFunc && target_clamp) {
        cam_target.altitude = getElevationFunc(cam_target.latitude, cam_target.longitude);
      }

      fly_param.target_angle = this._getLookAtAngle(fly_param.fly_iscs_end, cam_target); // 途中点

      var from = new mapray.GeoPoint(fly_param.fly_iscs_start.longitude, fly_param.fly_iscs_start.latitude, 0);
      var to = new mapray.GeoPoint(options.iscs_end.longitude, options.iscs_end.latitude, 0);
      var higest = from.getGeographicalDistance(to);

      if (higest > TOP_ALTITUDE) {
        higest = TOP_ALTITUDE;
      }

      fly_param.start_top = new mapray.GeoPoint(fly_param.fly_iscs_start.longitude, fly_param.fly_iscs_start.latitude, fly_param.fly_iscs_end.altitude + higest);
      fly_param.end_top = new mapray.GeoPoint(fly_param.fly_iscs_end.longitude, fly_param.fly_iscs_end.latitude, fly_param.fly_iscs_end.altitude + higest);
      fly_param.heading = this._camera_parameter.yaw;
      fly_param.tilt = this._camera_parameter.pitch;
      fly_param.roll = 0; // set camrea parameter

      this.setCameraParameter({
        near: 30,
        far: 10000000
      });
      return fly_param;
    }
    /**
     * @summary curveの作成
     * <p> this._curve_move と this._curve_rotation を作成 </p>
     *
     * @param  {object} options 引数オブジェクト
     * @param  {number} options.time  移動までにかかる時間を秒で指定
     * @param  {mapray.GeoPoint} [options.iscs_start] スタート位置. 省略時は現在のカメラ位置
     * @param  {mapray.GeoPoint} options.iscs_end  終了位置でのカメラの注視点。target_clampがtrueの場合は高度を自動計算
     * @param  {boolean} [options.target_clamp]  終了位置でカメラの注視点をiscs_endの緯度経度位置直下の標高にするならtrue 省略時はtrue
     * @param  {number} [options.end_altitude] 最終カメラ位置の高さ(m) 省略時は20000m
     * @param  {number} [options.end_from_lookat] 最終カメラ位置を南方向に注視点からどの位置に配置するか(m) 省略時は20000m
     * @returns {object} object.move object.rotation 移動用Curveと回転用curve
     * @protected
     */

  }, {
    key: "createFlyCurve",
    value: function createFlyCurve(options) {
      // calculate key point
      var fly_param = this._calculateKeyPoint(options);

      var keyframes_m = [];
      var keyframes_r = [];
      var curve_move = new mapray.animation.KFLinearCurve(mapray.animation.Type.find("vector3"));
      var curve_rotation = new mapray.animation.KFLinearCurve(mapray.animation.Type.find("vector3"));
      var start = fly_param.fly_iscs_start;
      var end = fly_param.fly_iscs_end;
      var interval = this._flycamera_target_time / 3.0;
      var up_flag = true;

      if (start.altitude > fly_param.start_top.altitude) {
        up_flag = false;
      }

      keyframes_m.push(mapray.animation.Time.fromNumber(0));
      keyframes_m.push(mapray.GeoMath.createVector3([start.longitude, start.latitude, start.altitude]));

      if (up_flag) {
        keyframes_m.push(mapray.animation.Time.fromNumber(interval));
        keyframes_m.push(mapray.GeoMath.createVector3([fly_param.start_top.longitude, fly_param.start_top.latitude, fly_param.start_top.altitude]));
        keyframes_m.push(mapray.animation.Time.fromNumber(interval * 2));
        keyframes_m.push(mapray.GeoMath.createVector3([fly_param.end_top.longitude, fly_param.end_top.latitude, fly_param.end_top.altitude]));
      }

      keyframes_m.push(mapray.animation.Time.fromNumber(this._flycamera_target_time));
      keyframes_m.push(mapray.GeoMath.createVector3([end.longitude, end.latitude, end.altitude]));
      curve_move.setKeyFrames(keyframes_m);
      keyframes_r.push(mapray.animation.Time.fromNumber(0));
      keyframes_r.push(mapray.GeoMath.createVector3([fly_param.heading, fly_param.tilt, fly_param.roll]));

      if (up_flag) {
        keyframes_r.push(mapray.animation.Time.fromNumber(interval));
        keyframes_r.push(mapray.GeoMath.createVector3([fly_param.heading, 10, fly_param.roll]));
        keyframes_r.push(mapray.animation.Time.fromNumber(interval * 2));
        keyframes_r.push(mapray.GeoMath.createVector3([fly_param.heading, 10, fly_param.roll]));
      }

      keyframes_r.push(mapray.animation.Time.fromNumber(this._flycamera_target_time));
      keyframes_r.push(mapray.GeoMath.createVector3([fly_param.target_angle.heading, fly_param.target_angle.tilt * -1, this._roll]));
      curve_rotation.setKeyFrames(keyframes_r);
      return {
        move: curve_move,
        rotation: curve_rotation
      };
    }
    /**
     * @summary update処理
     * <p> Fly実行中(this._viewerCameraMode が StandardUIViewer.CameraMode.CAMERA_FLY の時)は onUpdateFrame から呼び出されます </p>
     *
     * @protected
     */

  }, {
    key: "updateFlyCamera",
    value: function updateFlyCamera(delta_time) {
      this._flycamera_total_time += delta_time;

      this._updater.update(mapray.animation.Time.fromNumber(this._flycamera_total_time));

      if (this._flycamera_total_time >= this._flycamera_target_time) {
        this.onEndFlyCamera();
      }
    }
    /**
     * @summary fly完了処理
     * <p> Fly完了時に呼び出されます </p>
     *
     * @protected
     */

  }, {
    key: "onEndFlyCamera",
    value: function onEndFlyCamera() {
      // unbind
      this._animation.unbind("position");

      this._animation.unbind("orientation");

      this._curve_move = null;
      this._curve_rotation = null;
      this._update_url_hash = this._update_url_hash_backup; // URL更新フラグの復帰

      this._viewerCameraMode = StandardUIViewer.CameraMode.CAMERA_FREE;

      this._resetEventParameter();

      this._flycamera_on_success(); // ここで処理完了を通知する


      this._flycamera_on_success = null;
    }
    /**
     * アニメーションの BindingBlock を初期化
     *
     * @private
     */

  }, {
    key: "_setupAnimationBindingBlock",
    value: function _setupAnimationBindingBlock() {
      var _this3 = this;

      var block = this._animation; // 実体は EasyBindingBlock

      var vector3 = mapray.animation.Type.find("vector3"); // パラメータ名: position
      // パラメータ型: vector3
      //   ベクトルの要素が longitude, latitude, altitude 順であると解釈

      block.addEntry("position", [vector3], null, function (value) {
        _this3.setCameraPosition({
          longitude: value[0],
          latitude: value[1],
          height: value[2]
        });
      }); // パラメータ名: view
      // パラメータ型: vector3
      //   型が matirix のときはビュー行列
      //   型が vector3 のとき、要素が heading, tilt, roll 順であると解釈

      block.addEntry("orientation", [vector3], null, function (value) {
        _this3._camera_parameter.yaw = value[0];
        _this3._camera_parameter.pitch = value[1];

        _this3._updateViewerCamera();
      });
    }
    /**
     * startからtargetを見るためののheadingとtiltを算出
     *
     * @param  {mapray.GeoPoint} start
     * @param  {mapray.GeoPoint} target
     *
     * @private
     */

  }, {
    key: "_getLookAtAngle",
    value: function _getLookAtAngle(start, target) {
      // 現在の視線方向を取得
      var s_matrix = start.getMlocsToGocsMatrix(GeoMath.createMatrix());
      var s_y_dir = GeoMath.createVector3([s_matrix[4], s_matrix[5], s_matrix[6]]);
      s_y_dir = GeoMath.normalize3(s_y_dir, GeoMath.createVector3());
      var t_matrix = target.getMlocsToGocsMatrix(GeoMath.createMatrix());
      var t_dir = GeoMath.createVector3([t_matrix[12] - s_matrix[12], t_matrix[13] - s_matrix[13], t_matrix[14] - s_matrix[14]]);
      t_dir = GeoMath.normalize3(t_dir, GeoMath.createVector3());
      var rotate_axis = GeoMath.createVector3([s_matrix[8], s_matrix[9], s_matrix[10]]);

      var heading_angle = this._calculateAngle(rotate_axis, s_y_dir, t_dir);

      var s_x_dir = GeoMath.createVector3([s_matrix[8], s_matrix[9], s_matrix[10]]);
      var rotate_axis2 = GeoMath.createVector3([s_matrix[0], s_matrix[1], s_matrix[2]]);
      t_dir[0] = -1 * t_dir[0];
      t_dir[1] = -1 * t_dir[1];
      t_dir[2] = -1 * t_dir[2];
      var tilt_angle = -1.0 * GeoMath.clamp(Math.abs(this._calculateAngle(rotate_axis2, s_x_dir, t_dir)), 0, 90);
      return {
        heading: heading_angle,
        tilt: tilt_angle
      };
    }
    /**
     * @summary ある地点から指定距離、指定方向に移動した位置を算出する
     *
     * @private
     * @param {number}            longitude     経度
     * @param {number}            latitude      緯度
     * @param {number}            distance      距離(m)
     * @param {number}            bearing       方角
     * @return {Mapray.GeoPoint}  location_geo
     */

  }, {
    key: "_destination",
    value: function _destination(longitude, latitude, distance, bearing) {
      var heading_theta = -(180 - bearing) * GeoMath.DEGREE;
      var pos_x = -distance * Math.sin(heading_theta);
      var pos_y = distance * Math.cos(heading_theta);
      var target_point = new mapray.GeoPoint(longitude, latitude, 0);
      var target_matrix = target_point.getMlocsToGocsMatrix(GeoMath.createMatrix());
      var target_x = pos_x * target_matrix[0] + pos_y * target_matrix[4] + target_matrix[12];
      var target_y = pos_x * target_matrix[1] + pos_y * target_matrix[5] + target_matrix[13];
      var target_z = pos_x * target_matrix[2] + pos_y * target_matrix[6] + target_matrix[14];
      var location_geo = new mapray.GeoPoint();
      location_geo.setFromGocs([target_x, target_y, target_z]);
      return location_geo;
    }
  }, {
    key: "viewer",
    get: function get() {
      return this._viewer;
    }
  }]);

  return StandardUIViewer;
}(mapray.RenderCallback);

var CameraMode = {
  NONE: "NONE",
  CAMERA_FREE: "CAMERA_FREE",
  CAMERA_FLY: "CAMERA_FLY"
};
var OperationMode = {
  NONE: "NONE",
  TRANSLATE: "TRANSLATE",
  ROTATE: "ROTATE",
  FREE_ROTATE: "FREE_ROTATE",
  EYE_TRANSLATE: "EYE_TRANSLATE",
  HEIGHT_TRANSLATE: "HEIGHT_TRANSLATE",
  CHANGE_FOVY: "CHANGE_FOVY"
};
{
  StandardUIViewer.OperationMode = OperationMode;
  StandardUIViewer.CameraMode = CameraMode; // カメラ位置の初期値（本栖湖付近）

  StandardUIViewer.DEFAULT_CAMERA_POSITION = {
    latitude: 35.475968,
    longitude: 138.573161,
    height: 2000
  }; // 注視点位置の初期値（富士山付近）

  StandardUIViewer.DEFAULT_LOOKAT_POSITION = {
    latitude: 35.360626,
    longitude: 138.727363,
    height: 2000
  }; // カメラパラメータの初期値

  StandardUIViewer.DEFAULT_CAMERA_PARAMETER = {
    fov: 60,
    near: 30,
    far: 500000,
    speed_factor: 2000
  }; // カメラと地表面までの最低距離

  StandardUIViewer.MINIMUM_HEIGHT = 2.0; // 最小近接平面距離 (この値は MINIMUM_HEIGHT * 0.5 より小さい値を指定します)

  StandardUIViewer.MINIMUM_NEAR = 1.0; // 最小遠方平面距離

  StandardUIViewer.MINIMUM_FAR = 500000; // 高度からの近接平面距離を計算するための係数

  StandardUIViewer.NEAR_FACTOR = 0.01; // 近接平面距離からの遠方平面距離を計算するための係数

  StandardUIViewer.FAR_FACTOR = 10000; // 画角の適用範囲

  StandardUIViewer.FOV_RANGE = {
    min: 5,
    max: 120
  }; // 画角の倍率　θ' = 2 atan(tan(θ/2)*f)

  StandardUIViewer.FOV_FACTOR = 1.148698354997035;
}

/**
 * Mapray UI関連の機能が含まれる名前空間
 * @namespace maprayui
 */

var maprayui = {
  StandardUIViewer: StandardUIViewer
};

return maprayui;

})));
//# sourceMappingURL=maprayui.js.map
