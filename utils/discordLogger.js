const axios = require("axios");

const webhookUrl = process.env.DISCORD_WEBHOOK_URL || "";

async function sendToDiscord(message) {
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, {
      content: message.slice(0, 1900)
    });
  } catch (err) {
    console.error("Failed to send Discord log:", err.message);
  }
}

async function logEvent({ category, action, user, meta }) {
  const parts = [
    `**[${category}] ${action}**`,
    user ? `User: ${user.email || user.name || user.id}` : "User: anonymous",
    `Time: ${new Date().toISOString()}`
  ];

  if (meta) {
    const cleaned = JSON.stringify(meta, null, 2);
    parts.push("```json\n" + cleaned.slice(0, 1500) + "\n```");
  }

  await sendToDiscord(parts.join("\n"));
}

module.exports = { logEvent };
