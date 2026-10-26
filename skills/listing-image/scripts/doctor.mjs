import { readFile } from "node:fs/promises";

function apiUrlOk(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch { return false; }
}

function record(checks, name, ok, detail) { checks.push({ name, ok, detail }); }

export async function runDoctor({ key, baseUrl, version }) {
  const checks = [];
  const major = Number(process.versions.node.split(".")[0]);
  record(checks, "node", major >= 18, `Node.js ${process.versions.node}${major >= 18 ? "" : "；需要 18 或更新版本"}`);
  const keyOk = typeof key === "string" && key.startsWith("lt_");
  record(checks, "api_key", keyOk, keyOk ? "已设置" : key ? "密钥格式错误；应以 lt_ 开头" : "未设置 LISTING_API_KEY");
  const urlOk = apiUrlOk(baseUrl);
  record(checks, "api_url", urlOk, urlOk ? `地址规则通过：${baseUrl}` : "LISTING_API_URL 必须是 https 或 localhost 本机地址");
  let expertsOk = false;
  try {
    const data = JSON.parse(await readFile(new URL("../references/experts.json", import.meta.url), "utf8"));
    expertsOk = Array.isArray(data.expertModes) && data.expertModes.length === 7;
    record(checks, "experts", expertsOk, `专家数据${expertsOk ? "有效，共 7 个" : "不完整，需含 7 个专家"}`);
  } catch {
    record(checks, "experts", false, "experts.json 缺失或无法解析");
  }
  record(checks, "profile", false, "未检查");
  record(checks, "api_key_self", false, "未检查");
  record(checks, "cli_version", true, `listing-image ${version}`);

  let exitCode = 0;
  if (!checks[0].ok || !keyOk || !urlOk || !expertsOk) exitCode = 2;
  else {
    try {
      const [profileResponse, keyResponse] = await Promise.all([
        fetch(`${baseUrl}/api/profile`, { headers: { Authorization: `Bearer ${key}` } }),
        fetch(`${baseUrl}/api/api-keys/self`, { headers: { Authorization: `Bearer ${key}` } }),
      ]);
      const [profileText, keyText] = await Promise.all([profileResponse.text(), keyResponse.text()]);
      let profile;
      let keyInfo;
      try { profile = JSON.parse(profileText); keyInfo = JSON.parse(keyText); } catch { profile = {}; keyInfo = {}; }
      const profileOk = profileResponse.ok;
      const keyInfoOk = keyResponse.ok;
      const prices = {};
      for (const rule of profile.pricingRules || []) {
        const endpoint = rule.api_endpoint || rule.apiEndpoint;
        if (endpoint === "/api/process-images") prices.process = Number(rule.cost);
        if (endpoint === "/api/generate-scene") prices.scene = Number(rule.cost);
        if (endpoint === "/api/edit-image") prices.edit = Number(rule.cost);
      }
      const priceDetail = `余额 ${profile.remaining_calls ?? "null"}；价格 process=${prices.process ?? "null"}, scene=${prices.scene ?? "null"}, edit=${prices.edit ?? "null"}`;
      const remaining = keyInfo.remainingToday ?? "null";
      checks[4] = { name: "profile", ok: profileOk, detail: profileOk ? priceDetail : profileResponse.status === 401 ? "密钥无效、已过期或已吊销" : `HTTP ${profileResponse.status}` };
      checks[5] = { name: "api_key_self", ok: keyInfoOk, detail: keyInfoOk ? `密钥今日剩余额度 ${remaining}` : keyResponse.status === 401 ? "密钥无效、已过期或已吊销" : `HTTP ${keyResponse.status}` };
      if (profileResponse.status === 401 || keyResponse.status === 401) exitCode = 10;
      else if (!profileOk || !keyInfoOk) exitCode = 15;
    } catch {
      checks[4] = { name: "profile", ok: false, detail: "网络请求失败" };
      checks[5] = { name: "api_key_self", ok: false, detail: "网络请求失败" };
      exitCode = 16;
    }
  }
  const report = { ok: checks.every(({ ok }) => ok), checks };
  for (const check of checks) console.error(`${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
  console.log(JSON.stringify(report));
  process.exitCode = exitCode;
}
