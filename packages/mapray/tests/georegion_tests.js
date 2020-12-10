import GeoMath from "../src/GeoMath";
import GeoRegion from "../src/GeoRegion";
import GeoPoint from "../src/GeoPoint";

test('empty', () => {
    const region = new GeoRegion();
    expect(region.empty()).toEqual(true)
});

test('10 to 120', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(10, 50, 0);
    const p2 = new GeoPoint(120, 50, 0);
    const answer_min = new GeoPoint(10, 50, 0);
    const answer_max = new GeoPoint(120, 50, 0);
    const answer_center = new GeoPoint(65, 50, 0);
    region.addPoints(p1, p2);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('90 to 270', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(90, 50, 0);
    const p2 = new GeoPoint(270, 50, 0);
    const answer_min = new GeoPoint(90, 50, 0);
    const answer_max = new GeoPoint(270, 50, 0);
    const answer_center = new GeoPoint(180, 50, 0);
    region.addPoints(p1, p2);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('-90 to 90', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(-90, 50, 0);
    const p2 = new GeoPoint(90, 50, 0);
    const answer_min = new GeoPoint(-90, 50, 0);
    const answer_max = new GeoPoint(90, 50, 0);
    const answer_center = new GeoPoint(0, 50, 0);
    region.addPoints(p1, p2);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('-90 to 90 (2)', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(90, 50, 0);
    const p2 = new GeoPoint(-90, 50, 0);
    const answer_min = new GeoPoint(90, 50, 0);
    const answer_max = new GeoPoint(270, 50, 0);
    const answer_center = new GeoPoint(180, 50, 0);
    region.addPoints(p1, p2);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('10 to -10', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(10, 0, 0);
    const p2 = new GeoPoint(-10, 0, 0);
    const answer_min = new GeoPoint(-10, 0, 0);
    const answer_max = new GeoPoint(10, 0, 0);
    const answer_center = new GeoPoint(0, 0, 0);
    region.addPoint(p1);
    region.addPoint(p2);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('10 to -10 (length)', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(10, 0, 0);
    const p2 = new GeoPoint(-10, 0, 0);
    const answer_lon = GeoMath.EARTH_RADIUS * 2 *  Math.PI / 360 * 20;
    const answer_lat = 0;
    region.addPoints(p1, p2);
    expect(region.getLongitudeDistance()).toEqual(answer_lon)
    expect(region.getLatitudeDistance()).toEqual(answer_lat)
});


test('-20 to -10', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(-20, 0, 0);
    const p2 = new GeoPoint(-10, 0, 0);
    const p3 = new GeoPoint(-15, 0, 0);
    const answer_min = new GeoPoint(-20, 0, 0);
    const answer_max = new GeoPoint(-10, 0, 0);
    region.addPoints(p1);
    region.addPoints(p2);
    region.addPoints(p3);
    // region.addPoints(p1, p2, p3);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('-20 to -10 multi', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(-20, 0, 0);
    const p2 = new GeoPoint(-10, 0, 0);
    const p3 = new GeoPoint(-15, 0, 0);
    const answer_min = new GeoPoint(-20, 0, 0);
    const answer_max = new GeoPoint(-10, 0, 0);
    region.addPoints(p1, p2, p3);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('-20 to -10 (Array)', () => {
    const region = new GeoRegion();
    const points = [-20, 0, 0, -10, 0, 0, -15, 0, 0];
    const answer_min = new GeoPoint(-20, 0, 0);
    const answer_max = new GeoPoint(-10, 0, 0);
    region.addPointsAsArray(points);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('100 to 101 (Array2)', () => {
    const region = new GeoRegion();
    const points = [100, 0, 0, 101, 0, 0, 101, 1, 0, 100, 1, 0];
    const answer_min = new GeoPoint(100, 0, 0);
    const answer_max = new GeoPoint(101, 1, 0);
    region.addPointsAsArray(points);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('100 to 101 (Points)', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(100, 0, 0);
    const p2 = new GeoPoint(101, 1, 0);
    const p3 = new GeoPoint(101, 1, 0);
    const p4 = new GeoPoint(100, 0, 0);
    const answer_min = new GeoPoint(100, 0, 0);
    const answer_max = new GeoPoint(101, 1, 0);
    region.addPoints(p1, p2, p3, p4);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('170 to -170', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(170, 0, 0);
    const p2 = new GeoPoint(-170, 0, 0);
    const answer_min = new GeoPoint(170, 0, 0);
    const answer_max = new GeoPoint(190, 0, 0);
    region.addPoint(p1);
    region.addPoint(p2);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('70-100 to 170', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(70, 0, 0);
    const p2 = new GeoPoint(100, 0, 0);
    const p3 = new GeoPoint(170, 0, 0);
    const answer_min = new GeoPoint(70, 0, 0);
    const answer_max = new GeoPoint(170, 0, 0);
    region.addPoints(p1,p2);
    region.addPoint(p3);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('70-170 same', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(70, 0, 0);
    const p2 = new GeoPoint(170, 0, 0);
    region.addPoint(p1);
    region.addPoint(p2);
    region2.addPoints(p1,p2);
    expect(region.getSouthWest()).toEqual(region2.getSouthWest())
    expect(region.getNorthEast()).toEqual(region2.getNorthEast())
});


test('70-170 to -10', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(70, 0, 0);
    const p2 = new GeoPoint(170, 0, 0);
    const p3 = new GeoPoint(-10, 0, 0);
    const answer_min = new GeoPoint(-10, 0, 0);
    const answer_max = new GeoPoint(170, 0, 0);
    region.addPoint(p1);
    region.addPoint(p2);
    region.addPoint(p3);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('70-170 to -170', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(70, 0, 0);
    const p2 = new GeoPoint(180, 0, 0);
    const p3 = new GeoPoint(-170, 0, 0);
    const answer_min = new GeoPoint(70, 0, 0);
    const answer_max = new GeoPoint(190, 0, 0);
    region.addPoints(p1,p2);
    region.addPoint(p3);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('-170--160 to 170', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(-170, 0, 0);
    const p2 = new GeoPoint(-160, 0, 0);
    const p3 = new GeoPoint(170, 0, 0);
    const answer_min = new GeoPoint(-190, 0, 0);
    const answer_max = new GeoPoint(-160, 0, 0);
    region.addPoints(p1,p2);
    region.addPoint(p3);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});

test('160-170 to -170', () => {
    const region = new GeoRegion();
    const p1 = new GeoPoint(160, 0, 0);
    const p2 = new GeoPoint(170, 0, 0);
    const p3 = new GeoPoint(-170, 0, 0);
    const answer_min = new GeoPoint(160, 0, 0);
    const answer_max = new GeoPoint(190, 0, 0);
    region.addPoints(p1,p2);
    region.addPoint(p3);
    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('merge (include)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 150, 100);
    const p2 = new GeoPoint(60, 150, 100);
    const p3 = new GeoPoint(10, 50, 0);
    const p4 = new GeoPoint(60, 50, 0);
    const answer_min = new GeoPoint(-60, 50, 0);
    const answer_max = new GeoPoint(60, 150, 100);
    const answer_center = new GeoPoint(0, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (include2)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 150, 100);
    const p2 = new GeoPoint(60, 150, 100);
    const p3 = new GeoPoint(300, 50, 0);
    const p4 = new GeoPoint(420, 50, 0);
    const answer_min = new GeoPoint(-60, 50, 0);
    const answer_max = new GeoPoint(60, 150, 100);
    const answer_center = new GeoPoint(0, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (include west)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 150, 100);
    const p2 = new GeoPoint(60, 150, 100);
    const p3 = new GeoPoint(50, 50, 0);
    const p4 = new GeoPoint(100, 50, 0);
    const answer_min = new GeoPoint(-60, 50, 0);
    const answer_max = new GeoPoint(100, 150, 100);
    const answer_center = new GeoPoint(20, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (include west2)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 150, 100);
    const p2 = new GeoPoint(60, 150, 100);
    const p3 = new GeoPoint(50, 50, 0);
    const p4 = new GeoPoint(190, 50, 0);
    const answer_min = new GeoPoint(-60, 50, 0);
    const answer_max = new GeoPoint(190, 150, 100);
    const answer_center = new GeoPoint(65, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (include east)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 150, 100);
    const p2 = new GeoPoint(60, 150, 100);
    const p3 = new GeoPoint(-100, 50, 0);
    const p4 = new GeoPoint(50, 50, 0);
    const answer_min = new GeoPoint(-100, 50, 0);
    const answer_max = new GeoPoint(60, 150, 100);
    const answer_center = new GeoPoint(-20, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (include east2)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 150, 100);
    const p2 = new GeoPoint(60, 150, 100);
    const p3 = new GeoPoint(-50, 50, 0);
    const p4 = new GeoPoint(-190, 50, 0);
    const answer_min = new GeoPoint(-190, 50, 0);
    const answer_max = new GeoPoint(60, 150, 100);
    const answer_center = new GeoPoint(-65, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (external1)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-90, 50, 0);
    const p2 = new GeoPoint(90, 50, 0);
    const p3 = new GeoPoint(100, 150, 100);
    const p4 = new GeoPoint(-150, 150, 100);
    const answer_min = new GeoPoint(100, 150, 100);
    const answer_max = new GeoPoint(210, 150, 100);
    const answer_min2 = new GeoPoint(-90, 50, 0);
    const answer_max2 = new GeoPoint(210, 150, 100);
    const answer_center = new GeoPoint(60, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region2.getSouthWest()).toEqual(answer_min)
    expect(region2.getNorthEast()).toEqual(answer_max)
    expect(region.getSouthWest()).toEqual(answer_min2)
    expect(region.getNorthEast()).toEqual(answer_max2)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (external2)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(160, 50, 0);
    const p2 = new GeoPoint(170, 50, 0);
    const p3 = new GeoPoint(-170, 150, 100);
    const p4 = new GeoPoint(-160, 150, 100);
    const answer_min = new GeoPoint(160, 50, 0);
    const answer_max = new GeoPoint(200, 150, 100);
    const answer_center = new GeoPoint(180, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (external3)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-170, 150, 100);
    const p2 = new GeoPoint(-160, 150, 100);
    const p3 = new GeoPoint(160, 50, 0);
    const p4 = new GeoPoint(170, 50, 0);
    const answer_min = new GeoPoint(-200, 50, 0);
    const answer_max = new GeoPoint(-160, 150, 100);
    const answer_center = new GeoPoint(-180, 100, 50);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (exclude)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 50, 0);
    const p2 = new GeoPoint(40, 50, 0);
    const p3 = new GeoPoint(-100, 50, 0);
    const p4 = new GeoPoint(50, 50, 0);
    const answer_min = new GeoPoint(-100, 50, 0);
    const answer_max = new GeoPoint(50, 50, 0);
    const answer_center = new GeoPoint(-25, 50, 0);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (exclude2)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-60, 50, 0);
    const p2 = new GeoPoint(40, 50, 0);
    const p3 = new GeoPoint(260, 50, 0);
    const p4 = new GeoPoint(410, 50, 0);
    const answer_min = new GeoPoint(-100, 50, 0);
    const answer_max = new GeoPoint(50, 50, 0);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('merge (exclude3)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(300, 50, 0);
    const p2 = new GeoPoint(400, 50, 0);
    const p3 = new GeoPoint(-100, 50, 0);
    const p4 = new GeoPoint(50, 50, 0);
    const answer_min = new GeoPoint(-100, 50, 0);
    const answer_max = new GeoPoint(50, 50, 0);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
});


test('merge (exclude4)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-170, 50, 0);
    const p2 = new GeoPoint(170, 50, 0);
    const p3 = new GeoPoint(-160, 50, 0);
    const p4 = new GeoPoint(160, 50, 0);
    const answer_min = new GeoPoint(-200, 50, 0);
    const answer_max = new GeoPoint(-160, 50, 0);
    const answer_center = new GeoPoint(-180, 50, 0);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (exclude5)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-170, 50, 0);
    const p2 = new GeoPoint(-160, 50, 0);
    const p3 = new GeoPoint(-180, 50, 0);
    const p4 = new GeoPoint(-150, 50, 0);
    const answer_min = new GeoPoint(-180, 50, 0);
    const answer_max = new GeoPoint(-150, 50, 0);
    const answer_center = new GeoPoint(-165, 50, 0);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (exclude6)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-170, 50, 0);
    const p2 = new GeoPoint(-160, 50, 0);
    const p3 = new GeoPoint(-180-360, 50, 0);
    const p4 = new GeoPoint(-150-360, 50, 0);
    const answer_min = new GeoPoint(-180, 50, 0);
    const answer_max = new GeoPoint(-150, 50, 0);
    const answer_center = new GeoPoint(-165, 50, 0);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});


test('merge (exclude7)', () => {
    const region = new GeoRegion();
    const region2 = new GeoRegion();
    const p1 = new GeoPoint(-170-360, 50, 0);
    const p2 = new GeoPoint(-160-360, 50, 0);
    const p3 = new GeoPoint(-180, 50, 0);
    const p4 = new GeoPoint(-150, 50, 0);
    const answer_min = new GeoPoint(-180, 50, 0);
    const answer_max = new GeoPoint(-150, 50, 0);
    const answer_center = new GeoPoint(-165, 50, 0);
    region.addPoints(p1, p2);
    region2.addPoints(p3, p4);
    region.merge(region2);

    expect(region.getSouthWest()).toEqual(answer_min)
    expect(region.getNorthEast()).toEqual(answer_max)
    expect(region.getCenter()).toEqual(answer_center)
});
