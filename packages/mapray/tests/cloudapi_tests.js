import { fetch, Request, Headers, Response } from "whatwg-fetch";

global.fetch = fetch;
global.Request = Request;
global.Headers = Headers;
global.Response = Response;

import CloudApi from "../dist/es/cloud/CloudApi";
import CloudApiV1 from "../dist/es/cloud/CloudApiV1";
import CloudApiV2 from "../dist/es/cloud/CloudApiV2";



// 連続作業用
let target_id = 0;
let feature_id = 0;

// テスト用環境変数の確認
const basePath = process.env.MAPRAY_API_BASE_PATH || "https://cloud.mapray.com";

if ( !process.env.MAPRAY_API_USER_ID ) {
    throw new Error("MAPRAY_API_USER_ID is undefined.");
}

if ( !process.env.MAPRAY_API_KEY ) {
    throw new Error("MAPRAY_API_KEY is undefined.");
}


// CloudApi

// テストに使用するapiリスト
let api_list = [
    // for v1
    new CloudApiV1({
            basePath: basePath,
            userId: process.env.MAPRAY_API_USER_ID,
            token: process.env.MAPRAY_API_KEY,
    }),
    // for v2 api key
    new CloudApiV2({
            basePath: basePath,
            token: process.env.MAPRAY_API_KEY,
            tokenType: CloudApi.TokenType.API_KEY,
    }),
];

// MAPRAY_API_ACCESS_TOKEN がなければ V2 アクセストークンのテストは skip
if ( process.env.MAPRAY_API_ACCESS_TOKEN ) {
    // for v2 access token
    api_list.push(new CloudApiV2({
          basePath: basePath,
          token: process.env.MAPRAY_API_ACCESS_TOKEN,
          tokenType: CloudApi.TokenType.ACCESS_TOKEN,
    }));
}
else {
  console.log( "Access Token Test will be skipped" );
}

// 2D一覧の取得
describe.each( api_list ) ( '2D list', ( api )=> {
    test( 'loadDatasets', async () => {
        expect( await api.loadDatasets() ).toEqual( expect.anything() );
    });
});

// 3D一覧の取得
describe.each( api_list ) ( '3D list', ( api )=> {
    test( 'load3DDatasets V1', async () => {
        expect( await api.load3DDatasets() ).toEqual( expect.anything() );
    });
});

// Pointcloud一覧の取得
describe.each( api_list ) ( 'PointCloud list', ( api )=> {
    test( 'loadPointCloudDatasets V1', async () => {
        expect( await api.loadPointCloudDatasets() ).toEqual( expect.anything() );
    });
});


// 2D All
describe.each( api_list )( '2D Sequence Test', ( api )=> {
    // console.log( 'api: ', api._option.version );

    test( '2D Test createDataset', async () => {
        // create
        const result = await api.createDataset('test name v1','test desc v1');
        expect( result ).toEqual( expect.anything() );
        target_id = result.id;
        // check
        const datasets_list = await api.loadDatasets( 1, 100 );
        expect( datasets_list.findIndex( el => el._id == result.id ) ).toBeGreaterThan( -1 );
    });

    test( '2D Test count', async () => {
        // countDatasets
        const result = await api.countDatasets();
        expect( result.count ).toBeGreaterThan( 0 );
    });

    test( '2D Test insertFeature', async () => {
        // feature
        const data = {
            type: "Feature",
            geometry: {
                type: "MultiPoint",
                coordinates: [
                    [138.7309, 35.3628],
                    [138.8079, 35.1983],
                    [139.0248, 35.2248]
                ]
            },
            properties: {},
            id: "1",
        };
        // insertFeature
        const result = await api.insertFeature( target_id, data );
    });

    test( '2D Test loadDataset', async () => {
        // loadDataset( getDataset )
        const dataset = await api.loadDataset( target_id );
        // check
        expect( dataset._name ).toBe( 'test name v1' ) ;
    });

    test( '2D Test getDatasetAsResource', async () => {
        // getDatasetAsResource
        const resource = await api.getDatasetAsResource( target_id );
        // check
        expect( resource._datasetId ).toBe( target_id ) ;
    });

    test( '2D Test getFeatures', async () => {
        // getFeatures
        const result_features = await api.getFeatures( target_id );
        expect( result_features.features[0].geometry.coordinates[0][0] ).toBe( 138.7309 );
        expect( result_features.features[0].geometry.coordinates[0][1] ).toBe( 35.3628 );
    });
    
    test( '2D Test updateFeature', async () => {
        //get feature id
        const datasets = await api.getDatasets();
        const dataset = datasets.find( el => el.id == target_id );
        feature_id = dataset.features[0];
        // feature
        const data = {
            type: "Feature",
            geometry: {
                type: "MultiPoint",
                coordinates: [

                    [0.7309, 0.3628],
                    [138.8079, 35.1983],
                    [139.0248, 35.2248]
                ]
            },
            properties: {},
            id: "1",
        };
        // updateFeature
        const result = await api.updateFeature( feature_id, data );
        // check
        const result_features = await api.getFeatures( target_id );
        expect( result_features.features[0].geometry.coordinates[0][0] ).toBe( 0.7309 );
        expect( result_features.features[0].geometry.coordinates[0][1] ).toBe( 0.3628 );
    });

    test( '2D Test deleteFeature', async () => {
        // deleteFeature
        const result = await api.deleteFeature( feature_id );
        // check
        const result_features = await api.getFeatures( target_id );
        expect( result_features.features.length ).toBe( 0 );
    });

    test( '2D Test deleteDataset', async () => {
        // deleteDataset
        await api.deleteDataset( target_id );
        // check deleted
        const datasets_list = await api.loadDatasets( 1, 100 );
        expect( datasets_list.findIndex( el => el._id == target_id ) ).toBe(-1);
    });
    
});


// 3D All
describe.each( api_list ) ( '3D Sequence Test', ( api )=> {
    // console.log( 'api: ', api._option.version );

    // 3D V1
    test( '3D Test create3DDataset', async () => {
        // create3DDataset
        const result = await api.create3DDataset( 'test3d name v1','test3d desc v1', { 
            path: '/test.gltf',
            srid: 4326,
            x: 1,
            y: 2,
            z: 3,
            src_file_type: 'glTF',
            dst_file_type: 'glTF',
            extensions: {"shadeless": true}
        });
        expect( result ).toEqual( expect.anything() );
        target_id = result.id;
        // check
        const datasets_list = await api.load3DDatasets( 1, 100 );
        expect( datasets_list.findIndex( el => el._id == result.id ) ).toBeGreaterThan(-1);
    });

    test( '3D Test count', async () => {
        // count3DDatasets
        const result = await api.count3DDatasets();
        expect( result.count ).toBeGreaterThan( 0 );
    });

    test( '3D Test create3DDatasetUploadUrl', async () => {
        const fileInfo = [];
        const filename = 'test.gltf';
        const obj = { filename: filename, content_type:"model/gltf+json" };
        fileInfo[0] = obj;
        // create3DDatasetUploadUrl
        const uploadurl = await api.create3DDatasetUploadUrl( target_id, fileInfo );
        // check
        expect( uploadurl[0].filename ).toBe( filename );
    });

    test( '3D Test load3DDataset', async () => {
        // load3DDataset( get3DDataset )
        const dataset = await api.load3DDataset( target_id );
        // check
        expect( dataset._id ).toBe( target_id );
    });

    test( '3D Test get3DDatasetAsResource', async () => {
        // get3DDatasetAsResource
        const resource = await api.get3DDatasetAsResource( target_id );
        // check
        expect( resource._datasetIds[0] ).toBe( target_id ) ;
    });

    test( '3D Test get3DDatasetScene', async () => {
        // get3DDatasetScene
        const scene = await api.get3DDatasetScene( target_id );
        // check
        expect( scene.entity_list[0].ref_model ).toBe( target_id );
    });

    test( '3D Test update3DDataset', async () => {
        // update3DDataset
        const dataset = await api.update3DDataset( target_id, 'test3d update', 'test3d desc update', { 
            path: '/test.gltf',
            srid: 4326,
            x: 10,
            y: 20,
            z: 30,
            src_file_type: 'glTF',
            dst_file_type: 'glTF',
            extensions: {"shadeless": true}
        });
        // check
        expect( dataset.name ).toBe( 'test3d update' );
        expect( dataset.x ).toBe( 10 );
    });

    test( '3D Test get3DDataset', async () => {
        // load3DDataset( get3DDataset )
        const dataset = await api.get3DDataset( target_id );
        // check
        expect( dataset.name ).toBe( 'test3d update' );
    });

    test( '3D Test delete3DDataset', async () => {
        // delete3DDataset
        const dataset = await api.delete3DDataset( target_id );
        // check deleted
        const datasets_list = await api.load3DDatasets( 1, 100 );
        expect( datasets_list.findIndex( el => el._id == target_id ) ).toBe(-1);
    });
});


// PointCloud All
describe.each( api_list ) ( 'PointCloud Sequence Test', ( api )=> {
    // console.log( 'api: ', api._option.version );

    // PointCloud V1
    test( 'PointCloud Test loadPointCloudDatasets', async () => {
        // loadPointCloudDatasets( getPointCloudDatasets )
        const datasets_list = await api.getPointCloudDatasets( 1, 100 );

        target_id = -1;
        if ( datasets_list.length > 0 ) {
            target_id = datasets_list[0].id;
        }
    });

    test( 'PointCloud Test count', async () => {
        // countPointCloudDatasets
        const result = await api.countPointCloudDatasets();
        // check
        expect( result.count ).toBeGreaterThan( 0 );
    });

    test( 'PointCloud Test loadPointCloudDataset', async () => {
        if ( target_id === -1 ) return;
        // loadPointCloudDataset(getPointCloudDataset)
        const dataset = await api.getPointCloudDataset( target_id );
        // check
        expect( dataset.id ).toBe( target_id );
    });

    test( 'PointCloud Test getPointCloudDatasetAsResource', async () => {
        if ( target_id === -1 ) return;
        // getPointCloudDatasetAsResource
        const resource = await api.getPointCloudDatasetAsResource( target_id );
        // check
        expect( resource._datasetId ).toBe( target_id ) ;
    });

});

