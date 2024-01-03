module.exports = {
    env: {
        es6: true,
        node: true,
        browser: true
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json'
    },
    plugins: [
          '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    ignorePatterns: [
        'src/wasm/*',
    ],
    rules: {
        // 0: 無効 1:warning 2:error

        // 潜在的不具合検出など(error)
        'no-var': 1, // varを使わずletかconstにすべき // @ToDo: 2
        'prefer-const': 1, // 再代入しない変数はconstにすべき // @ToDo: 2
        'no-dupe-class-members': 1, // class member名の重複 static memberで `static` で改行していると誤検知する // @ToDo: 2
        'no-prototype-builtins': 1, // Object.hasOwnPropertiesなどを使うべきでない // @ToDo: 2
        'no-cond-assign': 1, // if内部での代入 // @ToDo: 2
        'no-unused-labels': 1, // 未使用のラベル // @ToDo: 2
        'no-this-before-super': 2, // super() を呼び出す前に this または super を使わないこと
        '@typescript-eslint/prefer-nullish-coalescing': 1, // || ではなく ?? を使う // @ToDo: 2

        '@typescript-eslint/unbound-method': 1, // bindせずにmethodを変数へ代入禁止 // @ToDo: 2
        '@typescript-eslint/no-unsafe-argument': 1, // anyや型違いの使用禁止 // @ToDo: 2
        '@typescript-eslint/no-unsafe-return': 1, // anyや型違いの使用禁止 // @ToDo: 2
        '@typescript-eslint/no-unsafe-assignment': 1, // anyや型違いの使用禁止 // @ToDo: 2
        '@typescript-eslint/no-unsafe-member-access': 1, // anyや型違いの使用禁止 // @ToDo: 2
        '@typescript-eslint/no-unsafe-call': 1, // anyや型違いの使用禁止 // @ToDo: 2
        '@typescript-eslint/ban-types': 1, // Booleanなど使用すべきでない型禁止
        '@typescript-eslint/require-await': 1, // promiseは待つ
        '@typescript-eslint/no-floating-promises': 1, // 処理されないpromise禁止
        '@typescript-eslint/await-thenable': 1, // promise以外をawait禁止 // @ToDo: 2
        '@typescript-eslint/no-unnecessary-type-assertion': 1, // 不要な型Assertion禁止
        '@typescript-eslint/no-loss-of-precision': 1, // 精度の低下する代入等禁止
        'no-duplicate-imports': 1, // ひとつのモジュールにはひとつのimport文を使用する
        'no-extra-boolean-cast': 1, // 不要なbooleanのキャストをしない
        'no-floating-decimal': 1, // 浮動小数点数のゼロ省略は禁止

        'no-inner-declarations': 0, // namespace内部のみでの宣言禁止
        'no-empty': 1, // 空block
        'no-constant-condition': 0, // while (true) などの禁止
        'no-lonely-if': 1, // else 内に 単独の if文 は書いてはいけない // @ToDo: 2
        'no-negated-condition': 0, // else句を持つ if文 は 否定構文 で記述しないこと
        'consistent-this': [1, "self"], // this を代入できるのは self だけ // @ToDo: 2
        '@typescript-eslint/ban-ts-comment': 0, // @ts-ignore等の禁止
        '@typescript-eslint/no-namespace': 0, // namespace禁止
        '@typescript-eslint/restrict-plus-operands': 0, // 数値以外の`+`使用の禁止
        '@typescript-eslint/no-empty-function': 0, //空関数禁止
        '@typescript-eslint/no-inferrable-types': 0, // 初期値代入などで確定する型の型定義禁止
        '@typescript-eslint/no-array-constructor': 1, // `Array()` でなく `[]` を使うべき
        '@typescript-eslint/no-this-alias': 0, // this を変数に代入禁止
        '@typescript-eslint/no-empty-interface': 0, // 空Interface禁止

        // format指定(error)
        'eol-last': 2, // ファイルの末尾は必ず改行とする
        'no-trailing-spaces': 1, // 行末に不要な空白を残さない
        'no-irregular-whitespace': 1, // イレギュラーな空白は禁止
        'no-tabs': 2, // tab禁止
        'linebreak-style': [2, "unix"], // 改行文字を \n とする
        'no-irregular-whitespace': 1, // @ToDo: 2

        // format指定(warning)
        'indent': [1, 4, // インデント
            {
                'SwitchCase': 1,
                'MemberExpression': 'off', // メソッドチェインのインデント設定 "off"は指定なし
                "flatTernaryExpressions": true, // 入れ子の3項演算子でインデントを入れない
                "ignoredNodes": [ // インデントチェックしない項目
                ],
            }
        ],
        'semi': [1, "always"], // セミコロンを強制する
        '@typescript-eslint/no-extra-semi': 1, // 不要なセミコロン禁止
        "quotes": [1, "double"], // ダブルクオートとする
        '@typescript-eslint/naming-convention': [ // private member を `_` で始める
            1,
            {
                selector: ['memberLike'],
                modifiers: ['private'],
                format: ['snake_case', 'camelCase'],
                prefix: ['_']
            }
        ],
        'comma-spacing': 1, // コンマの後ろにスペース
        'comma-style': 1, // コンマスタイル
        'brace-style': 0, // ブレーススタイル (if,forなどの構文は適用したいが、関数名は適用したくないため有効にできない)
        'space-in-parens': [1, 'always'], // () 内にスペース
        'space-before-blocks': [1, 'always'], // {} 前後にスペース
        'computed-property-spacing': [1, "never"], // [] 前後にスペースを入れない
        'semi-spacing': 1, // セミコロンの後にはスペースが必要。また、セミコロン前のスペースは不要
        'block-spacing': 1, // ブロックの内側にスペースを入れる
        'space-before-function-paren': [1, 'never'], // 関数名と()の間にスペース禁止
        'func-call-spacing': [1, 'never'], // 関数呼び出し時の関数名と()の間にスペース禁止
        'keyword-spacing': [ // キーワード(`if` `switch` など)前後にスペース
            1,
            {
                before: true,
                after: true,
            }
        ],
        '@typescript-eslint/no-unused-vars': [ 1, { 'argsIgnorePattern': '^_' } ] // 未使用引数は `_` で始まるものは許容

    }
};
