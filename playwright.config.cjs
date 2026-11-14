const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './tests/browser', fullyParallel: true, workers: process.env.CI ? 2 : 2,
    timeout: 30000, retries: 0, reporter: 'list',
    use: { baseURL: 'http://127.0.0.1:4173', headless: true, reducedMotion: 'reduce',
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {} },
    webServer: { command: 'node tools/test-server.cjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});
