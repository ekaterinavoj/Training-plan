# Tréninkový plán

Jednoduchá webová aplikace pro plánování tréninků na celý týden – Node.js + Express na backendu, čisté HTML/CSS/JS na frontendu.

## Spuštění

```bash
npm install
npm start
```

Aplikace poběží na [http://localhost:3100](http://localhost:3100) (port lze změnit proměnnou prostředí `PORT`).

## Jak to funguje

- Týden je rozdělený na 7 dní, každý den má vlastní zaměření (např. "Nohy", "Záda") a seznam cviků.
- U každého cviku lze zadat počet sérií, opakování a váhu/poznámku.
- Cviky lze přidávat a odebírat tlačítky `+ Přidat cvik` / `✕`.
- Tlačítko **Uložit plán** odešle aktuální stav na server, který ho uloží do `data/plan.json`.
- Výchozí (prázdná) šablona je v `data/default.json` – použije se, dokud nebyl plán poprvé uložen.

## Struktura projektu

```
training-plan/
├── data/
│   ├── default.json   # výchozí šablona týdne
│   └── plan.json       # uložený plán (vzniká po prvním uložení, není v gitu)
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
└── package.json
```
