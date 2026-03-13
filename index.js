import makeWASocket, {
DisconnectReason,
useMultiFileAuthState
} from "@whiskeysockets/baileys"

import pino from "pino"

async function startBot() {

console.log("Démarrage de OLIMAX-2.0...")
console.log("Connexion à WhatsApp...")

const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
logger: pino({ level: "silent" }),
auth: state,
browser: ["OLIMAX", "Chrome", "1.0"]
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", async (update) => {

const { connection, lastDisconnect } = update

if (connection === "close") {

const shouldReconnect =
(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut)

console.log("Reconnexion...")

if (shouldReconnect) {
startBot()
}

}

if (connection === "open") {
console.log("OLIMAX-2.0 connecté à WhatsApp")
}

})

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if (!msg.message) return

const text =
msg.message.conversation ||
msg.message.extendedTextMessage?.text

const from = msg.key.remoteJid

if (!text) return

const message = text.toLowerCase()

// réponses automatiques

if (message.includes("qui t'a créé")) {

await sock.sendMessage(from, {
text:
"J'ai été créé par OLIVIER MANGILA KASONGO. Un passionné de technologie et développeur du projet OLIMAX-2.0."
})

}

else if (message.includes("qui es tu")) {

await sock.sendMessage(from, {
text:
"Je suis OLIMAX-2.0, un assistant WhatsApp intelligent développé par OLIVIER MANGILA KASONGO."
})

}

else if (message.includes("numéro")) {

await sock.sendMessage(from, {
text:
"Le créateur du bot est OLIVIER MANGILA KASONGO. Contact WhatsApp disponible via ce numéro."
})

}

else if (message.includes("olimax")) {

await sock.sendMessage(from, {
text:
"OLIMAX-2.0 est un bot WhatsApp développé pour automatiser les réponses et fournir des informations intelligentes."
})

}

})

}

startBot()