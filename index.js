import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"
import pino from "pino"

const ownerNumber = "243XXXXXXXXX@s.whatsapp.net"

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
auth: state,
printQRInTerminal: true,
logger: pino({ level: "silent" })
})

sock.ev.on("connection.update", (update)=>{
const { connection } = update

if(connection === "open"){
console.log("OLIMAX-2.0 CONNECTÉ ✅")
}
})

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]
if(!msg.message) return

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text ||
""

const from = msg.key.remoteJid

// réponses automatiques

if(text.toLowerCase().includes("qui es tu")){
await sock.sendMessage(from,{
text:"Je suis OLIMAX-2.0 🤖 un bot WhatsApp créé pour automatiser les réponses."
})
}

if(text.toLowerCase().includes("qui t'a créé")){
await sock.sendMessage(from,{
text:"J'ai été créé par Olivier Mangila 💻 développeur passionné de technologie."
})
}

if(text.toLowerCase().includes("contact")){
await sock.sendMessage(from,{
text:"Voici le contact du créateur : +243981240435 📞"
})
}

if(text.toLowerCase().includes("olimax")){
await sock.sendMessage(from,{
text:"OLIMAX-2.0 est un bot WhatsApp intelligent développé en Node.js."
})
}

if(text.toLowerCase().includes("bonjour")){
await sock.sendMessage(from,{
text:"Bonjour 👋 je suis OLIMAX-2.0.\nComment puis-je vous aider ?"
})
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()