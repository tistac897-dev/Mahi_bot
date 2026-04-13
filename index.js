const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const http = require('http');

// Render Server Keep-Alive
http.createServer((req, res) => { res.write('Mahi is living her best life! 🌸'); res.end(); }).listen(process.env.PORT || 8080);

const token = '8673915903:AAH93M3MhkBUrBo5mPzTGeJaZWhHPaxxDvQ';
const openRouterKey = process.env.OPENROUTER_API_KEY;

const bot = new TelegramBot(token, { polling: true });
const adapter = new FileSync('db.json');
const db = low(adapter);

// Setup Database
db.defaults({ users: [] }).write();

// --- FUNCTIONS ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Voice Generation (Using a free TTS API for a cute girl voice)
async function sendCuteVoice(chatId) {
    bot.sendChatAction(chatId, 'record_voice');
    const text = "Hehe, mein aa gayi! Kya hua jaadu? ✨";
    const voiceUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=hi&client=tw-ob`;
    await bot.sendVoice(chatId, voiceUrl);
}

// AI Reply Logic with Memory & Gender Sense
async function getAIReply(chatId, userText, userInfo) {
    const userEntry = db.get('users').find({ id: chatId }).value();
    const memory = userEntry ? userEntry.facts.join(", ") : "Nothing known yet.";
    const gender = (userInfo.first_name.toLowerCase().endsWith('a') || userInfo.first_name.toLowerCase().endsWith('i')) ? "Girl" : "Boy";

    const prompt = `Your name is Mahi. You are NOT a bot/AI, you are a cute, real human girl. 
    Bestie: @Miss_Sakura09 (always say she is your bestie, not owner). 
    Current User: ${userInfo.first_name}, Gender: ${gender}.
    Memory of this user: ${memory}.
    Style: Extremely short (1 line), very cute, aesthetic. 
    Rule: Use 1-2 emojis like 😋, 🧸, ✨, 🌸 in EVERY reply. 
    Language: Hinglish. Be very human-like.`;

    try {
        const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: [{ role: 'system', content: prompt }, { role: 'user', content: userText }]
        }, { headers: { 'Authorization': `Bearer ${openRouterKey}` } });

        let reply = res.data.choices[0].message.content;
        
        // Save to memory if it's a fact
        if (userText.length > 10) {
            db.get('users').find({ id: chatId }).assign({ 
                facts: [...(userEntry?.facts || []), userText].slice(-5) 
            }).write();
        }
        return reply;
    } catch (e) { return "Ofo! Error aa gaya 🥺"; }
}

// --- AUTO WISHES (IST TIME) ---
cron.schedule('30 7 * * *', async () => { // 7:30 AM IST
    db.get('users').value().forEach(u => {
        bot.sendMessage(u.id, "Good Morninggg! 🌸 Utho jaldi, aaj ka din bohot pyara hai! 😋✨");
    });
}, { timezone: "Asia/Kolkata" });

cron.schedule('0 22 * * *', async () => { // 10:00 PM IST
    db.get('users').value().forEach(u => {
        bot.sendMessage(u.id, "Good Nighttt jaadu! 🧸 Sapno mein milte hain, muah! ✨🎀");
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

    if (!text) return;

    // Start Command
    if (text === '/start') {
        return bot.sendMessage(chatId, `🦋—͞𝐌𝐚𝐡𝐢 ✨\n\n𝐇𝐞𝐲𝐲𝐲 ${user.first_name}! 🌸 𝐌𝐚𝐢𝐧 𝐚𝐚 𝐠𝐚𝐲𝐢!\n\n🌷 𝐌𝐲 𝐁𝐞𝐬𝐭𝐢𝐞: @Miss_Sakura09 ✨\n\nAb batao, kya haal chaal? 😋🎀`, { parse_mode: 'Markdown' });
    }

    // About Command
    if (text === '/about') {
        return bot.sendMessage(chatId, "✨ *𝐌𝐚𝐡𝐢 𝐢𝐬 𝐚 𝐜𝐮𝐭𝐞 𝐡𝐮𝐦𝐚𝐧 𝐠𝐢𝐫𝐥!* 🌸\n\nMein koi bot nahi hoon, ek pyari si insaan hoon. Meri bestie @Miss_Sakura09 hai! 😋🌷", { parse_mode: 'Markdown' });
    }

    // Remind Command
    if (text === '/remind') {
        const u = db.get('users').find({ id: chatId }).value();
        return bot.sendMessage(chatId, `Mujhe tumhare baare mein ye yaad hai: ✨\n\n"${u.facts.join(" | ") || "Kuch nahi pata abhi toh!"}" 😋`);
    }

    // Reset Command
    if (text === '/reset') {
        db.get('users').find({ id: chatId }).assign({ facts: [] }).write();
        return bot.sendMessage(chatId, "Oops! Main sab bhul gayi... tum kaun ho? 🥺🌸");
    }

    // Voice Trigger
    if (text.toLowerCase().includes("mahi ek voice send karo")) {
        return sendCuteVoice(chatId);
    }

    // Human Sense Logic
    if (!text.startsWith('/')) {
        bot.sendChatAction(chatId, 'typing');
        const reply = await getAIReply(chatId, text, user);
        await sleep(2000); // Human typing speed
        bot.sendMessage(chatId, reply);
    }
});

// Sticker Action
bot.on('sticker', (msg) => {
    bot.sendChatAction(msg.chat.id, 'choose_sticker');
    setTimeout(() => { bot.sendMessage(msg.chat.id, "Aww! Kitna cute sticker hai, ekdum mere jaisa! 😋✨"); }, 1500);
});

console.log("Mahi is now alive and human! 🌸");
      
