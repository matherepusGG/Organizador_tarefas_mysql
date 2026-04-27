const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "2mb" }));

const DATA_PATH = path.resolve(__dirname, "notes.json");

if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, "[]", "utf-8");
}

function readNotes() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function saveNotes(notes) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(notes, null, 2), "utf-8");
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/local-image", (req, res) => {
  try {
    const rawPath = req.query.path;

    if (!rawPath) {
      return res.status(400).send("Caminho da imagem não informado.");
    }

    const imgPath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(__dirname, rawPath);

    if (!fs.existsSync(imgPath)) {
      return res.status(404).send("Imagem não encontrada.");
    }

    const stat = fs.statSync(imgPath);
    if (!stat.isFile()) {
      return res.status(400).send("O caminho informado não é um arquivo.");
    }

    const ext = path.extname(imgPath).toLowerCase();
    const mimeMap = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".svg": "image/svg+xml"
    };

    res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
    res.sendFile(imgPath);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao carregar imagem.");
  }
});

app.get("/api/notes", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  let notes = readNotes();

  if (q) {
    notes = notes.filter(n =>
      (n.title || "").toLowerCase().includes(q) ||
      (n.tag || "").toLowerCase().includes(q) ||
      (n.body || "").toLowerCase().includes(q)
    );
  }

  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(notes);
});

app.post("/api/notes", (req, res) => {
  const { title, tag, body } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Título obrigatório" });
  }

  const notes = readNotes();
  const now = Date.now();

  const note = {
    id: uid(),
    title,
    tag: tag || "GERAL",
    body: body || "",
    createdAt: now,
    updatedAt: now
  };

  notes.push(note);
  saveNotes(notes);

  res.json(note);
});

app.put("/api/notes/:id", (req, res) => {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Não encontrado" });
  }

  notes[index] = {
    ...notes[index],
    ...req.body,
    updatedAt: Date.now()
  };

  saveNotes(notes);
  res.json(notes[index]);
});

app.delete("/api/notes/:id", (req, res) => {
  const notes = readNotes();
  const filtered = notes.filter(n => n.id !== req.params.id);

  saveNotes(filtered);
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log("✅ Rodando em http://localhost:" + PORT);
  console.log("💾 Salvando em:", DATA_PATH);
});
