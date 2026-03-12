import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import pino from "pino"

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
auth: state,
printQRInTerminal: true,
logger: pino({ level: "silent" })
})

sock.ev.on("connection.update", (update) => {

const { connection, lastDisconnect } = update

if(connection === "open"){
console.log("BOT CONNECTÉ ✅")
}

if(connection === "close"){
const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
if(shouldReconnect){
startBot()
}
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()