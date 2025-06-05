// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Smoke Test for Demo Dashboard', () => {
  test('should display the main title on the demo dashboard', async ({ page }) => {
    // Navigate to the demo dashboard page
    // This assumes the server is running on http://localhost:3000
    await page.goto('/table_demo_dashboard.html');

    // Check if the main title "Demo Dashboard" is present
    // Adjust the selector and text if the actual title is different.
    const titleLocator = page.locator('h1'); // Assuming the title is an <h1> element
    await expect(titleLocator).toContainText('Demo Dashboard');

    // Example of checking for another element, e.g., a button or a specific section
    // const someButton = page.locator('#myButtonId'); // Example selector
    // await expect(someButton).toBeVisible();

    // Add a small delay to see the page if running with --headed (optional)
    // await page.waitForTimeout(1000);
  });
});
