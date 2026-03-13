import makeWASocket, {
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"
import qrcode from "qrcode-terminal"

const ownerName = "Olivier Mangila"
const ownerNumber = "+243981240435"
const botName = "OLIMAX-2.0"

async function startBot(){

console.log(`Démarrage de ${botName}...`)
console.log("Connexion à WhatsApp...")

const { state, saveCreds } = await useMultiFileAuthState("./session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
printQRInTerminal: false,
logger: pino({ level: "silent" })
})

sock.ev.on("connection.update", (update)=>{

const { connection, lastDisconnect, qr } = update

// QR CODE
if(qr){
console.log("SCAN CE QR AVEC WHATSAPP")
qrcode.generate(qr,{ small:true })
}

// CONNECTÉ
if(connection === "open"){
console.log(`${botName} CONNECTÉ ✅`)
}

// RECONNEXION
if(connection === "close"){

const shouldReconnect =
lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

if(shouldReconnect){
console.log("Reconnexion...")
startBot()
}else{
console.log("Connexion fermée.")
}

}

})

sock.ev.on("messages.upsert", async ({ messages })=>{

const msg = messages[0]
if(!msg.message) return

const sender = msg.key.remoteJid

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

const message = text.toLowerCase()

// QUI ES TU
if(message.includes("qui es tu")){
await sock.sendMessage(sender,{
text:`Je suis ${botName} 🤖\nUn bot WhatsApp intelligent.`
})
}

// QUI T'A CRÉÉ
if(message.includes("qui t'a créé") || message.includes("qui ta cree")){
await sock.sendMessage(sender,{
text:`Je suis ${botName}\nCréé par : ${ownerName}\nContact : ${ownerNumber}`
})
}

// MENU
if(message === ".menu"){
await sock.sendMessage(sender,{
text:
`🤖 ${botName}

Commandes :

.menu
qui es tu
qui t'a créé

Créateur : ${ownerName}`
})
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()