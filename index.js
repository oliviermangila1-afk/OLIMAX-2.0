import makeWASocket, {
fetchLatestBaileysVersion,
useMultiFileAuthState
} from "@whiskeysockets/baileys"

import pino from "pino"
import axios from "axios"

/* ========= INFORMATIONS ========= */

const BOT_NAME = "OLIMAX-2.0"
const OWNER_NAME = "OLIVIER MANGILA"
const OWNER_NUMBER = "0981240435"

/* ================================ */

const API_KEY = process.env.OPENROUTER_API_KEY

async function askAI(question){

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model: "openai/gpt-4o-mini",
messages:[
{
role:"system",
content:`Tu es ${BOT_NAME}, une intelligence artificielle WhatsApp.

Ton créateur est ${OWNER_NAME}.
Si quelqu'un demande qui t'a créé, réponds :

"J'ai été créé par ${OWNER_NAME}. Si vous voulez la même IA contactez-le au ${OWNER_NUMBER}."

Réponds intelligemment avec des emojis.`
},
{
role:"user",
content:question
}
]
},
{
headers:{
Authorization:`Bearer ${API_KEY}`,
"Content-Type":"application/json"
}
}
)

return response.data.choices[0].message.content
}

async function startBot(){

console.log("🚀 Démarrage OLIMAX-2.0")

const { state, saveCreds } = await useMultiFileAuthState("session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({ level: "silent" }),
browser: ["OLIMAX","Chrome","1.0"]
})

sock.ev.on("creds.update", saveCreds)

/* ===== CONNEXION WHATSAPP ===== */

sock.ev.on("connection.update", (update)=>{

const { connection, qr } = update

if(qr){
console.log("📱 Scan ce QR code avec WhatsApp pour connecter le bot")
console.log(qr)
}

if(connection === "open"){
console.log("✅ OLIMAX connecté à WhatsApp")
}

})

/* ===== MESSAGES ===== */

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if(!msg.message) return

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(!text) return

const chat = msg.key.remoteJid

try{

const reply = await askAI(text)

await sock.sendMessage(chat,{ text: reply })

}catch(error){

console.log(error)

await sock.sendMessage(chat,{
text:"⚠️ L'intelligence artificielle rencontre un problème."
})

}

})

}

startBot()