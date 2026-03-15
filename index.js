import makeWASocket, {
fetchLatestBaileysVersion,
useMultiFileAuthState,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"
import axios from "axios"

/* ===== INFOS CREATEUR ===== */

const BOT_NAME = "OLIMAX-3.1"
const OWNER_NAME = "OLIVIER MANGILA"
const OWNER_NUMBER = "0981240435"

const API_KEY = process.env.OPENROUTER_API_KEY

/* ===== IA ===== */

async function askAI(question){

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model:"openai/gpt-4o-mini",
messages:[
{
role:"system",
content:`Tu es ${BOT_NAME}, une intelligence artificielle WhatsApp.

Ton créateur est ${OWNER_NAME}.
Si quelqu'un demande qui t'a créé répond :

"J'ai été créé par ${OWNER_NAME}. Pour avoir la même IA contactez ${OWNER_NUMBER}."

Réponds intelligemment avec emojis.`
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

/* ===== BOT ===== */

async function startBot(){

console.log("🚀 Démarrage OLIMAX")

const { state, saveCreds } = await useMultiFileAuthState("session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({ level:"silent" }),
browser:["OLIMAX","Chrome","3.1"]
})

sock.ev.on("creds.update", saveCreds)

/* ===== PAIRING CODE ===== */

if(!sock.authState.creds.registered){

const code = await sock.requestPairingCode("243981240435")

console.log("🔑 Code WhatsApp :", code)

}

/* ===== CONNEXION ===== */

sock.ev.on("connection.update", (update)=>{

const { connection, lastDisconnect } = update

if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

console.log("⚠️ Connexion fermée")

if(shouldReconnect){

console.log("🔄 Reconnexion du bot...")

startBot()

}

}

if(connection === "open"){

console.log("✅ OLIMAX connecté à WhatsApp")

}

})

/* ===== MESSAGES ===== */

sock.ev.on("messages.upsert", async ({ messages })=>{

const msg = messages[0]

if(!msg.message) return

const chat = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(!text) return

try{

const reply = await askAI(text)

await sock.sendMessage(chat,{ text: reply })

}catch(e){

await sock.sendMessage(chat,{
text:"⚠️ L'IA rencontre un problème."
})

}

})

}

startBot()