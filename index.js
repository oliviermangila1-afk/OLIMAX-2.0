import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import express from "express"
import fetch from "node-fetch"
import QRCode from "qrcode"

const app = express()
const PORT = process.env.PORT || 8080

let qrCode = ""

// 🌐 PAGE WEB QR
app.get("/", async (req, res) => {
    if (!qrCode) {
        return res.send("⌛ Génération du QR code... actualise la page")
    }

    const qrImage = await QRCode.toDataURL(qrCode)

    res.send(`
    <html>
    <head>
        <title>OLIMAX BOT</title>
    </head>
    <body style="text-align:center;font-family:sans-serif;">
        <h1>🤖 OLIMAX BOT</h1>
        <p>Créé par OLIVIER MANGILA</p>
        <p>📞 +243981240435</p>
        <p>Scanne avec WhatsApp 👇</p>
        <img src="${qrImage}" />
    </body>
    </html>
    `)
})

app.listen(PORT, () => {
    console.log("🌍 Serveur actif sur le port " + PORT)
})

// 🤖 BOT
async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./session")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, qr, lastDisconnect } = update

        if (qr) {
            qrCode = qr
            console.log("📲 QR généré")
        }

        if (connection === "open") {
            console.log("✅ BOT CONNECTÉ")
            qrCode = ""
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log("🔄 Reconnexion...")

            if (shouldReconnect) {
                startBot()
            }
        }
    })

    // 💬 MESSAGES
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return

        const from = msg.key.remoteJid

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text

        if (!text) return

        console.log("💬 Message:", text)

        let reply = ""

        // 🔥 LOGIQUE INTELLIGENTE
        if (text.toLowerCase().includes("bonjour")) {
            reply = "👋 Salut ! Je suis OLIMAX 🤖\nComment puis-je t'aider ?"
        }
        else if (text.toLowerCase().includes("qui t'a créé")) {
            reply = "👤 J'ai été créé par *OLIVIER MANGILA*\n📞 Contact : +243981240435"
        }
        else if (text.toLowerCase().includes("numéro")) {
            reply = "📞 Mon créateur : +243981240435"
        }
        else {
            reply = `🤖 *OLIMAX PRO*\n\n👤 Créé par : OLIVIER MANGILA\n📞 +243981240435\n\n✨ Tu as dit : "${text}"\n\n💡 Je suis prêt à discuter avec toi 🚀`
        }

        await sock.sendMessage(from, { text: reply })
    })
}

startBot()