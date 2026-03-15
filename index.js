import makeWASocket, {
fetchLatestBaileysVersion,
useMultiFileAuthState,
downloadMediaMessage
} from "@whiskeysockets/baileys"

import pino from "pino"
import axios from "axios"

/* ===== INFORMATIONS CREATEUR ===== */

const BOT_NAME = "OLIMAX-3.0"
const OWNER_NAME = "OLIVIER MANGILA"
const OWNER_NUMBER = "0981240435"

/* ================================= */

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
Si quelqu'un demande qui t'a créé répond :

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

/* ===== ANALYSE IMAGE ===== */

async function analyzeImage(imageBuffer){

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model:"openai/gpt-4o-mini",
messages:[
{
role:"user",
content:[
{ type:"text", text:"Analyse cette image et explique ce que tu vois." },
{
type:"image_url",
image_url:{
url:`data:image/jpeg;base64,${imageBuffer.toString("base64")}`
}
}
]
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

console.log("🚀 Démarrage OLIMAX-3.0")

const { state, saveCreds } = await useMultiFileAuthState("session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({ level:"silent" }),
browser:["OLIMAX","Chrome","3.0"]
})

sock.ev.on("creds.update", saveCreds)

/* ===== CONNEXION ===== */

if(!sock.authState.creds.registered){

const code = await sock.requestPairingCode("243981240435")

console.log("🔑 Code WhatsApp :", code)

}

sock.ev.on("connection.update",(update)=>{

if(update.connection === "open"){
console.log("✅ OLIMAX connecté à WhatsApp")
}

})

/* ===== MESSAGES ===== */

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if(!msg.message) return

const chat = msg.key.remoteJid

/* ===== TEXTE ===== */

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(text){

try{

const reply = await askAI(text)

await sock.sendMessage(chat,{ text: reply })

}catch{

await sock.sendMessage(chat,{
text:"⚠️ L'IA rencontre un problème temporaire."
})

}

}

/* ===== IMAGE ===== */

if(msg.message.imageMessage){

try{

const buffer = await downloadMediaMessage(
msg,
"buffer",
{},
{ logger:pino() }
)

const result = await analyzeImage(buffer)

await sock.sendMessage(chat,{ text: result })

}catch{

await sock.sendMessage(chat,{
text:"⚠️ Impossible d'analyser l'image."
})

}

}

})

}

startBot()