import makeWASocket, {
DisconnectReason,
useMultiFileAuthState,
fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import pino from "pino"
import express from "express"
import axios from "axios"
import qrcode from "qrcode-terminal"

/* =========================
CONFIGURATION
========================= */

const BOTNAME = "OLIMAX"
const OWNER = "Olivier MANGILA"
const NUMBER = "243981240435"

const API_KEY = process.env.OPENROUTER_API_KEY

/* =========================
SERVEUR WEB
========================= */

const app = express()

app.get("/", (req,res)=>{
res.send("OLIMAX BOT ACTIF")
})

app.listen(3000,()=>{
console.log("🌐 Serveur actif sur 3000")
})

/* =========================
ANTI DOUBLON
========================= */

const processedMessages = new Set()

/* =========================
IA
========================= */

async function askAI(text){

try{

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model: "openai/gpt-4o-mini",
temperature: 0.7,
messages: [
{
role:"system",
content:`Tu es ${BOTNAME}, une intelligence artificielle avancée créée par ${OWNER}.

Ton style doit ressembler à ChatGPT :

- réponses naturelles et humaines
- phrases bien structurées
- utilise des emojis quand c'est pertinent 🙂
- explique clairement les choses
- reste poli et conversationnel
- répond toujours en UNE seule réponse

Si quelqu'un demande qui t'a créé répond :
"J'ai été créé par ${OWNER}. Contact : ${NUMBER}"

Parle comme un assistant intelligent et amical.`
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
"Content-Type":"application/json"
}
}
)

return response.data.choices[0].message.content

}catch(error){

console.log("Erreur IA :", error.response?.data || error.message)

return "⚠️ Désolé, l'IA ne peut pas répondre pour le moment."

}

}

/* =========================
BOT WHATSAPP
========================= */

async function startBot(){

console.log("🚀 Démarrage OLIMAX...")

const { state, saveCreds } = await useMultiFileAuthState("session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({level:"silent"}),
browser:["OLIMAX","Chrome","1.0"]
})

sock.ev.on("creds.update", saveCreds)

/* =========================
CONNEXION
========================= */

sock.ev.on("connection.update",(update)=>{

const {connection,qr,lastDisconnect} = update

if(qr){

console.log("📱 Scanne le QR avec WhatsApp")

qrcode.generate(qr,{small:true})

}

if(connection === "open"){

console.log("✅ OLIMAX connecté à WhatsApp")

}

if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

if(shouldReconnect){

console.log("🔄 Reconnexion...")
startBot()

}

}

})

/* =========================
MESSAGES
========================= */

sock.ev.on("messages.upsert", async ({messages,type})=>{

if(type !== "notify") return

const msg = messages[0]

if(!msg.message) return

/* ignorer messages du bot */

if(msg.key.fromMe) return

/* anti doublon */

const id = msg.key.id

if(processedMessages.has(id)) return

processedMessages.add(id)

/* lecture message */

const chat = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(!text) return

console.log("📩 Message reçu :", text)

/* réponse IA */

const reply = await askAI(text)

await sock.sendMessage(chat,{ text: reply })

})

}

startBot()