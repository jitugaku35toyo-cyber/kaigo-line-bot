import crypto from "crypto";

const LINE_SECRET = process.env.LINE_SECRET;
const LINE_TOKEN = process.env.LINE_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

function verify(body, sig) {
  const hmac = crypto.createHmac("sha256", LINE_SECRET);
  hmac.update(body);
  return "sha256=" + hmac.digest("base64") === sig;
}

async function analyze(name) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: `あなたは福祉用具の営業支援AIです。居宅介護支援事業所名から営業分析をしてください。以下の形式で日本語で返答してください。

【事業所推定】
法人格・母体：（推定）
規模感：（推定）

【営業分析】
ケアマネタイプ：
意思決定構造：
訪問タイミング：

【訴求ポイント】
→ 
→ 
→ 

【注意点】
・

【初回トーク例】
（2〜3文で）`,
      messages: [{ role: "user", content: `事業所名：${name}\nこの居宅介護支援事業所への営業分析をしてください。` }],
    }),
  });
  const data = await res.json();
  return data.content[0].text;
}

async function reply(token, text) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken: token,
      messages: [{ type: "text", text }],
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const sig = req.headers["x-line-signature"];
  const raw = JSON.stringify(req.body);
  if (!verify(raw, sig)) return res.status(401).send("NG");

  const events = req.body.events || [];
  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;
    const name = event.message.text.trim();
    const result = await analyze(name);
    await reply(event.replyToken, result);
  }

  res.status(200).send("OK");
}
