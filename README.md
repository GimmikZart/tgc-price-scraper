# TGC Price Scraper

TGC Price Scraper è un'applicazione web che permette di confrontare i prezzi delle carte da gioco collezionabili (TCG) come One Piece Card Game, Magic, Pokèmon e altri. Il sistema si occupa automaticamente di raccogliere i dati da diversi store online e mostrarli in modo ordinato e filtrabile all'utente.

---

## 🚀 Stack Tecnologico

### Frontend

* **Nuxt 3** (Vue 3, Composition API)
* **Tailwind CSS** (stile generale)
* **Vuetify** (componenti pronti all'uso)
* **VueUse** (utility functions reactive)
* **GSAP** --da implementare (future animazioni)

### Backend & Database

* **Supabase** (PostgreSQL + Storage + Auth + Edge Functions)
* **Supabase CLI** per migrazioni e gestione locale

### Scraper e automazioni

* **Node.js** con **Puppeteer** per scraping headless
* Script cron schedulati (es. su Render o VPS)
* Broadcasting eventi live via API custom per debugging dello scraping

---

## 🔍 Funzionalità principali

* Confronto prezzi in tempo reale da più store
* Filtro per gioco, lingua, espansione e store
* Admin dashboard (WIP) per inserimento nuovi prodotti/store 
* Scraping automatico schedulato (cron job)

---

## 📅 Stato attuale

### Implementato:

* Area admin per inserimento nuovi dati
* Struttura database relazionale Supabase completa
* Scraper funzionante e connesso al DB
* Frontend Nuxt con visualizzazione prodotti e ordinamento
* Scraping automatico ogni notte dei prodotti presenti

### In sviluppo:

* Area user con login
* Area store con login e caricamento prodotti e offerte
* Sistema di preferiti (gioco/set/prodotto)
* Area request per users (gli utenti potranno richiedere nuovi negozi o prodotti tramite apposito form)
* Sistema di notifiche / email alert
* Sistema storicizzazione dei prezzi, con chart e statistiche
* Interfaccia mobile responsive più avanzata

---

## ⚖️ Struttura database (Supabase)

Tabelle principali:

* `games` - giochi disponibili (One Piece, Dragon Ball, Magic ecc.)
* `sets` - espansioni associate a ogni gioco
* `languages`, `currencies`, `categories` - metadata per filtraggio
* `stores` - negozi registrati con logo, link e selettori scraping
* `products` - singoli prodotti trovati
* `categories` - categorie dei prodotti (Booster box, Starter deck, action figures ecc)

---

## 📗 Come usare l'app

In questo momento l'app è provvisoriamente deployata e in fase di test presso:
https://tgc-price-scraper.onrender.com/


## 🌐 Deployment

* **Frontend + node.js + scraper:** [Render](https://render.com/).
* **Database:** [Supabase](https://supabase.com/)

---

## 🌟 Contributi futuri

* Supporto a nuove piattaforme (eBay, Subito, Vinted)
* Intelligenza artificiale per riconoscimento prodotti
* Analisi storico prezzi + grafici trend

---

## ✉️ Contatti

Creato da **Gianmarco Montanari**

Per info o segnalazioni: `giammont@live.it`

---

> Questo progetto è pensato sia per collezionisti che per rivenditori, offrendo una panoramica veloce e aggiornata del mercato TCG.
