import makeWASocket,{
useMultiFileAuthState,
DisconnectReason
} from "@whiskeysockets/baileys"

import pino from "pino"
import qrcode from "qrcode-terminal"

async function startBot(){

console.log("Démarrage de OLIMAX-2.0...")
console.log("Connexion à WhatsApp...")

const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
auth: state,
logger: pino({ level: "silent" }),
browser: ["OLIMAX-2.0","Chrome","1.0"]
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", (update)=>{

const { connection, qr, lastDisconnect } = update

if(qr){
console.log("Scanne ce QR avec WhatsApp :")
qrcode.generate(qr,{small:true})
}

if(connection === "open"){
console.log("OLIMAX-2.0 connecté à WhatsApp")
}

if(connection === "close"){

const shouldReconnect =
(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut)

if(shouldReconnect){
console.log("Reconnexion...")
startBot()
}

}

})

}

startBot()