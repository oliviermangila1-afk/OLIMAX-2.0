import makeWASocket, {
useMultiFileAuthState,
fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import express from "express"
import fetch from "node-fetch"

const OWNER = "Olivier MANGILA"
const NUMBER = "243981240435"
const BOTNAME = "OLIMAX"

/* ===================== */
/* SERVEUR */
/* ===================== */

const app = express()
const PORT = process.env.PORT || 8080

app.get("/", (req,res)=>{
res.send("OLIMAX BOT ACTIF")
})

app.listen(PORT, ()=>{
console.log("Serveur actif sur", PORT)
})

/* ===================== */
/* IA */
/* ===================== */

async function askAI(message){

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
content:`Tu es ${BOTNAME}. Ton créateur est ${OWNER}. Si quelqu'un demande qui t'a créé répond : J'ai été créé par ${OWNER}. Pour avoir la même IA contactez ${NUMBER}. Réponds comme ChatGPT avec des emojis.`
},
{
role:"user",
content:message
}
]
})
})

const data = await response.json()

return data.choices[0].message.content

}catch{

return "⚠️ L'IA OLIMAX ne répond pas pour le moment."

}

}

/* ===================== */
/* BOT WHATSAPP */
/* ===================== */

async function startBot(){

console.log("Démarrage OLIMAX V4...")

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
printQRInTerminal:false
})

sock.ev.on("creds.update", saveCreds)

/* ===================== */
/* PAIRING CODE */
/* ===================== */

if(!sock.authState.creds.registered){

const phoneNumber = "243981240435"

const code = await sock.requestPairingCode(phoneNumber)

console.log("===================================")
console.log("CODE WHATSAPP :", code)
console.log("===================================")

}

/* ===================== */
/* CONNEXION */
/* ===================== */

sock.ev.on("connection.update", (update)=>{

const { connection } = update

if(connection === "open"){
console.log("OLIMAX connecté à WhatsApp")
}

if(connection === "close"){
console.log("Reconnexion...")
startBot()
}

})

/* ===================== */
/* MESSAGES */
/* ===================== */

sock.ev.on("messages.upsert", async ({ messages })=>{

const msg = messages[0]

if(!msg.message) return
if(msg.key.fromMe) return

const chat = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

if(!text) return

console.log("Message :", text)

const reply = await askAI(text)

await sock.sendMessage(chat,{ text: reply })

})

}

startBot()