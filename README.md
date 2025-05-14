# SISMIQ 🌍

**Feel the Earth Before It Hits.**  
A real-time earthquake monitoring web app powered by live data.  
Tracks and visualizes seismic activity across Türkiye (TR) and nearby regions with user-defined zones.

![SISMIQ Logo](assets/sismiq_logo.png)

---

## 🌐 Live Demo
> GitHub Pages: [https://makalin.github.io/sismiq](https://makalin.github.io/sismiq)

---

## ⚙️ Features

- 🔴 Real-time data from [KOERI](http://www.koeri.boun.edu.tr/scripts/lst4.asp)
- 📍 Geolocation tracking (browser-based)
- 🗺️ Interactive earthquake map using Leaflet.js
- ✅ Custom "felt" quake reporting UI
- 🔐 Your private zones are hidden, but used for alerting

---

## 🚀 Tech Stack

| Layer        | Tech               |
|--------------|--------------------|
| Frontend     | HTML, CSS, Vanilla JS |
| Mapping      | Leaflet.js + OpenStreetMap |
| Earthquake Feed | Scraped + parsed live KOERI feed |
| Hosting      | GitHub Pages       |
| Privacy      | Local encrypted JSON for marked locations (not in repo) |

---

## 📁 Project Structure

```

sismiq/
├── index.html
├── style.css
├── app.js
├── assets/
│   └── sismiq\_banner\_dark.png
├── data/
│   └── quakes.json (auto-refreshed)
├── config/
│   └── myzones.enc.json (ignored)
├── README.md
└── .gitignore

```

---

## 🔐 Marked Location Privacy

Your tracked zones (e.g., home, work) are stored in:
```

config/myzones.enc.json

````
> 🔒 This file is encrypted locally and ignored by Git.  
> ❌ Never uploaded to the repository.

---

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/makalin/sismiq.git
cd sismiq

# Serve locally
npx serve .
````

---

## 📦 Deployment

Just push to the `main` branch and enable GitHub Pages from `/settings/pages`.

---

## 📜 License

MIT — feel free to fork, adapt, and improve.

---

## 🌍 Credits

* KOERI Earthquake Data: [http://www.koeri.boun.edu.tr](http://www.koeri.boun.edu.tr)
* Leaflet Maps: [https://leafletjs.com](https://leafletjs.com)
