import makeWASocket,{
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"

const botName = "OLIMAX-2.0"
const ownerName = "Olivier Mangila"
const ownerNumber = "243981240435"

async function startBot(){

console.log(`Démarrage de ${botName}...`)
console.log("Connexion à WhatsApp...")

const { state, saveCreds } = await useMultiFileAuthState("./session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({ level:"silent" })
})

sock.ev.on("connection.update", async(update)=>{

const { connection, lastDisconnect } = update

if(connection === "open"){
console.log(`${botName} CONNECTÉ ✅`)
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

if(!sock.authState.creds.registered){

const code = await sock.requestPairingCode(ownerNumber)

console.log("CODE DE CONNEXION WHATSAPP : ", code)

}

sock.ev.on("messages.upsert", async({ messages })=>{

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
text:`Je suis ${botName} 🤖

Un bot WhatsApp intelligent créé pour automatiser des tâches et répondre aux utilisateurs.

Créateur : ${ownerName}
Contact : ${ownerNumber}`
})
}

// QUI T'A CRÉÉ
if(message.includes("qui t'a créé") || message.includes("qui ta cree")){
await sock.sendMessage(sender,{
text:`Je suis ${botName}

Créé par : ${ownerName}
Numéro : ${ownerNumber}`
})
}

// MENU
if(message === ".menu"){
await sock.sendMessage(sender,{
text:`🤖 ${botName}

Commandes disponibles :

.menu
qui es tu
qui t'a créé

Créateur : ${ownerName}
Contact : ${ownerNumber}`
})
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()