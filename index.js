import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"
import pino from "pino"
import QRCode from "qrcode"

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
auth: state,
logger: pino({ level: "silent" })
})

sock.ev.on("connection.update", async (update) => {

const { qr, connection } = update

if (qr) {
console.log("SCAN QR CODE:")
console.log(await QRCode.toString(qr,{type:"terminal"}))
}

if (connection === "open") {
console.log("BOT CONNECTÉ ✅")
}

})

sock.ev.on("creds.update", saveCreds)

}

startBot()