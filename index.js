import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import express from "express"
import QRCode from "qrcode"
import fetch from "node-fetch"

const app = express()
const PORT = process.env.PORT || 8080

app.get("/", (req,res)=>{
res.send("🤖 OLIMAX BOT ACTIF")
})

app.listen(PORT, ()=>{
console.log("🚀 Serveur actif sur le port", PORT)
})

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./auth")

const sock = makeWASocket({
auth: state
})

sock.ev.on("connection.update", async (update)=>{

const { connection, qr, lastDisconnect } = update

if(qr){

console.log("📱 QR généré")

const qrImage = await QRCode.toDataURL(qr)

console.log("➡️ Copie ce lien dans ton navigateur pour voir le QR :")
console.log(qrImage)

}

if(connection === "open"){
console.log("✅ WhatsApp connecté !")
}

if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

console.log("⚠️ Déconnexion...")

if(shouldReconnect){
startBot()
}

}

})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("messages.upsert", async (m)=>{

const msg = m.messages[0]

if(!msg.message) return
if(msg.key.fromMe) return

const from = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

if(!text) return

console.log("📩 Message reçu :", text)

try{

const response = await fetch("https://openrouter.ai/api/v1/chat/completions",{
method:"POST",
headers:{
"Authorization":`Bearer ${process.env.OPENROUTER_API_KEY}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
model:"openai/gpt-4o-mini",
messages:[
{
role:"system",
content:"Tu es OLIMAX, un assistant intelligent comme ChatGPT. Réponds clairement avec des emojis."
},
{
role:"user",
content:text
}
]
})
})

const data = await response.json()

let reply = data?.choices?.[0]?.message?.content

if(!reply){
reply="🤖 Désolé, je n'ai pas compris."
}

await sock.sendMessage(from,{ text: reply })

}catch(err){

console.log("Erreur API :", err)

await sock.sendMessage(from,{
text:"⚠️ Erreur serveur OLIMAX."
})

}

})

}

startBot()