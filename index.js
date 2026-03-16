import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import qrcode from "qrcode-terminal"
import fetch from "node-fetch"
import express from "express"

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
auth: state,
printQRInTerminal:false
})

sock.ev.on("connection.update", (update)=>{

const {connection, qr} = update

if(qr){
console.log("📱 Scanner ce QR avec WhatsApp")
qrcode.generate(qr,{small:true})
}

if(connection==="open"){
console.log("✅ WhatsApp connecté !")
}

if(connection==="close"){
console.log("⚠️ Déconnexion... reconnexion")
startBot()
}

})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("messages.upsert", async ({messages})=>{

const msg = messages[0]

if(!msg.message) return
if(msg.key.fromMe) return

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

if(!text) return

console.log("📩 Message:", text)

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
content:"Tu es OLIMAX un assistant intelligent style ChatGPT. Réponds clairement avec des emojis."
},
{
role:"user",
content:text
}
]
})
})

const data = await response.json()

let reply = data.choices?.[0]?.message?.content

if(!reply){
reply="🤖 Désolé je n'ai pas compris la question."
}

await sock.sendMessage(msg.key.remoteJid,{text:reply})

}catch(err){

console.log("Erreur API",err)

await sock.sendMessage(msg.key.remoteJid,{
text:"⚠️ Erreur serveur OLIMAX."
})

}

})

}

startBot()