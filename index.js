import makeWASocket,{
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason,
downloadMediaMessage
} from "@whiskeysockets/baileys"

import qrcode from "qrcode-terminal"
import axios from "axios"
import express from "express"
import fs from "fs"

const API_KEY = process.env.OPENROUTER_API_KEY

/* serveur */

const app = express()

app.get("/",(req,res)=>{
res.send("OLIMAX 2.0 BOT ACTIF")
})

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("Serveur OLIMAX actif")
})

/* IA */

async function askAI(text){

try{

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model:"mistralai/mistral-7b-instruct",
messages:[
{
role:"system",
content:"Tu es OLIMAX 2.0 une intelligence artificielle créée par Olivier Mangila."
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

}catch(e){

console.log("Erreur IA :",e.response?.data || e.message)

return "Erreur IA. Réessaie plus tard."

}

}

/* BOT */

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
printQRInTerminal: true,
connectTimeoutMs:60000,
defaultQueryTimeoutMs:0,
keepAliveIntervalMs:10000,
browser:["OLIMAX","Chrome","1.0"]
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", async (update)=>{

const { connection, qr, lastDisconnect } = update

if(qr){

console.log("Scanner ce QR avec WhatsApp")
qrcode.generate(qr,{small:true})

}

if(connection==="open"){

console.log("OLIMAX connecté à WhatsApp")

}

if(connection==="close"){

const reason = lastDisconnect?.error?.output?.statusCode

console.log("Connexion fermée :",reason)

if(reason !== DisconnectReason.loggedOut){

startBot()

}

}

})

sock.ev.on("messages.upsert", async ({messages})=>{

const msg = messages[0]

if(!msg.message) return
if(msg.key.fromMe) return

const sender = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

if(text){

const reply = await askAI(text)

await sock.sendMessage(sender,{text:reply})

}

})

}

startBot()