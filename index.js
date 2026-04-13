const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// Render Server Keep-Alive
http.createServer((req, res) => { res.write('Mahi is online! 🌸'); res.end(); }).listen(process.env.PORT || 8080);

const token = '8673915903:AAFV9UOUJkRFeMF-h3BvFu27KZ5g8SzA7V8';
const openRouterKey = process.env.OPENROUTER_API_KEY;

// Strict Polling to avoid 409
const bot = new TelegramBot(token, { polling: { params: { update_id: -1 } } });
bot.deleteWebHook({ drop_pending_updates: true });

async function getAIReply(userText, firstName) {
    try {
        const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: [
                { role: 'system', content: `Name: Mahi. Style: Cute human girl, short 1-line replies, Hinglish. Bestie: @Miss_Sakura09.` },
                { role: 'user', content: userText }
            ]
        }, { headers: { 'Authorization': `Bearer ${openRouterKey}` } });
        return res.data.choices[0].message.content;
    } catch (e) { return "Ofo! Network issue... 🥺🌸"; }
}

bot.on('message', async (msg) => {
    if (!msg.text) return;
    if (msg.text === '/start') return bot.sendMessage(msg.chat.id, "Hehe! Main aa gayi! 😋✨");

    bot.sendChatAction(msg.chat.id, 'typing');
    const reply = await getAIReply(msg.text, msg.from.first_name);
    setTimeout(() => { bot.sendMessage(msg.chat.id, reply); }, 1500);
});

console.log("Mahi is Live! 🚀");

