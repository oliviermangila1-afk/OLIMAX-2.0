import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} from "@whiskeysockets/baileys"

import pino from "pino"
import express from "express"
import axios from "axios"
import qrcode from "qrcode-terminal"
import fs from "fs"
import FormData from "form-data"

/* ================= CONFIG ================= */
const API_KEY = process.env.API_KEY
const BOT_NAME = "OLIMAX 2.0"
const OWNER_NAME = "Olivier MANGILA"
const OWNER_NUMBER = "243981240435"
const MEMORY_FILE = "./memory.json"

/* ================= MEMOIRE ================= */

let memory = {}

if (fs.existsSync(MEMORY_FILE)) {
  try {
    memory = JSON.parse(fs.readFileSync(MEMORY_FILE))
  } catch {
    memory = {}
  }
}

function saveMemory() {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2))
}

/* ================= SERVEUR ================= */

const app = express()
app.get("/", (req, res) => res.send("🤖 OLIMAX 2.0 ACTIF 🚀"))

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("🌍 Serveur lancé sur le port " + PORT)
})

/* ================= KEEP ALIVE RAILWAY ================= */

// Empêche Railway d’endormir le service
setInterval(async () => {
  try {
    await axios.get(`http://localhost:${PORT}`)
    console.log("🔄 Keep alive ping")
  } catch {}
}, 300000) // toutes les 5 minutes

/* ================= ANTI SPAM ================= */

let processing = new Set()

/* ================= IA TEXTE ================= */

async function askAI(userId, text) {
  try {

    if (!memory[userId]) memory[userId] = []

    const lower = text.toLowerCase()
    const timeZone = "Africa/Kinshasa"
    const now = new Date()

    if (lower.includes("heure")) {
      const heure = now.toLocaleTimeString("fr-FR", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit"
      })

      const hourNumber = parseInt(
        now.toLocaleTimeString("fr-FR", { timeZone, hour: "2-digit", hour12: false })
      )

      let moment = "Bonsoir 🌙"
      if (hourNumber >= 5 && hourNumber < 12) moment = "Bonjour ☀️"
      else if (hourNumber >= 12 && hourNumber < 18) moment = "Bon après-midi 🌤"

      return `${moment} 😊\n🕒 Il est actuellement ${heure} (heure de Kinshasa 🇨🇩)`
    }

    if (lower.includes("quel jour") || lower.includes("date")) {
      const date = now.toLocaleDateString("fr-FR", {
        timeZone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })

      return `📅 Nous sommes le ${date} (Kinshasa 🇨🇩)`
    }

    if (
      lower.includes("qui t'a créé") ||
      lower.includes("qui est ton créateur") ||
      lower.includes("qui t'a développé") ||
      lower.includes("qui t'a conçu")
    ) {
      return `🤖 *OLIMAX*

👨‍💻 Créé par : *Olivier MANGILA*

📞 WhatsApp : 243981240435`
    }

    const systemPrompt = `
Tu es OLIMAX 🤖🔥
Créateur UNIQUE : Olivier MANGILA.
Réponses intelligentes, structurées et professionnelles.
`

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          ...memory[userId],
          { role: "user", content: text }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 40000
      }
    )

    const reply = response.data.choices[0].message.content

    memory[userId].push({ role: "user", content: text })
    memory[userId].push({ role: "assistant", content: reply })
    saveMemory()

    return reply

  } catch (error) {
    console.log("Erreur IA:", error.response?.data || error.message)
    return "⚠️ Petite instabilité réseau, réessaie."
  }
}

/* ================= BOT ================= */

let isConnecting = false

async function startBot() {

  if (isConnecting) return
  isConnecting = true

  const { state, saveCreds } = await useMultiFileAuthState("session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: [BOT_NAME, "Chrome", "1.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {

    if (qr) {
      console.log("📱 Scan le QR code :")
      qrcode.generate(qr, { small: true })
    }

    if (connection === "close") {

      const statusCode = lastDisconnect?.error?.output?.statusCode
      console.log("❌ Connexion fermée :", statusCode)

      isConnecting = false

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("🔒 Déconnecté définitivement.")
        return
      }

      console.log("🔄 Reconnexion dans 5 secondes...")
      setTimeout(() => startBot(), 5000)
    }

    if (connection === "open") {
      console.log("✅ OLIMAX 2.0 connecté 🚀")
      isConnecting = false
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {

    if (type !== "notify") return

    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    if (msg.key.remoteJid === "status@broadcast") return

    const chat = msg.key.remoteJid
    if (processing.has(chat)) return
    processing.add(chat)

    try {

      await sock.sendPresenceUpdate("composing", chat)

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption

      if (!text) return

      const reply = await askAI(chat, text)
      await sock.sendMessage(chat, { text: reply })

    } catch (err) {
      console.log("Erreur message:", err)
    } finally {
      processing.delete(chat)
    }
  })
}

startBot()

/* ================= ANTI CRASH GLOBAL ================= */

process.on("uncaughtException", err => {
  console.error("Uncaught Exception:", err)
})

process.on("unhandledRejection", err => {
  console.error("Unhandled Rejection:", err)
})