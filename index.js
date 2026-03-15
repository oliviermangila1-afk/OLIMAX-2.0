import makeWASocket, {
fetchLatestBaileysVersion,
useMultiFileAuthState
} from "@whiskeysockets/baileys"

import pino from "pino"

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

if(!sock.authState.creds.registered){

const phoneNumber = "243981240435"

const code = await sock.requestPairingCode(phoneNumber)

console.log("CODE DE CONNEXION :", code)

}

sock.ev.on("connection.update",(update)=>{

const { connection } = update

if(connection === "open"){
console.log("✅ Bot connecté à WhatsApp")
}

})

}

startBot()