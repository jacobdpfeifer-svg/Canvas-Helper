/**
 * WebAssign Graphing Tool — draw line / segment / ray via canvas clicks.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mathToPixel(box, x, y) {
  return {
    px: box.x + (x + 10) * (box.width / 20),
    py: box.y + (10 - y) * (box.height / 20),
  };
}

/**
 * @param {import('playwright').Page} wa
 * @param {{ submitId: string, number: number }} question
 * @param {{ type?: 'line'|'segment'|'ray', points: [number,number][], tool?: string }} spec
 */
export async function drawGraph(wa, question, spec) {
  if (!spec?.points?.length) return 0;

  const scope = wa
    .locator(`#${question.submitId}`)
    .locator("xpath=ancestor::div[contains(@class,'waQBox')]");
  if ((await scope.count()) === 0) return 0;
  await scope.scrollIntoViewIfNeeded();
  await sleep(600);

  const tool = spec.tool || spec.type || "line";
  await scope.evaluate(
    ({ submitId, toolId }) => {
      const el = document
        .getElementById(submitId)
        ?.closest(".waQBox")
        ?.querySelector(`[id*="${toolId}"]`);
      if (!el) return;
      el.checked = true;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    {
      submitId: question.submitId,
      toolId:
        tool === "segment"
          ? "toolbar-segment"
          : tool === "ray"
            ? "toolbar-ray"
            : "toolbar-line",
    }
  );
  await sleep(400);

  const canvas = scope.locator("canvas").first();
  if ((await canvas.count()) === 0) return 0;
  const box = await canvas.boundingBox();
  if (!box) return 0;

  for (const [x, y] of spec.points) {
    const { px, py } = mathToPixel(box, x, y);
    await wa.mouse.click(px, py);
    await sleep(350);
  }
  await sleep(500);
  return spec.points.length;
}
