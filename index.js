import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys"
import pino from "pino"

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
logger: pino({ level: "silent" }),
auth: state,
printQRInTerminal: true
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", (update) => {

const { connection, lastDisconnect } = update

if (connection === "close") {

const shouldReconnect =
(lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut

if (shouldReconnect) {
startBot()
}

} else if (connection === "open") {

console.log("OLIMAX 2.0 BOT ACTIF 🚀")

}

})

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if (!msg.message) return

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

if (text === "ping") {

await sock.sendMessage(msg.key.remoteJid, {
text: "pong 🟢 OLIMAX actif"
})

}

})

}

startBot()