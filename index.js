import makeWASocket,{
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"

const ownerNumber = "243XXXXXXXXX" // ton numéro

async function startBot(){

console.log("Démarrage de OLIMAX-2.0...")
console.log("Connexion à WhatsApp...")

const { state, saveCreds } = await useMultiFileAuthState("session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: pino({ level: "silent" }),
browser: ["OLIMAX-2.0","Chrome","1.0"]
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", async(update)=>{

const { connection, lastDisconnect } = update

if(connection === "open"){
console.log("OLIMAX-2.0 connecté à WhatsApp")
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

// génération du code de connexion
if(!sock.authState.creds.registered){

const code = await sock.requestPairingCode(ownerNumber)

console.log("CODE WHATSAPP :", code)

}

}

startBot()