// Book Log — client-side only
// Data is stored in localStorage.

const STORAGE_KEY = "booklog_v1";

const els = {
  form: document.getElementById("bookForm"),
  title: document.getElementById("titleInput"),
  author: document.getElementById("authorInput"),
  genre: document.getElementById("genreInput"),
  status: document.getElementById("statusInput"),
  isbn: document.getElementById("isbnInput"),
  list: document.getElementById("bookList"),
  empty: document.getElementById("emptyState"),
  countText: document.getElementById("countText"),
  search: document.getElementById("searchInput"),
  filterStatus: document.getElementById("filterStatus"),
  sortBy: document.getElementById("sortBy"),
  clearBtn: document.getElementById("clearBtn"),
  seedBtn: document.getElementById("seedBtn"),
  toast: document.getElementById("toast"),
  soundToggle: document.getElementById("soundToggle"),
  confetti: document.getElementById("confetti"),
};

let books = loadBooks();

// ---------- Utilities ----------
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalize(s) {
  return (s || "").trim().toLowerCase();
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1600);
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function loadBooks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function coverUrl(isbn) {
  const clean = (isbn || "").replace(/[^0-9Xx]/g, "");
  if (!clean) return null;
  // Open Library covers:
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(clean)}-M.jpg`;
}

// ---------- Rendering ----------
function getVisibleBooks() {
  const q = normalize(els.search.value);
  const filter = els.filterStatus.value;
  const sort = els.sortBy.value;

  let arr = [...books];

  // filter by status
  if (filter !== "all") {
    arr = arr.filter(b => b.status === filter);
  }

  // search by title/author
  if (q) {
    arr = arr.filter(b =>
      normalize(b.title).includes(q) || normalize(b.author).includes(q)
    );
  }

  // sort
  arr.sort((a, b) => {
    switch (sort) {
      case "created-asc":
        return a.createdAt - b.createdAt;
      case "created-desc":
        return b.createdAt - a.createdAt;
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "author-asc":
        return a.author.localeCompare(b.author);
      case "rating-desc":
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  return arr;
}

function statusLabel(s) {
  if (s === "to-read") return "To Read";
  if (s === "reading") return "Reading";
  return "Completed";
}

function statusPillClass(s) {
  if (s === "completed") return "pill pill--ok";
  if (s === "reading") return "pill pill--warn";
  return "pill";
}

function makeStar(i, filled, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "star" + (filled ? " filled" : "");
  btn.title = `${i} star${i === 1 ? "" : "s"}`;
  btn.textContent = "★";
  btn.addEventListener("click", onClick);
  return btn;
}

function render() {
  const visible = getVisibleBooks();

  els.list.innerHTML = "";
  els.empty.style.display = visible.length ? "none" : "block";
  els.countText.textContent = `${visible.length} shown • ${books.length} total`;

  for (const b of visible) {
    const li = document.createElement("li");
    li.className = "card";

    // cover
    const cover = document.createElement("div");
    cover.className = "cover";

    const url = coverUrl(b.isbn);
    if (url) {
      const img = document.createElement("img");
      img.alt = `${b.title} cover`;
      img.src = url;
      img.onerror = () => {
        img.remove();
        cover.textContent = "No cover";
      };
      cover.appendChild(img);
    } else {
      cover.textContent = "No cover";
    }

    // meta
    const meta = document.createElement("div");
    meta.className = "meta";
    const h3 = document.createElement("h3");
    h3.textContent = b.title;

    const line2 = document.createElement("div");
    line2.className = "line2";
    line2.textContent = `${b.author} • ${b.genre}`;

    const tags = document.createElement("div");
    tags.className = "tags";

    const statusPill = document.createElement("span");
    statusPill.className = statusPillClass(b.status);
    statusPill.textContent = statusLabel(b.status);

    const ratingPill = document.createElement("span");
    ratingPill.className = "pill";
    ratingPill.textContent = `Rating: ${b.rating || 0}/5`;

    tags.append(statusPill, ratingPill);

    meta.append(h3, line2, tags);

    // tools
    const tools = document.createElement("div");
    tools.className = "tools";

    // status select
    const statusRow = document.createElement("div");
    statusRow.className = "row";
    const statusSel = document.createElement("select");
    statusSel.className = "small";
    statusSel.innerHTML = `
      <option value="to-read">To Read</option>
      <option value="reading">Reading</option>
      <option value="completed">Completed</option>
    `;
    statusSel.value = b.status;
    statusSel.addEventListener("change", () => updateStatus(b.id, statusSel.value));
    statusRow.append(statusSel);

    // stars
    const stars = document.createElement("div");
    stars.className = "stars";
    for (let i = 1; i <= 5; i++) {
      const filled = (b.rating || 0) >= i;
      stars.appendChild(makeStar(i, filled, () => setRating(b.id, i)));
    }

    // delete button
    const delRow = document.createElement("div");
    delRow.className = "row";
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn--danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteBook(b.id));
    delRow.append(delBtn);

    tools.append(statusRow, stars, delRow);

    li.append(cover, meta, tools);
    els.list.appendChild(li);
  }
}

// ---------- Actions ----------
function addBook({ title, author, genre, status, isbn }) {
  const book = {
    id: uid(),
    title: title.trim(),
    author: author.trim(),
    genre,
    status,
    isbn: (isbn || "").trim(),
    rating: 0,
    createdAt: Date.now(),
  };
  books.unshift(book);
  saveBooks();
  render();
  showToast("Added.");
}

function deleteBook(id) {
  const book = books.find(b => b.id === id);
  const ok = confirm(`Delete "${book?.title || "this book"}"?`);
  if (!ok) return;

  books = books.filter(b => b.id !== id);
  saveBooks();
  render();
  showToast("Deleted.");
}

function setRating(id, rating) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  book.rating = rating;
  saveBooks();
  render();
  showToast(`Rated ${rating}/5.`);
}

function updateStatus(id, status) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  const wasCompleted = book.status === "completed";
  book.status = status;
  saveBooks();
  render();

  if (!wasCompleted && status === "completed") {
    celebrate(book.title);
  } else {
    showToast("Status updated.");
  }
}

// ---------- Celebration (confetti + optional sound) ----------
function celebrate(title) {
  showToast(`Completed: ${title} 🎉`);
  runConfetti(1200);

  if (els.soundToggle.checked) {
    // tiny beep using Web Audio (no external files)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 660;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 140);
    } catch {
      // ignore if blocked
    }
  }
}

function runConfetti(durationMs) {
  const canvas = els.confetti;
  const ctx = canvas.getContext("2d");

  canvas.style.display = "block";
  resizeCanvas();

  const pieces = [];
  const n = 120;

  for (let i = 0; i < n; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 2.5 + Math.random() * 3.2,
      r: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      a: 1,
    });
  }

  const start = performance.now();

  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      // fade near end
      if (t > durationMs * 0.7) p.a = Math.max(0, 1 - (t - durationMs * 0.7) / (durationMs * 0.3));

      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
      ctx.restore();
    }

    if (t < durationMs) {
      requestAnimationFrame(frame);
    } else {
      canvas.style.display = "none";
    }
  }

  requestAnimationFrame(frame);
}

function resizeCanvas() {
  const canvas = els.confetti;
  canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
  canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener("resize", () => {
  if (els.confetti.style.display === "block") resizeCanvas();
});

// ---------- Events ----------
els.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = els.title.value;
  const author = els.author.value;
  const genre = els.genre.value;
  const status = els.status.value;
  const isbn = els.isbn.value;

  if (!title.trim() || !author.trim() || !genre || !status) return;

  addBook({ title, author, genre, status, isbn });

  els.form.reset();
  els.status.value = "to-read";
});

els.search.addEventListener("input", render);
els.filterStatus.addEventListener("change", render);
els.sortBy.addEventListener("change", render);

els.clearBtn.addEventListener("click", () => {
  if (!books.length) return;
  const ok = confirm("Clear ALL books? This cannot be undone.");
  if (!ok) return;
  books = [];
  saveBooks();
  render();
  showToast("Cleared.");
});

els.seedBtn.addEventListener("click", () => {
  const samples = [
    { title: "The Alchemist", author: "Paulo Coelho", genre: "Fiction", status: "to-read", isbn: "9780061122415" },
    { title: "Atomic Habits", author: "James Clear", genre: "Nonfiction", status: "reading", isbn: "9780735211292" },
    { title: "Dune", author: "Frank Herbert", genre: "Fantasy", status: "completed", isbn: "9780441013593" },
  ];
  for (const s of samples) addBook(s);
});

// Initial render
render();