export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const events = req.body.events || [];
  
  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") continue;
    const name = event.message.text.trim();
    
    try {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: `あなたは福祉用具の営業支援AIです。居宅介護支援事業所名から営業分析をしてください。以下の形式で返答してください。

【事業所推定】
法人格・母体：
規模感：

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
          messages: [{ role: "user", content: `事業所名：${name}` }],
        }),
      });
      
      const data = await aiRes.json();
      const text = data.content[0].text;
      
      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${process.env.LINE_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: "text", text }],
        }),
      });
    } catch(e) {
      console.error(e);
    }
  }

  res.status(200).send("OK");
}
