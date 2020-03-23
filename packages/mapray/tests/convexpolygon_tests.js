import ConvexPolygon from "../src/ConvexPolygon";

/**
 * 同一三角形同士の交差
 */
test('same_triangle', () =>
{
    for ( let i = 0; i < 100; ++i ) {
        let cp = create_random_triangle();

        // 同一なら交差するはず
        expect(cp.getIntersection( cp )).not.toBeNull()
        // 同一なら交差するはず
        expect(cp.hasIntersection( cp )).toBeTruthy()
    }
});


/**
 * 違う三角形同士の交差
 */
test('different_triangle', () => {

    for ( let i = 0; i < 100; ++i ) {
        let cp1 = create_random_triangle();
        let cp2 = create_random_triangle();

        let icp = check_validity( cp1.getIntersection( cp2 ) );
        expect(icp).toEqual(cp1.getIntersection( cp2 ));
    }
});


/**
 * ダイヤモンドと正方形の交差
 */
test('diamond_square_fit' , () => {
    let {diamond, square} = create_diamond_and_squre( 0, 0 );
    expect(square.includes( diamond )).toBeTruthy();
    expect(diamond.includes( square )).toBeFalsy();

    let icp1 = check_validity( diamond.getIntersection( square ) );
    let icp2 = check_validity( square.getIntersection( diamond ) );
    expect(icp1).not.toBeNull();
    expect(icp2).not.toBeNull();
});


/**
 * ダイヤモンドの周辺に正方形 (かすめるが交差しない)
 */
test('square_around_diamond', () =>
{
    for ( let soy = -2; soy <= 2; soy += 2 ) {
        for ( let sox = -2; sox <= 2; sox += 2 ) {
            if ( sox == 0 && soy == 0 ) continue; // ど真ん中は飛ばす

            let {diamond, square} = create_diamond_and_squre( sox, soy );
            expect(square.includes( diamond )).toBeFalsy();
            expect(diamond.includes( square )).toBeFalsy();
            expect(diamond.hasIntersection( square )).toBeFalsy();
            expect(square.hasIntersection( diamond )).toBeFalsy();


            let icp1 = check_validity( diamond.getIntersection( square ) );
            let icp2 = check_validity( square.getIntersection( diamond ) );
            expect(icp1).toBeNull();
            expect(icp2).toBeNull();
        }
    }
});


/**
 * ダイヤモンドの周辺に正方形 (頂点で交差する)
 */
test('diamond_square_vertex', () =>
{
    for ( let soy = -1; soy <= 1; soy += 1 ) {
        for ( let sox = -1; sox <= 1; sox += 1 ) {
            if ( sox == 0 && soy == 0 ) continue; // ど真ん中は飛ばす

            let {diamond, square} = create_diamond_and_squre( sox, soy );
            expect(square.includes( diamond )).toBeFalsy();
            expect(diamond.includes( square )).toBeFalsy();
            expect(diamond.hasIntersection( square )).toBeTruthy();
            expect(square.hasIntersection( diamond )).toBeTruthy();

            let icp1 = check_validity( diamond.getIntersection( square ) );
            let icp2 = check_validity( square.getIntersection( diamond ) );
            expect(icp1).not.toBeNull();
            expect(icp2).not.toBeNull();
        }
    }
});


/**
 * ほぼ同じ三角形同士
 */
test('similar_triangles', () => {
    expect.assertions(0);
    for ( let i = 0; i < 100; ++i ) {
        let original_points = create_random_triangle_points();
        let  similar_points = [];

        for ( let coord of original_points ) {

            let offset = (2*Math.random() - 1) * Number.EPSILON;

            similar_points.push( coord + offset );
        }

        let ocp = check_validity( new ConvexPolygon( original_points ) );
        let scp = new ConvexPolygon( similar_points );  // 稀に妥当にならない可能性はある

        try {
            let icp = ocp.getIntersection( scp );  // 誤差により妥当にならない可能性はある
        }
        catch (e) {
            expect(e).not.toBeUndefined();
        }
    }
});


/**
 * 凸多角形の妥当性を検査
 */
const check_validity = cp => {
    if ( (cp !== null) && !cp.isValid() ) {
        console.error( "invalid convex polygon!" );
    }

    return cp;
}


/**
 * ランダム三角形を生成
 */
const create_random_triangle = () => {
    // 凸多角形を生成
    return check_validity( new ConvexPolygon( create_random_triangle_points() ) );
};


const create_random_triangle_points = () => {
    // 任意周り 3 点
    let points = [];
    for ( let i = 0; i < 3; ++i ) {
        let x = 2 * Math.random() - 1;
        let y = 2 * Math.random() - 1;
        points.push( [x, y] );
    }

    // 反時計回りに変換
    let dirs = [];
    for ( let i = 1; i < 3; ++i ) {
        let x = points[i][0] - points[0][0];
        let y = points[i][1] - points[0][1];
        dirs.push( [x, y] );
    }

    let det = dirs[0][0] * dirs[1][1] - dirs[1][0] * dirs[0][1];
    if ( det < 0 ) {
        points.reverse();
    }

    // 三角形の頂点配列
    return points.flat();
}


const create_diamond_and_squre = ( sox, soy ) => {
    let diamond = check_validity( new ConvexPolygon( [0, 1, -1, 0, 0, -1, 1, 0] ) );
    let square  = check_validity( new ConvexPolygon( [-1 + sox, -1 + soy,
                                                      1 + sox, -1 + soy,
                                                      1 + sox, 1 + soy,
                                                      -1 + sox, 1 + soy] ) );
    return { diamond, square };
}
