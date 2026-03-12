import makeWASocket,{
useMultiFileAuthState,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"
import qrcode from "qrcode-terminal"

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
auth: state,
logger: pino({ level:"silent" })
})

sock.ev.on("connection.update",(update)=>{

const { connection, qr, lastDisconnect } = update

// afficher QR dans terminal
if(qr){
console.log("SCAN CE QR AVEC WHATSAPP")
qrcode.generate(qr,{small:true})
}

if(connection === "open"){
console.log("OLIMAX 2.0 CONNECTÉ ✅")
}

if(connection === "close"){

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

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

const sender = msg.key.remoteJid

// qui es tu
if(text.toLowerCase().includes("qui es tu")){
await sock.sendMessage(sender,{
text:"Je suis *OLIMAX 2.0* 🤖 une intelligence artificielle WhatsApp."
})
}

// qui t'a créé
if(text.toLowerCase().includes("qui t'a créé")){
await sock.sendMessage(sender,{
text:`Je suis *OLIMAX 2.0*

Créé par *OLIVIER MANGILA*

📞 Contact : +243981240435`
})
}

// bonjour
if(text.toLowerCase().includes("bonjour")){
await sock.sendMessage(sender,{
text:"Bonjour 👋 je suis OLIMAX 2.0"
})
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()