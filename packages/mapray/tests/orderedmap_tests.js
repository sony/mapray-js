import OrderedMap from "../dist/es/OrderedMap";

test('serial_insert', () => {
    for ( let map of create_serial_maps() ) {
        // 順次確認
        for ( let it = map.findFirst(), cnt = 0; it !== null; it = it.findSuccessor(), ++cnt ) {
            expect(it.value).toEqual(cnt)
        }
        // 逆順確認
        for ( let it = map.findLast(), cnt = map.size - 1; it !== null; it = it.findPredecessor(), --cnt ) {
            expect(it.value).toEqual(cnt)
        }
    }
});


test('serial_remove', () => {
    // 順次 (一括)
    for ( let map of create_serial_maps() ) {
        map.remove( map.findFirst(), null );
        assert_empty( map );
    }

    // 順次 (first)
    for ( let map of create_serial_maps() ) {
        let size = map.size;
        for ( let i = 0; i < size; ++i ) {
            map.remove( map.findFirst() );
        }
        assert_empty( map );
    }

    // 逆順 (last)
    for ( let map of create_serial_maps() ) {
        let size = map.size;
        for ( let i = 0; i < size; ++i ) {
            map.remove( map.findLast() );
        }
        assert_empty( map );
    }

    // 順次 (successor)
    for ( let map of create_serial_maps() ) {
        for ( let it = map.findFirst(); it !== null; ) {
            let next = it.findSuccessor();
            map.remove( it );
            it = next;
        }
        assert_empty( map );
    }

    // 逆順 (predecessor)
    for ( let map of create_serial_maps() ) {
        for ( let it = map.findLast(); it !== null; ) {
            let next = it.findPredecessor();
            map.remove( it );
            it = next;
        }
        assert_empty( map );
    }

    // 順次 (remove 返却値)
    for ( let map of create_serial_maps() ) {
        for ( let it = map.findFirst(); it !== null; ) {
            it = map.remove( it );
        }
        assert_empty( map );
    }
});


test('random_clone', () => {
    let map = new OrderedMap( (a, b) => a < b );

    for ( let i = 0; i < 1000; ++i ) {
        let key = Math.random();
        map.insert( key, key );
    }

    let cloned = map.clone();
    cloned.remove( cloned.findFirst(), null );
});


test('random_insert', () => {
    let map = new OrderedMap( (a, b) => a < b );

    for ( let i = 0; i < 1000; ++i ) {
        let key = Math.random();
        map.insert( key, key );
    }

    let count = 0;
    for ( let i = map.findFirst(); i !== null; i = i.findSuccessor() ) {
        ++count;
    }

    let lower1 = map.findLower( 0.5 );
    let upper1 = map.findUpper( 0.5 );

    let lower2 = map.findLower( 10 );
    let upper2 = map.findUpper( 10 );

    let lower3 = map.findLower( -10 );
    let upper3 = map.findUpper( -10 );

    let lower4 = map.findLower( map.findFirst().key );
    let upper4 = map.findUpper( map.findFirst().key );

    let lower5 = map.findLower( map.findLast().key );
    let upper5 = map.findUpper( map.findLast().key );

    map.remove( map.findFirst(), null );
});


test('random_remove', () =>  {
    let map = new OrderedMap( (a, b) => a < b );

    let items = [];

    for ( let i = 0; i < 1000; ++i ) {
        let key = Math.random();
        items.push( map.insert( key, key ) );
    }

    shuffleArray( items );

    for ( let item of items ) {
        map.remove( item );
    }

    assert_empty( map );
});


test('random_overall', () => {
    const count  = 1000;
    const value1 = 1;
    const value2 = 2;

    // ランダムの辞書を作成
    let keys1 = [];
    for ( let i = 0; i < count; ++i ) {
        let key = i + Math.random() / 2;
        keys1.push( key );
    }
    shuffleArray( keys1 );

    let map1 = new OrderedMap( (a, b) => a < b );
    for ( let key of keys1 ) {
        map1.insert( key, value1 );
    }

    // map1 の複製に同じキーを違う順序で違う値を上書き
    let keys2 = keys1.concat();
    shuffleArray( keys2 );

    let map2 = map1.clone();
    for ( let key of keys2 ) {
        map2.insert( key, value2 );
    }

    // map2 の複製から同じキーを違う順序で検索
    let keys3 = keys2.concat();
    shuffleArray( keys3 );

    let map3 = map2.clone();

    expect(map3.size).toEqual(count);

    let items = [];

    for ( let key of keys3 ) {
        let lower = map3.findLower( key );
        let upper = map3.findUpper( key );
        let equal = map3.findEqual( key );

        expect(lower).not.toBeNull();
        expect(lower).not.toEqual(upper);
        expect(equal).not.toBeNull();
        expect(lower.key).toEqual(key);
        expect(lower.value).toEqual(value2);
        expect(equal.key).toEqual(key);
        expect(equal.value).toEqual(value2);
  
        items.push( lower );
    }

    // map3 から検索と違う順序ですべて削除
    shuffleArray( items );

    for ( let it of items ) {
        map3.remove( it );
    }

    assert_empty( map3 );
    if ( map3.size != 0 ) {
        console.error( "map3.size != 0" );
    }
});

const create_serial_maps = () => {
    let map1 = new OrderedMap( (a, b) => a < b );
    for ( let i = 0; i < 1000; ++i ) {
        map1.insert( i, i );
    }

    let map2 = new OrderedMap( (a, b) => a < b );
    for ( let i = 999; i >= 0; --i ) {
        map2.insert( i, i );
    }

    let map3 = new OrderedMap( (a, b) => a < b );

    let integers = [];
    for ( let i = 0; i < 1000; ++i ) {
        integers.push( i );
    }
    shuffleArray( integers );

    for ( let i of integers ) {
        map3.insert( i, i );
    }

    return [map1, map2, map3];
}


const assert_empty = map => expect(map.isEmpty()).toBeTruthy();


const shuffleArray = array => {
    // Fisher-Yates のシャッフル
    for ( let i = array.length - 1; i > 0; --i ) {
        let j = Math.floor( Math.random() * (i + 1) );  // 0 <= j <= i

        // array[i] と array[j] を交換
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
