import triangulator_tests from "./triangulator_tests";
import convexpolygon_tests from "./convexpolygon_tests";
import orderedmap_tests from "./orderedmap_tests";
import animation_tests from "./animation_tests";


function
mapray_tests()
{
    console.log( "mapray tests" );

    triangulator_tests();
    convexpolygon_tests();
    orderedmap_tests();
    animation_tests();
}


window.mapray_tests = mapray_tests;
