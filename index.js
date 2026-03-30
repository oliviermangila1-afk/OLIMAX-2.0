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

    /* ====== SÉCURITÉ AJOUTÉE ICI ====== */

    if (!response.data?.choices?.length) {
      console.log("Réponse vide OpenRouter:", response.data)
      return "⚠️ Le service IA ne répond pas pour le moment."
    }

    const reply = response.data.choices[0].message.content

    memory[userId].push({ role: "user", content: text })
    memory[userId].push({ role: "assistant", content: reply })
    saveMemory()

    return reply

  } catch (error) {
    console.log("Erreur OpenRouter:", error.response?.data || error.message)
    return "⚠️ Petite instabilité réseau, réessaie dans quelques secondes."
  }
}