#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDoctor } from "./doctor.mjs";
import { helpText } from "./help-text.mjs";

const VERSION = "1.0.0";
const key = process.env.LISTING_API_KEY;
const baseUrl = (process.env.LISTING_API_URL || "https://amazon-ctr.com").replace(/\/$/, "");
const mimeExtensions = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
let expertModes;

function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

function validateApiUrl() {
  const error = "为避免密钥明文外泄，LISTING_API_URL 必须使用 https（本机调试可用 http://localhost）";
  let url;
  try { url = new URL(baseUrl); } catch { fail(error); }
  if (url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return;
  fail(error);
}

function redact(value) {
  return key ? String(value).split(key).join("[已隐藏]") : String(value);
}

function parseArgs(argv) {
  const args = { _: [], fields: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) { args._.push(token); continue; }
    const name = token.slice(2);
    if (["yes", "dry-run"].includes(name)) { args[name] = true; continue; }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`缺少 --${name} 的值。`);
    if (name === "field") args.fields.push(value);
    else if (["image", "scene", "expert", "prompt", "mode", "annotated", "original", "out", "idempotency-key", "timeout", "max-credits"].includes(name)) args[name] = value;
    else fail(`未知选项 --${name}。`);
    index += 1;
  }
  return args;
}

function maxCredits(args) {
  const value = args["max-credits"] ?? process.env.LISTING_MAX_CREDITS;
  if (value === undefined || value === "") return null;
  if (!/^\d+$/.test(String(value))) fail("--max-credits 与 LISTING_MAX_CREDITS 必须是正整数。", 2);
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1) fail("--max-credits 与 LISTING_MAX_CREDITS 必须是正整数。", 2);
  return limit;
}

async function api(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, ...options.headers },
    signal: AbortSignal.timeout(Number(options.timeout || 180) * 1000),
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { message: text }; }
  return { response, body };
}

async function account(limit = null) {
  const [profileResult, keyResult] = await Promise.all([api("/api/profile"), api("/api/api-keys/self")]);
  for (const { response, body } of [profileResult, keyResult]) {
    if (!response.ok) fail(redact(body.message || `账户查询失败 (${response.status})`), response.status === 401 ? 10 : 15);
  }
  const profile = profileResult.body;
  const keyInfo = keyResult.body;
  const pricing = {};
  for (const rule of profile.pricingRules || []) {
    const endpoint = rule.api_endpoint || rule.apiEndpoint;
    if (endpoint === "/api/process-images") pricing["process-images"] = Number(rule.cost);
    if (endpoint === "/api/generate-scene") pricing["generate-scene"] = Number(rule.cost);
    if (endpoint === "/api/edit-image") pricing["edit-image"] = Number(rule.cost);
  }
  return {
    balance: profile.remaining_calls,
    pricing,
    key: Object.fromEntries(["dailyCapImages", "usedToday", "remainingToday", "expiresAt"].map((field) => [field, keyInfo[field] ?? null])),
    limits: { maxCredits: limit },
  };
}

async function loadExpertModes() {
  try {
    const data = JSON.parse(await readFile(new URL("../references/experts.json", import.meta.url), "utf8"));
    expertModes = data.expertModes;
  } catch {
    fail("缺少或无法读取 references/experts.json；请重新生成专家参考文件。", 2);
  }
}

function expert(id) {
  const selected = expertModes.find((item) => item.id === id);
  if (!selected) fail(`未知专家 ${id}。合法专家：${expertModes.map((item) => item.id).join(", ")}`);
  return selected;
}

function parseFields(values, selected) {
  const result = [];
  const fields = selected.fields;
  for (const entry of values) {
    const equals = entry.indexOf("=");
    if (equals < 1) fail(`字段格式应为 name=value：${entry}`);
    const inputName = entry.slice(0, equals);
    const value = entry.slice(equals + 1);
    const spec = fields.find((field) => field.name === inputName || field.aliases?.includes(inputName));
    if (!spec) fail(`未知字段 ${inputName}。合法字段：${fields.map((field) => field.name).join(", ") || "（无）"}`);
    if (spec.type === "string[]") {
      result.push([spec.name, value]);
      continue;
    }
    if (result.some(([name]) => name === spec.name)) fail(`字段 ${spec.name} 不可重复；数组字段可重复。`);
    if (spec.type === "boolean" && !["true", "false"].includes(value)) fail(`${spec.name} 必须是 true 或 false。`);
    if (spec.effective === false) console.error(`警告：${spec.name} 当前不会影响生成结果。`);
    result.push([spec.name, value]);
  }
  for (const spec of fields) {
    const count = result.filter(([name]) => name === spec.name).length;
    if (spec.required && !count) fail(`缺少必填字段 ${spec.name}。`);
    if (spec.maxItems && count > spec.maxItems) fail(`${spec.name} 最多 ${spec.maxItems} 项。`);
  }
  return result;
}

async function loadImage(file) {
  if (!file) fail("缺少图片路径。");
  let bytes;
  try { bytes = await readFile(file); } catch { fail(`图片文件不存在或不可读取：${file}`); }
  if (bytes.length > 10 * 1024 * 1024) fail(`图片超过 10MB：${file}`);
  const ext = path.extname(file).toLowerCase();
  const signature = bytes.subarray(0, 12);
  const valid = ext === ".png" && signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || [".jpg", ".jpeg"].includes(ext) && signature[0] === 255 && signature[1] === 216 && signature[2] === 255
    || ext === ".webp" && signature.toString("ascii", 0, 4) === "RIFF" && signature.toString("ascii", 8, 12) === "WEBP";
  if (!valid) fail(`仅支持魔数匹配的 PNG、JPEG、WebP 图片：${file}`);
  return { path: path.resolve(file), bytes, mimeType: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg" };
}

function extension(mimeType) {
  if (!mimeExtensions[mimeType]) fail(`服务端返回不支持的图片类型：${mimeType}`, 15);
  return mimeExtensions[mimeType];
}

async function writeResult(out, name, bytes) {
  await mkdir(out, { recursive: true });
  const stem = name.slice(0, -path.extname(name).length);
  let candidate = path.join(out, name);
  let suffix = 1;
  while (true) {
    try { await writeFile(candidate, bytes, { flag: "wx" }); return path.resolve(candidate); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      candidate = path.join(out, `${stem}-${suffix++}${path.extname(name)}`);
    }
  }
}

function field(form, name, value) { form.append(name, String(value)); }
async function fileField(form, name, file) {
  form.append(name, new Blob([file.bytes], { type: file.mimeType }), path.basename(file.path));
}

async function paidRequest(command, endpoint, form, count, out, sources, args) {
  if (args["idempotency-key"] && !/^[A-Za-z0-9_-]{8,128}$/.test(args["idempotency-key"])) fail("--idempotency-key 必须是 8–128 位字母、数字、下划线或连字符。");
  if (args["dry-run"]) {
    console.log(JSON.stringify({ dryRun: true, endpoint, fields: [...form.keys()], files: sources.map(({ path: file }) => path.basename(file)) }));
    return;
  }
  const details = await account();
  const priceKey = command === "process" ? "process-images" : command === "scene" ? "generate-scene" : "edit-image";
  const cost = details.pricing[priceKey];
  if (!Number.isFinite(cost)) fail(`账户响应中缺少 ${priceKey} 价格，未发送生成请求。`, 15);
  const expected = cost * count;
  const limit = maxCredits(args);
  if (limit !== null && expected > limit) fail(`预计 ${expected} 积分超过本次上限 ${limit}（单价 ${cost} × 张数 ${count}）。`, 4);
  if (!args.yes) {
    console.error(`将调用 ${endpoint}，预计 ${expected} 积分（${count} 张 × ${cost} 积分），当前余额 ${details.balance}。请确认后加 --yes。效果不满意再生成会再次扣费。`);
    process.exit(3);
  }
  const idempotencyKey = args["idempotency-key"] || `lt-${randomUUID()}`;
  const maxWait = Number(args.timeout || 180);
  if (!Number.isFinite(maxWait) || maxWait <= 0) fail("--timeout 必须是正数秒。");
  let result;
  let attempts = 0;
  for (; attempts < 3; attempts += 1) {
    try {
      const controller = AbortSignal.timeout(maxWait * 1000);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Idempotency-Key": idempotencyKey }, body: form, signal: controller,
      });
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { body = { message: text }; }
      result = { response, body };
      if (response.ok || response.status < 500 || attempts === 2) break;
    } catch (error) {
      if (attempts === 2) fail(`网络请求失败：${redact(error.message)}`, 16);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempts + 1)));
  }
  const { response, body } = result;
  const message = redact(body.message || `请求失败 (${response.status})`);
  const codes = { 401: 10, 402: 11, 409: 12, 429: 13, 400: 14 };
  if (!response.ok) {
    if (response.status === 429) console.error(`今日生成次数已达该密钥上限${response.headers.get("retry-after") ? `，请等待 ${response.headers.get("retry-after")} 秒` : ""}。`);
    else if (response.status === 402) console.error("余额不足。");
    else if (response.status === 401) console.error("API 密钥无效、已过期或已吊销，请到网站「头像菜单 → API 密钥」重新创建。");
    else if (response.status === 409) console.error("幂等键已过期或冲突，请取得用户确认后换新键重试。");
    else console.error(message);
    process.exit(codes[response.status] || 15);
  }
  const files = [];
  const failed = [];
  const generated = command === "process" ? body.results || [] : [{ success: true, data: body.generatedImage, mimeType: body.mimeType, fileName: "generated" }];
  for (const [index, item] of generated.entries()) {
    if (!item.success) { failed.push({ fileName: item.fileName, error: redact(item.error || "生成失败") }); continue; }
    const ext = extension(item.mimeType || body.mimeType);
    const originalName = sources[index]?.path ? path.basename(sources[index].path) : null;
    const stem = originalName ? path.basename(originalName, path.extname(originalName)) : `${command}-${new Date().toISOString().replace(/[:.]/g, "-")}-${index + 1}`;
    const name = command === "process" ? `${stem}-white${ext}` : `${stem}${ext}`;
    files.push(await writeResult(args.out, name, Buffer.from(item.data, "base64")));
  }
  const replayed = result.response.headers.get("idempotent-replay") === "true";
  const summary = { ok: failed.length < generated.length, files, failed, idempotencyKey, replayed, requests: attempts + 1 };
  console.log(JSON.stringify(summary));
  if (command === "process" && generated.length > 0 && failed.length === generated.length) process.exit(17);
}

async function main() {
  const [command, ...positional] = process.argv.slice(2);
  if (command === "--version" || command === "version") { console.log(`listing-image ${VERSION}`); return; }
  if (command === "help" || command === "--help" || !command) { console.log(helpText); if (!command) process.exitCode = 2; return; }
  if (command === "doctor") { await runDoctor({ key, baseUrl, version: VERSION }); return; }
  const args = parseArgs(positional);
  const limit = maxCredits(args);
  if (command === "experts") {
    await loadExpertModes();
    const selected = args._[0] ? expert(args._[0]) : null;
    if (selected) console.log(JSON.stringify(selected, null, 2));
    else console.log(`专家字段参考：${fileURLToPath(new URL("../references/experts.md", import.meta.url))}\n${JSON.stringify(expertModes.map(({ id, nameZh, whenToUse }) => ({ id, nameZh, whenToUse })), null, 2)}`);
    return;
  }
  if (!["account", "process", "scene", "edit"].includes(command)) fail(helpText, 2);
  if (!key) fail("请先设置 LISTING_API_KEY（不要把密钥贴进对话）。", 2);
  validateApiUrl();
  if (command === "account") { console.log(JSON.stringify(await account(limit))); return; }
  if (command === "scene") await loadExpertModes();
  const out = args.out;
  if (!out) fail("缺少 --out 输出目录。");
  if (command === "process") {
    if (args._.length < 1 || args._.length > 10) fail("process 需要 1–10 张图片。");
    const files = await Promise.all(args._.map((file) => loadImage(file)));
    const form = new FormData();
    for (const file of files) await fileField(form, "images", file);
    await paidRequest(command, "/api/process-images", form, files.length, out, files, args);
    return;
  }
  let form = new FormData();
  let sources;
  let endpoint;
  if (command === "scene") {
    const mode = args.mode || "text";
    if (!["text", "image"].includes(mode)) fail("--mode 只能是 text 或 image。");
    const product = await loadImage(args.image);
    sources = [product];
    field(form, "mode", mode);
    await fileField(form, "productImage", product);
    if (mode === "image") {
      const scene = await loadImage(args.scene);
      sources.push(scene);
      await fileField(form, "sceneImage", scene);
    }
    const selected = expert(args.expert || "none");
    const customFields = parseFields(args.fields, selected);
    field(form, "visualExpertMode", selected.id);
    if (args.prompt !== undefined) field(form, "promptText", args.prompt);
    for (const [name, value] of customFields) field(form, name, value);
    endpoint = "/api/generate-scene";
  } else {
    const annotated = await loadImage(args.annotated);
    if (!args.prompt) fail("edit 必须提供 --prompt。");
    sources = [annotated];
    await fileField(form, "annotatedImage", annotated);
    if (args.original) { const original = await loadImage(args.original); await fileField(form, "originalImage", original); }
    field(form, "promptText", args.prompt);
    endpoint = "/api/edit-image";
  }
  await paidRequest(command, endpoint, form, 1, out, sources, args);
}

main().catch((error) => fail(redact(error?.message || error), 16));
