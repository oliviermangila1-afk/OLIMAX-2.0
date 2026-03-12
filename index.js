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

const app = express()

app.get("/",(req,res)=>{
res.send("OLIMAX 2.0 BOT ACTIF")
})

app.listen(3000,()=>{
console.log("Serveur OLIMAX actif")
})

async function askAI(text){

try{

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model:"openchat/openchat-7b",
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

console.log(e)

return "Erreur IA. Réessaie plus tard."

}

}

async function analyseImage(path){

try{

const base64 = fs.readFileSync(path,{encoding:"base64"})

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model:"openai/gpt-4o-mini",
messages:[
{
role:"user",
content:[
{type:"text",text:"Analyse cette image"},
{
type:"image_url",
image_url:{url:`data:image/jpeg;base64,${base64}`}
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

}catch(e){

console.log(e)

return "Impossible d'analyser l'image."

}

}

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth:state,
printQRInTerminal:true,
browser:["OLIMAX","Chrome","1.0"]
})

sock.ev.on("creds.update",saveCreds)

sock.ev.on("connection.update",(update)=>{

const { connection, qr, lastDisconnect } = update

if(qr){
console.log("Scanner ce QR avec WhatsApp")
qrcode.generate(qr,{small:true})
}

if(connection==="open"){
console.log("OLIMAX connecté à WhatsApp")
}

if(connection==="close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

if(shouldReconnect){
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

if(msg.message.imageMessage){

const buffer = await downloadMediaMessage(
msg,
"buffer",
{},
{logger:console}
)

const path = "./image.jpg"

fs.writeFileSync(path,buffer)

const result = await analyseImage(path)

await sock.sendMessage(sender,{text:result})

}

})

}

startBot()