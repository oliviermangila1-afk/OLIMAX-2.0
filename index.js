import makeWASocket, {
fetchLatestBaileysVersion,
useMultiFileAuthState
} from "@whiskeysockets/baileys"

import pino from "pino"
import qrcode from "qrcode-terminal"

const BOT_NAME = "OLIMAX-2.0"
const OWNER_NAME = "OLIVIER MANGILA"
const OWNER_NUMBER = "243981240435"

async function startBot(){

console.log("Démarrage du bot :", BOT_NAME)

const { state, saveCreds } = await useMultiFileAuthState("session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({ level: "silent" }),
browser: [BOT_NAME,"Chrome","1.0"]
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", (update)=>{

const { connection, qr } = update

if(qr){
console.log("Scanne ce QR avec WhatsApp")
qrcode.generate(qr,{small:true})
}

if(connection === "open"){
console.log("✅ Bot connecté à WhatsApp")
}

})

/* ===== REPONSES AUTOMATIQUES ===== */

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if(!msg.message) return

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if(!text) return

const message = text.toLowerCase()

if(message.includes("qui t'a créé") || message.includes("creator") || message.includes("owner")){

await sock.sendMessage(msg.key.remoteJid,{
text: `🤖 Je suis *${BOT_NAME}*

👨‍💻 Créé par : *${OWNER_NAME}*

📞 Si vous voulez la même IA ou un bot WhatsApp, contactez-le :

${OWNER_NUMBER}`
})

}

})

}

startBot()