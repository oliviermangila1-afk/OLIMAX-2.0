import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"
import express from "express"
import QRCode from "qrcode"
import P from "pino"

const app = express()
const PORT = process.env.PORT || 8080

let qrCodeData = null
let isConnected = false

app.get("/", async (req, res) => {
    if (!qrCodeData && !isConnected) {
        return res.send("⏳ Génération du QR... recharge dans 5 sec")
    }

    if (isConnected) {
        return res.send("✅ BOT CONNECTÉ - OLIMAX ACTIF 24H/24")
    }

    const qrImage = await QRCode.toDataURL(qrCodeData)

    res.send(`
    <html>
    <body style="text-align:center;font-family:sans-serif;">
        <h1>🤖 OLIMAX BOT</h1>
        <p>Créé par OLIVIER MANGILA</p>
        <p>📞 +243981240435</p>
        <img src="${qrImage}" />
        <p>Scanne avec WhatsApp</p>
    </body>
    </html>
    `)
})

app.listen(PORT, () => {
    console.log("🌐 Serveur actif sur port", PORT)
})

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: P({ level: "silent" })
    })

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update

        if (qr) {
            qrCodeData = qr
            console.log("🔥 QR DISPONIBLE SUR LE SITE")
        }

        if (connection === "open") {
            isConnected = true
            qrCodeData = null
            console.log("✅ CONNECTÉ À WHATSAPP")
        }

        if (connection === "close") {
            console.log("❌ Déconnecté - PAS de reconnexion auto")
        }
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text

        if (text === "menu") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "🤖 OLIMAX BOT actif\nTape bonjour"
            })
        }

        if (text === "bonjour") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "👋 Salut, je suis OLIMAX BOT"
            })
        }
    })
}

startBot()