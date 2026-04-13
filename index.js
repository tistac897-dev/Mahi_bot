const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const http = require('http');

// Render Server Keep-Alive
http.createServer((req, res) => { 
    res.write('Mahi is fresh and awake! 🌸'); 
    res.end(); 
}).listen(process.env.PORT || 8080);

// --- LATEST TOKEN UPDATED ---
const token = '8673915903:AAFV9UOUJkRFeMF-h3BvFu27KZ5g8SzA7V8';
const openRouterKey = process.env.OPENROUTER_API_KEY;

// 409 Conflict Fixer: Strict Polling
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            update_id: -1 // Ignore all old updates
        }
    } 
});

// Clear Webhook cache immediately
bot.deleteWebHook({ drop_pending_updates: true });

const adapter = new FileSync('/tmp/db.json');
const db = low(adapter);
db.defaults({ users: [] }).write();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// AI Reply Logic
async function getAIReply(chatId, userText, userInfo) {
    const userEntry = db.get('users').find({ id: chatId }).value();
    const memory = userEntry ? userEntry.facts.join(", ") : "New friend.";
    const gender = (userInfo.first_name.toLowerCase().endsWith('a') || userInfo.first_name.toLowerCase().endsWith('i')) ? "Girl" : "Boy";

    const prompt = `Your name is Mahi. Identity: Sweet real human girl. Bestie: @Miss_Sakura09. 
    Talking to: ${userInfo.first_name}, Gender: ${gender}. Memory: ${memory}.
    Style: Extremely Short (max 1 line), cute, aesthetic Hinglish. Use 1-2 emojis like 😋, ✨, 🌸.`;

    try {
        const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: [{ role: 'system', content: prompt }, { role: 'user', content: userText }]
        }, { headers: { 'Authorization': `Bearer ${openRouterKey}`, 'Content-Type': 'application/json' } });
        return res.data.choices[0].message.content;
    } catch (e) { return "Ofo! Network nakhre kar raha hai... 🥺🌸"; }
}

// --- AUTO WISHES ---
cron.schedule('30 7 * * *', () => {
    db.get('users').value().forEach(async (u) => {
        await sleep(1000);
        bot.sendMessage(u.id, "Good Morninggg! 🌸 Utho jaldi, aaj ka din bohot pyara hai! 😋✨");
    });
}, { timezone: "Asia/Kolkata" });

cron.schedule('0 22 * * *', () => {
    db.get('users').value().forEach(async (u) => {
        await sleep(1000);
        bot.sendMessage(u.id, "Good Nighttt jaadu! 🧸 Sapno mein milte hain! ✨🎀");
    });
}, { timezone: "Asia/Kolkata" });

// --- HANDLERS ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const user = msg.from;

    if (!db.get('users').find({ id: chatId }).value()) {
        db.get('users').push({ id: chatId, name: user.first_name, facts: [] }).write();
    }

    if (!text || text.startsWith('/')) {
        if (text === '/start') {
            return bot.sendMessage(chatId, `🦋—͞𝐌𝐚𝐡𝐢 ✨\n\n𝐇𝐞𝐲𝐲𝐲 ${user.first_name}! 🌸 𝐌𝐚𝐢𝐧 𝐚𝐚 𝐠𝐚𝐲𝐢 𝐧𝐞𝐰 𝐭𝐨𝐤𝐞𝐧 𝐤𝐞 𝐬𝐚𝐚𝐭𝐡! 😋🎀`);
        }
        return;
    }

    bot.sendChatAction(chatId, 'typing');
    const reply = await getAIReply(chatId, text, user);
    
    if (text.length > 8 && !text.includes("?")) {
        const entry = db.get('users').find({ id: chatId }).value();
        db.get('users').find({ id: chatId }).assign({ facts: [...(entry?.facts || []), text].slice(-3) }).write();
    }

    await sleep(Math.min(text.length * 80, 2500)); 
    bot.sendMessage(chatId, reply);
});

bot.on('sticker', (msg) => {
    bot.sendChatAction(msg.chat.id, 'choose_sticker');
    setTimeout(() => { bot.sendMessage(msg.chat.id, "Aww! Kitna cute sticker hai! 😋✨"); }, 1500);
});

console.log("Mahi is online with Latest Token! 🚀🌸");
                       
