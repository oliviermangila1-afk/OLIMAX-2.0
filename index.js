import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    downloadContentFromMessage
} from "@whiskeysockets/baileys"

import express from "express"
import fetch from "node-fetch"
import QRCode from "qrcode"
import { Sticker } from "wa-sticker-formatter"

const app = express()
const PORT = process.env.PORT || 8080

let qrCodeImage = ""

// PAGE WEB POUR QR
app.get("/", (req, res) => {
    if (qrCodeImage) {
        res.send(`<h2>Scanner le QR WhatsApp</h2><img src="${qrCodeImage}" />`)
    } else {
        res.send("🤖 OLIMAX BOT ACTIF")
    }
})

app.listen(PORT, () => {
    console.log("🚀 Serveur actif sur le port", PORT)
})

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on("connection.update", async (update) => {

        const { connection, qr, lastDisconnect } = update

        if (qr) {
            console.log("📱 QR généré")
            qrCodeImage = await QRCode.toDataURL(qr)
        }

        if (connection === "open") {
            console.log("✅ WhatsApp connecté")
            qrCodeImage = ""
        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log("⚠️ Déconnexion...")

            if (shouldReconnect) {
                startBot()
            }
        }
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async (m) => {

        const msg = m.messages[0]

        if (!msg.message) return
        if (msg.key.fromMe) return

        const from = msg.key.remoteJid

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            ""

        console.log("📩 Message:", text)

        // =========================
        // 🎭 STICKER COMMAND
        // =========================
        if (text === "sticker") {
            const sticker = new Sticker(
                "https://i.imgur.com/6w5hQ8T.png",
                {
                    pack: "OLIMAX",
                    author: "Bot",
                    type: "full"
                }
            )

            const buffer = await sticker.toBuffer()

            await sock.sendMessage(from, { sticker: buffer })
            return
        }

        // =========================
        // 🖼️ IMAGE ANALYSIS
        // =========================
        if (msg.message.imageMessage) {

            const stream = await downloadContentFromMessage(
                msg.message.imageMessage,
                "image"
            )

            let buffer = Buffer.from([])

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }

            const base64Image = buffer.toString("base64")

            try {

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: "Décris cette image" },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:image/jpeg;base64,${base64Image}`
                                        }
                                    }
                                ]
                            }
                        ]
                    })
                })

                const data = await response.json()

                const reply =
                    data?.choices?.[0]?.message?.content ||
                    "🤖 Image non comprise."

                await sock.sendMessage(from, { text: reply })

            } catch (err) {
                console.log(err)
                await sock.sendMessage(from, { text: "⚠️ Erreur image." })
            }

            return
        }

        // =========================
        // 🤖 IA TEXTE
        // =========================
        if (text) {

            try {

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-4o-mini",
                        messages: [
                            {
                                role: "system",
                                content: "Tu es OLIMAX, un assistant intelligent comme ChatGPT. Réponds clairement avec des emojis."
                            },
                            {
                                role: "user",
                                content: text
                            }
                        ]
                    })
                })

                const data = await response.json()

                let reply = data?.choices?.[0]?.message?.content

                if (!reply) {
                    reply = "🤖 Désolé, je n'ai pas compris."
                }

                await sock.sendMessage(from, { text: reply })

            } catch (error) {

                console.log("Erreur API", error)

                await sock.sendMessage(from, {
                    text: "⚠️ Erreur serveur OLIMAX."
                })
            }
        }

    })
}

startBot()