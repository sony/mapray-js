import Type from "./Type_impl.js";
import {registerPredefinedTypes} from "./predefined_types";

// Type の使用と同時に事前定義型を使えるようにする
registerPredefinedTypes();

export default Type;
