import makeWASocket,{
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"
import QRCode from "qrcode"

const ownerName = "Olivier Mangila"
const ownerNumber = "+243981240435"

async function startBot(){

console.log("Démarrage OLIMAX 2.0...")

const { state, saveCreds } = await useMultiFileAuthState("./session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({ level:"silent" })
})

sock.ev.on("connection.update", async (update)=>{

const { connection, qr, lastDisconnect } = update

// afficher QR dans Railway
if(qr){
console.log("SCAN CE QR AVEC WHATSAPP")
const qrText = await QRCode.toString(qr,{type:"terminal"})
console.log(qrText)
}

if(connection === "open"){
console.log("OLIMAX 2.0 CONNECTÉ ✅")
}

if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

if(shouldReconnect){
console.log("Reconnexion...")
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

if(text.toLowerCase().includes("qui es tu")){
await sock.sendMessage(sender,{
text:"Je suis OLIMAX 2.0 🤖 un bot WhatsApp intelligent."
})
}

if(text.toLowerCase().includes("qui t'a créé")){
await sock.sendMessage(sender,{
text:`Je suis OLIMAX 2.0\nCréé par ${ownerName}\nContact : ${ownerNumber}`
})
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()