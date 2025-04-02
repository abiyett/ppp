const TelegramBot = require('node-telegram-bot-api'); const fs = require('fs'); const request = require('request');

const token = '7951430892:8093974325:AAG6i74N5KGTHoUwvFhdiB-LgK_Znxuquiw'; const bot = new TelegramBot(token, { polling: true });

const adminId = 7689032393; let userState = {}; // To store user progress let premiumUsers = {}; // Store user subscription details let redeemCodes = {}; // Store generated redeem codes

const saveData = () => fs.writeFileSync('subscriptions.json', JSON.stringify(premiumUsers, null, 2)); const loadData = () => { if (fs.existsSync('subscriptions.json')) { premiumUsers = JSON.parse(fs.readFileSync('subscriptions.json')); } };

loadData();

bot.onText(//abiyet/, (msg) => { if (msg.chat.id !== adminId) return; bot.sendMessage(adminId, "🛠 Admin Panel\n\nCommands:\n/generatecode <days> - Create a premium code\n/subscribers - View active users\n/resetuser <userId> - Reset user subscription"); });

bot.onText(//generatecode (\d+)/, (msg, match) => { if (msg.chat.id !== adminId) return; const days = parseInt(match[1]); const code = Math.random().toString(36).substring(2, 10).toUpperCase(); redeemCodes[code] = { days, used: false }; bot.sendMessage(adminId, ✅ Generated Code: ${code}\nValid for: ${days} days); });

bot.onText(//subscribers/, (msg) => { if (msg.chat.id !== adminId) return; let response = "📋 Active Subscribers:\n"; for (const [userId, details] of Object.entries(premiumUsers)) { response += 👤 ${userId} - Expires: ${new Date(details.expires).toLocaleString()}\n; } bot.sendMessage(adminId, response || "No active subscribers."); });

bot.onText(//resetuser (\d+)/, (msg, match) => { if (msg.chat.id !== adminId) return; const userId = match[1]; if (premiumUsers[userId]) { delete premiumUsers[userId]; saveData(); bot.sendMessage(adminId, ✅ User ${userId}'s subscription has been reset.); } else { bot.sendMessage(adminId, ❌ User ${userId} does not have an active subscription.); } });

bot.onText(//redeem (\w+)/, (msg, match) => { const chatId = msg.chat.id; const code = match[1];

if (!redeemCodes[code]) {
    bot.sendMessage(chatId, "❌ Invalid code.");
    return;
}
if (redeemCodes[code].used) {
    bot.sendMessage(chatId, "⚠️ Code already used.");
    return;
}

const days = redeemCodes[code].days;
const expires = Date.now() + days * 24 * 60 * 60 * 1000;
premiumUsers[chatId] = { expires };
redeemCodes[code].used = true;

saveData();
bot.sendMessage(chatId, `🎉 You are now premium for ${days} days!`);

});

const isPremium = (chatId) => premiumUsers[chatId] && premiumUsers[chatId].expires > Date.now();

bot.onText(//start/, (msg) => { const chatId = msg.chat.id;

if (isPremium(chatId)) {
    bot.sendMessage(chatId, "📂 Convert your TXT files effortlessly into VCF format!");
} else {
    bot.sendMessage(chatId, "🚀 Introducing the Ultimate TXT to VCF Converter Bot! 📂➡️📇\n\n✅ Convert .txt files into .vcf contacts instantly!\n✅ Customize file names and contact details with ease!\n✅ Premium Subscription Plans Available\n🔹 3 Days – $2\n🔹 7 Days – $5\n🔹 14 Days – $9\n🔹 1 Month – $15\n✅ Redeem Code System – Get premium access with special codes!\n✅ Join @VCFUPDATESS to Access the Bot!\n\n🎯 How to Start?\n1️⃣ Join this channel (@VCFUPDATESS)\n2️⃣ Start the bot\n3️⃣ Convert your TXT files effortlessly!");
}

});

bot.on('document', (msg) => { const chatId = msg.chat.id;

if (!isPremium(chatId)) {
    bot.sendMessage(chatId, "🔒 You need a premium subscription to use this feature. Use /redeem <code>.");
    return;
}

const fileId = msg.document.file_id;
const fileName = msg.document.file_name;

if (!fileName.endsWith('.txt')) {
    bot.sendMessage(chatId, "⚠️ Please upload a valid .txt file.");
    return;
}

userState[chatId] = { step: 1, fileId, fileName };
bot.sendMessage(chatId, "📂 Please provide the initial file name (e.g., file 1).");
userState[chatId].step = 2;

});

bot.on('message', (msg) => { const chatId = msg.chat.id;

if (!userState[chatId]) return;
const user = userState[chatId];

switch (user.step) {
    case 5:
        user.contactPrefix = msg.text;
        bot.sendMessage(chatId, "⏳ Processing file...");

        bot.getFileLink(user.fileId).then((fileLink) => {
            const fileStream = fs.createWriteStream('temp.txt');
            request(fileLink).pipe(fileStream);

            fileStream.on('finish', () => {
                fs.readFile('temp.txt', 'utf8', (err, data) => {
                    if (err) return bot.sendMessage(chatId, "❌ Error reading file.");
                    
                    const lines = data.split('\n');
                    let contactIndex = 1;
                    let sentFiles = 0;

                    for (let i = 0; i < user.numFiles; i++) {
                        let vcfContent = '';
                        for (let j = 0; j < user.numbersPerFile && contactIndex <= lines.length; j++) {
                            const contact = lines[contactIndex - 1].trim();
                            if (contact) {
                                vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${user.contactPrefix} ${contactIndex}\nTEL:${contact}\nEND:VCARD\n`;
                            }
                            contactIndex++;
                        }

                        const fileName = `${user.fileName} ${i + 1}.vcf`;
                        fs.writeFile(fileName, vcfContent, (err) => {
                            if (!err) {
                                bot.sendDocument(chatId, fileName).then(() => {
                                    sentFiles++;
                                    if (sentFiles % 100 === 0) {
                                        bot.sendMessage(chatId, "📂 Sending more files...");
                                    }
                                });
                            }
                        });
                    }
                    userState[chatId] = null;
                });
            });
        });
        break;
}

});

  
