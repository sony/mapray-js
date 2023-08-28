module.exports = {
  "testRegex": "/tests/.*_tests\\.js$",
  "testEnvironment": "jsdom",
  "testEnvironmentOptions": {
  },
  "reporters": [
    "default",
    ["jest-html-reporter", {
      "includeConsoleLog": true,
      "includeFailureMsg": true,
      "outputPath": "./tests/report.html"
    }],
    // "jest-stare",
  ],
};

