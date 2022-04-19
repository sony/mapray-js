# Tests


## Setting up Tests

Some tests require environment variables.


### CloudAPI Tests

| variable                | note                                                                   |
|-------------------------|------------------------------------------------------------------------|
| MAPRAY_API_BASE_PATH    | API base path. e.g. https://cloud.mapray.com                           |
| MAPRAY_API_USER_ID      | User ID Use for version1 tests.                                        |
| MAPRAY_API_KEY          | API Key. Use for ApiKey authentication tests.                          |
| MAPRAY_API_ACCESS_TOKEN | Access Token. Use for AccessToken authentication (API version2) tests. |

Sample commands which defines environment variables.
```
export MAPRAY_API_BASE_PATH=https://cloud.mapray.com
export MAPRAY_API_USER_ID=12345678
export MAPRAY_API_KEY=AABBCCDEEFF
export MAPRAY_API_ACCESS_TOKEN=aabbccddeeff
```

Tests which requires authentication will be skipped if these values are missing.

Access token should have below token scope:

| Data Type  | token scope                   |
|------------|-------------------------------|
| 2D         | Read / Create / Update Delete |
| 3D         | Read / Create / Update Delete |
| PointCloud | Read                          |


### PointCloud
PointCloud Dataset should be registered to test PointCloud functions.
Test will be skipped if no PointCloud Dataset is registered.



## Running Tests
 To run all tests:
- move root directory and run yarn command.
```
cd mapray-js
yarn test
```
 To run individual tests:
- move each package directory and run jest.
```
cd mapray-js/packages/mapray
./node_modules/.bin/jest ./tests/orderdmap_tests.jp
```
