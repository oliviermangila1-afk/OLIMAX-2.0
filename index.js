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

/* ================= ANTI SPAM ================= */

let processing = new Set()

/* ================= IA TEXTE ================= */

async function askAI(userId, text) {
  try {

    if (!memory[userId]) memory[userId] = []

    const lower = text.toLowerCase()
// Fuseau horaire Afrique/Kinshasa
const timeZone = "Africa/Kinshasa"
const now = new Date()

// Heure intelligente
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

// Date intelligente
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

👨‍💻 J’ai été créé par : *Olivier MANGILA*

✨ Développeur spécialisé en Intelligence Artificielle,
Automatisation WhatsApp et intégration API avancée.

🚀 Architecte principal de OLIMAX.

📞 Contact WhatsApp : 243981240435`
    }

    const systemPrompt = `
Tu es OLIMAX 🤖🔥
Créateur UNIQUE : Olivier MANGILA.

Réponses intelligentes, structurées et professionnelles.
Utilise des emojis pertinents.
Si math → Résolution étape par étape.
Si science → Explication + solution.
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
    console.log(error.response?.data || error.message)
    return "⚠️ Petite instabilité réseau, réessaie dans quelques secondes."
  }
}

/* ================= IMAGE ================= */

async function analyzeImage(buffer) {
  try {

    const base64Image = buffer.toString("base64")

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse cette image intelligemment et donne une réponse structurée." },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    return response.data.choices[0].message.content

  } catch (err) {
    console.log(err)
    return "⚠️ Erreur analyse image."
  }
}

/* ================= TRANSCRIPTION VOCAL ================= */

async function transcribeAudio(buffer) {
  try {

    const form = new FormData()

    form.append("file", buffer, {
      filename: "audio.ogg",
      contentType: "audio/ogg"
    })

    form.append("model", "openai/whisper-1")

    const response = await axios.post(
      "https://openrouter.ai/api/v1/audio/transcriptions",
      form,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...form.getHeaders()
        },
        timeout: 30000
      }
    )

    return response.data.text

  } catch (err) {
    console.log("Erreur transcription:", err.response?.data || err.message)
    return null
  }
}

/* ================= TEXT TO SPEECH ================= */

async function textToSpeech(text) {
  try {

    const response = await axios.post(
      "https://openrouter.ai/api/v1/audio/speech",
      {
        model: "openai/tts-1",
        voice: "alloy",
        input: text
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    )

    return Buffer.from(response.data)

  } catch (err) {
    console.log(err)
    return null
  }
}

/* ================= BOT ================= */

async function startBot() {

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
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    }

    if (connection === "open") {
      console.log("✅ OLIMAX 2.0 connecté 🚀")
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

      if (msg.message.imageMessage) {
        const buffer = await downloadMediaMessage(msg, "buffer", {})
        const reply = await analyzeImage(buffer)
        await sock.sendMessage(chat, { text: reply })
        processing.delete(chat)
        return
      }

      if (msg.message.audioMessage) {
        const buffer = await downloadMediaMessage(msg, "buffer", {})
        const transcript = await transcribeAudio(buffer)

        if (!transcript) {
          await sock.sendMessage(chat, { text: "⚠️ Impossible de comprendre le vocal." })
          processing.delete(chat)
          return
        }

        const reply = await askAI(chat, transcript)
        const audioReply = await textToSpeech(reply)

        if (audioReply) {
          await sock.sendMessage(chat, {
            audio: audioReply,
            mimetype: "audio/mpeg",
            ptt: true
          })
        } else {
          await sock.sendMessage(chat, { text: reply })
        }

        processing.delete(chat)
        return
      }

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption

      if (!text) {
        processing.delete(chat)
        return
      }

      const reply = await askAI(chat, text)
      await sock.sendMessage(chat, { text: reply })

      processing.delete(chat)

    } catch (err) {
      console.log(err)
      processing.delete(chat)
    }

  })
}

startBot()