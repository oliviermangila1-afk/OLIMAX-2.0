import makeWASocket, {
fetchLatestBaileysVersion,
useMultiFileAuthState
} from "@whiskeysockets/baileys"

import pino from "pino"
import axios from "axios"

/* ===== TES INFORMATIONS ===== */

const BOT_NAME = "OLIMAX-2.0"
const OWNER_NAME = "OLIVIER MANGILA"
const OWNER_NUMBER = "243981240435"

/* ============================ */

const API_KEY = process.env.OPENROUTER_API_KEY

async function askAI(question){

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model: "openai/gpt-4o-mini",
messages: [
{
role: "system",
content:
`Tu es ${BOT_NAME}, une intelligence artificielle WhatsApp créée par ${OWNER_NAME}.
Si quelqu'un demande qui t'a créé, réponds que c'est ${OWNER_NAME} et donne ce numéro ${OWNER_NUMBER}.
Réponds intelligemment avec des emojis.`
},
{
role: "user",
content: question
}
]
},
{
headers:{
Authorization: `Bearer ${API_KEY}`,
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

sock.ev.on("connection.update",(update)=>{

const { connection } = update

if(connection === "open"){
console.log("✅ Bot connecté à WhatsApp")
}

})

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

await sock.sendMessage(chat,{
text: reply
})

}catch(e){

await sock.sendMessage(chat,{
text:"⚠️ L'IA est momentanément indisponible."
})

}

})

}

startBot()