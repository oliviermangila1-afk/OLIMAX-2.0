import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import pino from "pino"
import express from "express"
import axios from "axios"
import fs from "fs"

/* ================= CONFIG ================= */

const API_KEY = process.env.OPENROUTER_API_KEY

/* ================= EXPRESS (RAILWAY FIX) ================= */

const app = express()

const PORT = process.env.PORT || 8080

app.get("/", (req, res) => {
  res.send("OLIMAX 2.0 est actif 🚀")
})

app.listen(PORT, () => {
  console.log("🌍 Serveur lancé sur le port " + PORT)
})

/* ================= IA ================= */

async function askAI(chatId, message) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Tu es OLIMAX 2.0, une IA avancée créée par Olivier MANGILA."
          },
          {
            role: "user",
            content: message
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000 // évite blocage Railway
      }
    )

    return response.data.choices[0].message.content

  } catch (error) {
    console.log("❌ Erreur OpenRouter :", error.message)
    return "Erreur IA temporaire ⚠️"
  }
}

/* ================= WHATSAPP ================= */

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut

      console.log("❌ Connexion fermée")

      if (shouldReconnect) {
        console.log("🔄 Reconnexion...")
        startBot()
      } else {
        console.log("🚪 Déconnecté définitivement")
      }
    }

    if (connection === "open") {
      console.log("✅ OLIMAX 2.0 connecté 🚀")
    }
  })

  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages[0]
      if (!msg.message) return
      if (msg.key.fromMe) return

      const chat = msg.key.remoteJid
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text

      if (!text) return

      console.log("📩 Message :", text)

      const reply = await askAI(chat, text)

      await sock.sendMessage(chat, { text: reply })

    } catch (err) {
      console.log("⚠️ Erreur message :", err)
    }
  })
}

/* ================= LANCEMENT ================= */

startBot()

/* ================= PROTECTION ANTI CRASH ================= */

process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception :", err)
})

process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection :", err)
})