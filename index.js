import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import express from "express"
import QRCode from "qrcode"
import P from "pino"

const app = express()
const PORT = process.env.PORT || 8080

let qrCodeData = ""

// PAGE WEB QR
app.get("/", async (req, res) => {
    if (!qrCodeData) {
        return res.send("⏳ QR non disponible... attends")
    }

    const qrImage = await QRCode.toDataURL(qrCodeData)

    res.send(`
    <html>
    <head>
        <title>OLIMAX BOT</title>
    </head>
    <body style="text-align:center; font-family:sans-serif;">
        <h1>🤖 OLIMAX BOT</h1>
        <p>Créé par <b>OLIVIER MANGILA</b></p>
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
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            qrCodeData = qr
            console.log("✅ QR généré (ouvre ton lien Railway)")
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode

            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconnexion...")
                startBot()
            } else {
                console.log("❌ Session expirée, supprime /session")
            }
        } else if (connection === "open") {
            console.log("✅ BOT CONNECTÉ")
        }
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]

        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text

        if (!text) return

        if (text.toLowerCase() === "menu") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `
🤖 OLIMAX BOT

👤 Créateur: OLIVIER MANGILA
📞 Contact: +243981240435

Commandes:
- menu
- bonjour
- info
                `
            })
        }

        if (text.toLowerCase() === "bonjour") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "👋 Bonjour ! Bienvenue sur OLIMAX BOT"
            })
        }

        if (text.toLowerCase() === "info") {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `
🤖 OLIMAX BOT v4

Créé par: OLIVIER MANGILA
WhatsApp: +243981240435
Statut: Actif 24h/24 🚀
                `
            })
        }
    })
}

startBot()