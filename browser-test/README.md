# Tests

Browser test is an integration test by the browser.


## Setting up

Environment variables needed to be set to run the test.

| variable                | note                                                                   |
|-------------------------|------------------------------------------------------------------------|
| MAPRAY_API_KEY          | API Key. Use for ApiKey authentication tests.                          |

Sample commands which defines environment variables.

```shell
export MAPRAY_API_KEY=AABBCCDEEFF
```

Execute below command.

```shell
yarn setup
```

The command execute following commands.

- `setup-browser`
  - `pw-install`: install playwright
  - `pw-install-deps`: install dependencies of playwright
  - `pw-install-images`: download golden image from the server
- `setup-test-app`: install & build test apps
  - "yarn --cwd apps install && yarn --cwd apps build",



# Running all Tests

```shell
yarn test
```


## Known issue: browser tests fail due to graphics environment

Screenshot comparison fail due to differences in the environment.
You can create a golden images for your environment to avoid the issue.

To create golden images by executing the command.

```shell
yarn make-image
```

Please compare the screenshots before and after your changes.
