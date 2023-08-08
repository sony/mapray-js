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

        // 潜在的不具合検出など(warning)
        'no-var': 1, // varを使わずletかconstにすべき
        'prefer-const': 1, // 再代入しない変数はconstにすべき
        'no-dupe-class-members': 1, // class member名の重複 static memberで `static` で改行していると誤検知する
        'no-prototype-builtins': 1, // Object.hasOwnPropertiesなどを使うべきでない
        'no-cond-assign': 1, // if内部での代入
        'no-unused-labels': 1, // 未使用のラベル
        '@typescript-eslint/unbound-method': 1, // bindせずにmethodを変数へ代入禁止
        '@typescript-eslint/no-unsafe-argument': 1, // anyや型違いの使用禁止
        '@typescript-eslint/no-unsafe-return': 1, // anyや型違いの使用禁止
        '@typescript-eslint/no-unsafe-assignment': 1, // anyや型違いの使用禁止
        '@typescript-eslint/no-unsafe-member-access': 1, // anyや型違いの使用禁止
        '@typescript-eslint/no-unsafe-call': 1, // anyや型違いの使用禁止
        '@typescript-eslint/ban-types': 1, // Booleanなど使用すべきでない型禁止
        '@typescript-eslint/require-await': 1, // promiseは待て
        '@typescript-eslint/no-floating-promises': 1, // 処理されないpromise禁止
        '@typescript-eslint/await-thenable': 1, // promise以外をawait禁止
        '@typescript-eslint/no-unnecessary-type-assertion': 1, // 不要な型Assertion禁止
        '@typescript-eslint/no-loss-of-precision': 1, // 精度の低下する代入等禁止

        // 無効
        'no-inner-declarations': 0, // namespace内部のみでの宣言禁止
        'no-empty': 0, // 空block
        'no-constant-condition': 0, // while (true) などの禁止
        '@typescript-eslint/ban-ts-comment': 0, // @ts-ignore等の禁止
        '@typescript-eslint/no-namespace': 0, // namespace禁止
        '@typescript-eslint/restrict-plus-operands': 0, // 数値以外の`+`使用の禁止
        '@typescript-eslint/no-empty-function': 0, //空関数禁止
        '@typescript-eslint/no-inferrable-types': 0, // 初期値代入などで確定する型の型定義禁止
        '@typescript-eslint/no-array-constructor': 0, // `Array()` でなく `[]` を使うべき
        '@typescript-eslint/no-extra-semi': 0, // 不要なセミコロン禁止
        '@typescript-eslint/no-this-alias': 0, // this を変数に代入禁止
        '@typescript-eslint/no-empty-interface': 0, // 空Interface禁止

        // format指定(warning)
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
        'space-in-parens': [1, 'always'], // () 内にスペース
        'space-before-blocks': [1, 'always'], // {} 前後にスペース
        'space-before-function-paren': [1, 'never'], // 関数名と()の間にスペース禁止
        'func-call-spacing': [1, 'never'], // 関数呼び出し時の関数名と()の間にスペース禁止
        'keyword-spacing': [ // キーワード(`if` `switch` など)前後にスペース
            1,
            {
                before: true,
                after: true,
            }
        ]

    }
};
