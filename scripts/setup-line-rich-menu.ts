import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { buildLineRichMenu } from "../src/lib/line-rich-menu";

const LINE_API = "https://api.line.me";
const LINE_DATA_API = "https://api-data.line.me";

function bearerHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function lineRequest(url: string, init: RequestInit, step: string) {
  const response = await fetch(url, init);
  if (response.ok) return response;
  const body = await response.text();
  throw new Error(`${step}失敗 (${response.status})${body ? `: ${body}` : ""}`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const imageArgument = process.argv.find((argument) => argument.startsWith("--image="));
  const imagePath = resolve(imageArgument?.slice("--image=".length) || "public/line/rich-menu-taroko.png");
  const menu = buildLineRichMenu(process.env);
  const imageInfo = await stat(imagePath);

  if (imageInfo.size > 1_000_000) throw new Error("Rich Menu PNG 超過 LINE 1 MB 上限");

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", imagePath, imageBytes: imageInfo.size, menu }, null, 2));
    console.log("\n檢查完成；確認設定後加上 --apply 才會建立並設為預設 Rich Menu。");
    return;
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN 未設定");

  await lineRequest(`${LINE_API}/v2/bot/richmenu/validate`, {
    method: "POST",
    headers: { ...bearerHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(menu),
  }, "驗證 Rich Menu");

  const createResponse = await lineRequest(`${LINE_API}/v2/bot/richmenu`, {
    method: "POST",
    headers: { ...bearerHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(menu),
  }, "建立 Rich Menu");
  const { richMenuId } = await createResponse.json() as { richMenuId?: string };
  if (!richMenuId) throw new Error("LINE 未回傳 richMenuId");

  try {
    const image = await readFile(imagePath);
    await lineRequest(`${LINE_DATA_API}/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`, {
      method: "POST",
      headers: { ...bearerHeaders(token), "Content-Type": "image/png" },
      body: image,
    }, "上傳 Rich Menu 圖片");

    await lineRequest(`${LINE_API}/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`, {
      method: "POST",
      headers: bearerHeaders(token),
    }, "設定預設 Rich Menu");
  } catch (error) {
    console.error(`Rich Menu 已建立但尚未完成啟用，richMenuId=${richMenuId}`);
    throw error;
  }

  console.log(`Rich Menu 已建立並設為預設：${richMenuId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
