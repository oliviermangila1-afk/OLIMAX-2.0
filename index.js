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

/* serveur railway */

const app = express()

app.get("/",(req,res)=>{
res.send("OLIMAX 2.0 BOT ACTIF")
})

app.listen(3000,()=>{
console.log("Serveur OLIMAX actif")
})

/* fonction IA */

async function askAI(text){

try{

const response = await axios.post(
"https://openrouter.ai/api/v1/chat/completions",
{
model:"openchat/openchat-7b",
messages:[
{
role:"system",
content:"Tu es OLIMAX 2.0 une intelligence artificielle créée par Olivier Mangila. Tu aides les utilisateurs comme ChatGPT."
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

console.log(e.response?.data || e.message)

return "Erreur IA. Réessaie plus tard."

}

}

/* analyse image */

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
{type:"text",text:"Analyse cette image et explique ce qu'elle contient."},
{
type:"image_url",
image_url:{
url:`data:image/jpeg;base64,${base64}`
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

}catch(e){

console.log(e.response?.data || e.message)

return "Je n'arrive pas à analyser l'image."

}

}

/* bot whatsapp */

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth:state,
printQRInTerminal:true,
connectTimeoutMs:60000,
keepAliveIntervalMs:10000,
browser:["OLIMAX 2.0","Chrome","1.0"]
})

sock.ev.on("creds.update",saveCreds)

sock.ev.on("connection.update",(update)=>{

const { connection, qr, lastDisconnect } = update

if(qr){
console.log("Scanner ce QR avec WhatsApp")
qrcode.generate(qr,{small:true})
}

if(connection==="open"){
console.log("OLIMAX 2.0 connecté à WhatsApp")
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

/* commande créateur */

if(text.toLowerCase().includes("qui t'a créé")){

await sock.sendMessage(sender,{
text:`Je suis *OLIMAX 2.0*

Créé par *OLIVIER MANGILA*

📞 +243981240435`
})

return
}

/* message texte */

if(text){

const reply = await askAI(text)

await sock.sendMessage(sender,{text:reply})

}

/* analyse image */

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