const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason
} = require("@whiskeysockets/baileys")

const pino = require("pino")
const qrcode = require("qrcode-terminal")
const express = require("express")

const { OpenAI } = require("openai")

// API OpenRouter
const openai = new OpenAI({
apiKey: process.env.OPENROUTER_API_KEY,
baseURL: "https://openrouter.ai/api/v1"
})

let processedMessages = new Set()

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./session")

const sock = makeWASocket({
logger: pino({ level: "silent" }),
auth: state
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", (update)=>{

const { connection, lastDisconnect, qr } = update

if(qr){
console.log("📱 Scanner ce QR Code")
qrcode.generate(qr,{small:true})
}

if(connection === "open"){
console.log("✅ OLIMAX connecté à WhatsApp")
}

if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

console.log("🔄 Reconnexion...")

if(shouldReconnect){
startBot()
}

}

})

sock.ev.on("messages.upsert", async ({ messages })=>{

const msg = messages[0]

if(!msg.message) return
if(msg.key.fromMe) return

const messageId = msg.key.id

if(processedMessages.has(messageId)) return
processedMessages.add(messageId)

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(!text) return

const sender = msg.key.remoteJid

console.log("💬 Question:", text)

try{

const completion = await openai.chat.completions.create({
model: "openai/gpt-4o-mini",
messages: [
{
role: "system",
content:
"Tu es OLIMAX 🤖 une intelligence artificielle qui répond comme ChatGPT avec des réponses naturelles, claires et parfois des emojis."
},
{
role: "user",
content: text
}
]
})

const reply = completion.choices[0].message.content

await sock.sendMessage(sender,{ text: reply })

console.log("✅ Réponse envoyée")

}catch(error){

console.log("❌ Erreur IA:", error)

await sock.sendMessage(sender,{
text:"⚠️ Désolé, une erreur est survenue. Réessaie dans quelques instants 🙂"
})

}

})

}

startBot()

// serveur web pour Railway
const app = express()

app.get("/",(req,res)=>{
res.send("OLIMAX BOT ACTIF 🤖")
})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("🌍 Serveur actif sur le port " + PORT)
})