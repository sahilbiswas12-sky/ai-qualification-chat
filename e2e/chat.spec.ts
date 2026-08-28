import { expect, test } from "@playwright/test";

test("user submits a project and receives a streamed AI response", async ({
  page,
}) => {
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const body = [
      'data: {"type":"start","messageId":"mock-assistant-message"}',
      'data: {"type":"start-step"}',
      'data: {"type":"text-start","id":"mock-text-part"}',
      'data: {"type":"text-delta","id":"mock-text-part","delta":"Your smart task manager is ready for qualification."}',
      'data: {"type":"text-end","id":"mock-text-part"}',
      'data: {"type":"finish-step"}',
      'data: {"type":"finish"}',
      "data: [DONE]",
      "",
    ].join("\n\n");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "x-vercel-ai-ui-message-stream": "v1",
        "cache-control": "no-cache",
      },
      body,
    });
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const chat = page.getByRole("region", {
    name: "AI qualification chat",
  });

  await expect(chat).toBeVisible();

  const messageBox = chat.getByRole("textbox", {
    name: "Your message",
  });

  const sendButton = chat.getByRole("button", {
    name: /^send$/i,
  });

  const message =
    "Assess my smart task manager for development readiness.";

  await messageBox.click();
  await messageBox.pressSequentially(message);

  // This confirms React processed the input event and hydration is complete.
  await expect(sendButton).toBeEnabled();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/chat") &&
      response.request().method() === "POST",
  );

  await sendButton.click();
  await responsePromise;

  // Scope this assertion to the user-message article.
  await expect(
    page
      .locator('article[data-role="user"]')
      .getByText(message),
  ).toBeVisible();

  await expect(
    page.getByText(
      "Your smart task manager is ready for qualification.",
    ),
  ).toBeVisible({
    timeout: 10_000,
  });
});