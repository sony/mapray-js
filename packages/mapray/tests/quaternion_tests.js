/**
 * Test for the Quaternion function
 * Got ideas from (https://github.com/google/mathfu/blob/master/unit_tests/quaternion_test/quaternion_test.cpp)
 */
import GeoMath, {GeoPoint, Orientation} from "../dist/es/GeoMath";

function isNormalizedQuaternion( quaternion ) {
    const length = GeoMath.length4(quaternion);
    return Math.abs(length - 1) <= Number.EPSILON;
}

test('convert_matrix_test', () => {
    const matrix = new Float64Array( [
        0.9185310942659339,  -0.3944053933712554, -0.0272949545940534,  0,
       -0.1190893777958439, -0.21019190799176876, -0.9703798647493561,  0,
        0.3769858736913426,   0.8945746181814266, -0.2400372961494317,  0,
                         0,                    0,                   0,  1
    ]);
    const quaternion = GeoMath.matrix_to_quat(matrix, GeoMath.createVector4());
    const matrix2 = GeoMath.quat_to_matrix([1,1,1], quaternion, GeoMath.createMatrix());

    expect(isEqualMatrices(matrix, matrix2)).toBeTruthy();
});


test('inverse_test', () => {
    const matrix = new Float64Array([
        -0.37536962247904865, -0.2213648393478177,  0.90005291756676800, 0,
        -0.37006725230465554, -0.8545108889973035, -0.36450153546551820, 0,
         0.84979284257495300, -0.4699029138934476,  0.23883755195284564, 0,
                           0,                   0,                    0, 1
    ]);
    const quaternion = GeoMath.matrix_to_quat(matrix, GeoMath.createVector4());
    const inv_quaternion = GeoMath.inverse_quat(quaternion, GeoMath.createVector4());

    const result = GeoMath.mul_quat(quaternion, inv_quaternion, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(1, 5);
});


test('rotation_quat_test', () =>{
    let angle = 10.033606130667359;
    let axis = GeoMath.createVector3([
        0.9396329510160144,
        -0.5641642132017703,
        -0.7239735304897015
    ]);
    let quaternion = GeoMath.rotation_quat(axis, angle, GeoMath.createVector4());
    expect(quaternion[0]).toBeCloseTo(0.06255638147262522, 5);
    expect(quaternion[1]).toBeCloseTo(-0.037559423279156505, 5);
    expect(quaternion[2]).toBeCloseTo(-0.04819878262083761, 5);
    expect(quaternion[3]).toBeCloseTo(0.9961690951911015, 5);

    angle = 241.84177269280295;
    axis = GeoMath.createVector3([
        0.8999196250149759,
        -0.7309035111955051,
        -0.4523211500074993
    ]);
    quaternion = GeoMath.rotation_quat(axis, angle, GeoMath.createVector4());
    expect(quaternion[0]).toBeCloseTo(0.6203684078021396, 5);
    expect(quaternion[1]).toBeCloseTo(-0.5038554943057311, 5);
    expect(quaternion[2]).toBeCloseTo(-0.3118120150349154, 5);
    expect(quaternion[3]).toBeCloseTo(-0.5138540130609388, 5);

    // Quaternion rotate [1,0,0] around [0,0,1]
    angle = 90;
    axis = GeoMath.createVector3([
        0,
        0,
        1
    ]);
    quaternion = GeoMath.rotation_quat(axis, angle, GeoMath.createVector4());

    // p′ = q*p*inv(q)
    const result = GeoMath.mul_quat(
        GeoMath.mul_quat(quaternion, [1,0,0,0], GeoMath.createVector4()),
        GeoMath.inverse_quat(quaternion,GeoMath.createVector4(), GeoMath.createVector4()),
        GeoMath.createVector4()
    );
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(1, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(0, 5);
});


test('mul_test', () => {
    let angle = 109.11845306882807;
    let angle2 = 36.86641696921942;

    let axis = GeoMath.createVector3([
        -0.36065125602161574,
        0.748431856235205,
        0.2204551866055846
    ]);
    let axis2 = GeoMath.createVector3([
        0.5934495461687623,
        0.8077750230203598,
        -0.6801066357826091
    ]);
    let quaternion1 = GeoMath.rotation_quat(axis, angle, GeoMath.createVector4());
    let quaternion2 = GeoMath.rotation_quat(axis2, angle2, GeoMath.createVector4());
    let result = GeoMath.mul_quat(quaternion1, quaternion2, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(-0.4044779015036345, 5);
    expect(result[1]).toBeCloseTo( 0.7669521566380970, 5);
    expect(result[2]).toBeCloseTo(-0.08668921765741092, 5);
    expect(result[3]).toBeCloseTo( 0.49057822634655723, 5);

    angle = -44.29644462360008;
    angle2 = 102.81309520682544;

    axis = GeoMath.createVector3([
        -0.9433430027926879,
        -0.6038549767791657,
        0.4811400253149425
    ]);
    axis2 = GeoMath.createVector3([
        0.9844110403497002,
        0.05693538269342602,
        -0.857668538114686
    ]);
    quaternion1 = GeoMath.rotation_quat(axis, angle, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis2, angle2, GeoMath.createVector4());
    result = GeoMath.mul_quat(quaternion1, quaternion2, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(0.636560586761528, 5);
    expect(result[1]).toBeCloseTo(0.21007493357392537, 5);
    expect(result[2]).toBeCloseTo(-0.6679269208740116, 5);
    expect(result[3]).toBeCloseTo(0.3233152796226803, 5);

    // Quaternion multiplication corresponds to the sum of rotation when rotate on the same axis
    angle = 27.14439773136182;
    angle2 = 132.06667484737503;
    axis = GeoMath.createVector3([
        -0.6621913709868701,
        -0.7387528708512803,
        0.9677955970888537
    ]);
    quaternion1 = GeoMath.rotation_quat(axis, angle, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angle2, GeoMath.createVector4());
    result = GeoMath.mul_quat(quaternion1, quaternion2, GeoMath.createVector4());

    const result2 = GeoMath.rotation_quat(axis, angle + angle2, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo(result2[0], 5);
    expect(result[1]).toBeCloseTo(result2[1], 5);
    expect(result[2]).toBeCloseTo(result2[2], 5);
    expect(result[3]).toBeCloseTo(result2[3], 5);
});


test('slerp_test', () => {
    let quaternion1 = GeoMath.createVector4([1, 0, 0, 0]);
    let quaternion2 = GeoMath.createVector4([0, 1, 0, 0]);
    let slerp_value = 0.5;

    const sqrt1_2 = Math.SQRT1_2;
    let result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo(sqrt1_2, 5);
    expect(result[1]).toBeCloseTo(sqrt1_2, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(0, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    quaternion1 = GeoMath.createVector4([0,  sqrt1_2, 0, sqrt1_2]);
    quaternion2 = GeoMath.createVector4([0, -sqrt1_2, 0, sqrt1_2]);
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(1, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);


    let axis = GeoMath.createVector3([0, 1, 0]);
    let angleA = 0;
    let angleB = 20;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());

    slerp_value = 0.5;

    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(0.08715574274765817, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo( 0.9961946980917455, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    axis = GeoMath.createVector3([0, 0, 1]);
    angleA = 90;
    angleB = 359;

    slerp_value = 0.5;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0.37864861735243294, 5);
    expect(result[3]).toBeCloseTo(0.92554050401756640, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    angleA = 359;
    angleB = 0;

    slerp_value = 0.5;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo( 0, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0.004363309284746584, 5);
    expect(result[3]).toBeCloseTo( -0.9999904807207347, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    axis = GeoMath.createVector3([0, 1, 0]);
    angleA = 90;
    angleB = 359;

    slerp_value = 0.5;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[1]).toBeCloseTo(0.37864861735243294, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(0.92554050401756640, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    angleA = 359;
    angleB = 0;

    slerp_value = 0.5;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo( 0, 5);
    expect(result[1]).toBeCloseTo(0.004363309284746584, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo( -0.9999904807207347, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    axis = GeoMath.createVector3([1, 0, 0]);
    angleA = 90;
    angleB = 359;

    slerp_value = 0.5;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(0.37864861735243294, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(0.9255405040175664, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    angleA = 359;
    angleB = 0;

    slerp_value = 0.5;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo(0.004363309284746584, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(-0.9999904807207347, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    axis = GeoMath.createVector3([1, 0, 0]);
    angleA = 90;
    angleB = 359;

    slerp_value = 0.1;
    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(0.6487842217353611, 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(0.7609724263251868, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    // Edge test
    axis = GeoMath.createVector3([1, 0, 0]);
    angleA = 180;
    angleB = 270;

    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = GeoMath.rotation_quat(axis, angleB, GeoMath.createVector4());

    slerp_value = 0;
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(quaternion1[0], 5);
    expect(result[1]).toBeCloseTo(quaternion1[1], 5);
    expect(result[2]).toBeCloseTo(quaternion1[2], 5);
    expect(result[3]).toBeCloseTo(quaternion1[3], 5);
    expect(isNormalizedQuaternion(result)).toBe(true);

    slerp_value = 1;
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(quaternion2[0], 5);
    expect(result[1]).toBeCloseTo(quaternion2[1], 5);
    expect(result[2]).toBeCloseTo(quaternion2[2], 5);
    expect(result[3]).toBeCloseTo(quaternion2[3], 5);
    expect(isNormalizedQuaternion(result)).toBe(true);


    angleA = 289;
    slerp_value = 0.2;

    quaternion1 = GeoMath.rotation_quat(axis, angleA, GeoMath.createVector4());
    quaternion2 = quaternion1;
    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());

    expect(result[0]).toBeCloseTo(quaternion1[0], 5);
    expect(result[1]).toBeCloseTo(quaternion1[1], 5);
    expect(result[2]).toBeCloseTo(quaternion1[2], 5);
    expect(result[3]).toBeCloseTo(quaternion1[3], 5);
    expect(isNormalizedQuaternion(result)).toBe(true);


    quaternion1 = GeoMath.createVector4([1,0,0,1]);
    quaternion2 = GeoMath.createVector4([0.99999999, 0, 0, 0.99999998]);
    GeoMath.normalize4(quaternion1, quaternion1);
    GeoMath.normalize4(quaternion2, quaternion2);

    result = GeoMath.slerp_quat(quaternion1, quaternion2, slerp_value, GeoMath.createVector4());
    expect(result[0]).toBeCloseTo(0.7071067811865476 , 5);
    expect(result[1]).toBeCloseTo(0, 5);
    expect(result[2]).toBeCloseTo(0, 5);
    expect(result[3]).toBeCloseTo(0.7071067811865476, 5);
    expect(isNormalizedQuaternion(result)).toBe(true);
});


/**
 * 行列の同値判定
 * @param m1              行列1
 * @param m2              行列2
 * @param isRotationOnly  回転行列だけ比較します
 * @return                一致している場合true
 */
function isEqualMatrices( m1, m2, isRotationOnly = false ) {
    const isRotationPartEqual = (
        Math.abs( m1[0]  - m2[0] ) < 1.0e-6 &&
        Math.abs( m1[1]  - m2[1] ) < 1.0e-6 &&
        Math.abs( m1[2]  - m2[2] ) < 1.0e-6 &&
        Math.abs( m1[3]  - m2[3] ) < 1.0e-6 &&
        Math.abs( m1[4]  - m2[4] ) < 1.0e-6 &&
        Math.abs( m1[5]  - m2[5] ) < 1.0e-6 &&
        Math.abs( m1[6]  - m2[6] ) < 1.0e-6 &&
        Math.abs( m1[7]  - m2[7] ) < 1.0e-6 &&
        Math.abs( m1[8]  - m2[8] ) < 1.0e-6 &&
        Math.abs( m1[9]  - m2[9] ) < 1.0e-6 &&
        Math.abs( m1[10] - m2[10] ) < 1.0e-6 &&
        Math.abs( m1[11] - m2[11] ) < 1.0e-6 &&
        Math.abs( m1[15] - m2[15] ) < 1.0e-6
    );

    if ( isRotationOnly ) {
        return isRotationPartEqual;
    }
    else {
        return isRotationPartEqual && (
            Math.abs( m1[12] - m2[12] ) < 1.0e-6 &&
            Math.abs( m1[13] - m2[13] ) < 1.0e-6 &&
            Math.abs( m1[14] - m2[14] ) < 1.0e-6
        );
    }
}


// Data are generated with these functions
const create_random_transform = () => {
    let orientation = new Orientation( random_degree_angle_360, random_minusOne_to_one() * 180, random_minusOne_to_one() * 180 );
    return orientation.getTransformMatrix([1,1,1], GeoMath.createMatrix());
}

const random_minusOne_to_one = () => {
    return Math.random() * 2 - 1;
}

const random_degree_angle_180 = () =>{
    return Math.random() * 180;
}

const random_degree_angle_360 = () =>{
    return Math.random() * 360;
}
