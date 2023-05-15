import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    use: {
        headless: true,
        // headless: false,
        viewport: { width: 1024, height: 768 },
        ignoreHTTPSErrors: true,
        video: 'on-first-retry',
        testIdAttribute: 'data-pw-test',
    },
    webServer: {
        command: 'yarn server',
        port: 7070,
    },
    testDir: './tests',
    timeout: 3600000,
    outputDir: './results',
    snapshotDir: './golden-images',
    reporter: [
      ['html', { outputFolder: './report' }],
      ['json', { outputFile: './report/report.json' }],
      ['list']
      // ['line']
    ],
    expect: {
        timeout: 3600000,
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1024, height: 768 },
            },
        },

        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1024, height: 768 },
            },
        },

        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                viewport: { width: 1024, height: 768 },
            },
        },
    ],

});
