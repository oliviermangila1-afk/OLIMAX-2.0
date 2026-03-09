import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"

import qrcode from "qrcode-terminal"
import axios from "axios"

const API_KEY = "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"

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
browser: ["OLIMAX 2.0","Chrome","1.0"]
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", (update) => {

const { connection, qr, lastDisconnect } = update

if(qr){
console.log("📱 Scanner ce QR avec WhatsApp")
qrcode.generate(qr,{small:true})
}

if(connection === "open"){
console.log("✅ OLIMAX 2.0 connecté à WhatsApp")
}

if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

if(shouldReconnect){
startBot()
}

}

})

sock.ev.on("messages.upsert", async ({messages}) => {

const msg = messages[0]

if(!msg.message) return
if(msg.key.fromMe) return

const sender = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

let reply = ""

if(text.toLowerCase().includes("qui t'a créé")){

reply = `Je suis *OLIMAX 2.0*.

J'ai été créé par *OLIVIER MANGILA*.

Mon utilisateur principal est *OLIVIER MANGILA*.

Si vous voulez un assistant IA comme moi contactez :

📞 +243981240435`

}

else{

try{

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model:"openai/gpt-4o-mini",
messages:[
{
role:"system",
content:"Tu es OLIMAX 2.0, une intelligence artificielle créée par OLIVIER MANGILA. Tu réponds aux questions des utilisateurs comme ChatGPT."
},
{
role:"user",
content:text
}
]
},
{
headers:{
Authorization:`Bearer ${API_KEY}`,
"Content-Type":"application/json",
"HTTP-Referer":"https://olimax-bot.ai",
"X-Title":"OLIMAX 2.0"
}
}
)

reply = response.data.choices[0].message.content

}catch(e){

console.log(e.response?.data || e.message)

reply = "⚠️ OLIMAX 2.0 : erreur IA. Réessaie plus tard."

}

}

await sock.sendMessage(sender,{text:reply})

})

}

startBot()