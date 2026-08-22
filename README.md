# Tréninkový plán

Jednoduchá webová aplikace pro plánování tréninků na celý týden – Node.js + Express na backendu, čisté HTML/CSS/JS na frontendu.

## Spuštění

```bash
npm install
npm start
```

Aplikace poběží na [http://localhost:3100](http://localhost:3100) (port lze změnit proměnnou prostředí `PORT`).

## Jak to funguje

- Plán je rozdělený na **týdny** – nahoře je lišta se záložkami (Týden 1, Týden 2, ...) a tlačítko `+ Nový týden`. Název týdne lze přepsat (např. "Týden 1, 12.–18. 8.").
- Každý týden má 7 dní, každý den má vlastní zaměření (např. "Nohy", "Záda") a seznam cviků.
- U každého cviku lze zadat počet sérií, opakování a **plánovanou** váhu.
- Tlačítkem **📝 Realita** u cviku jde navíc zapsat, jak trénink proběhl doopravdy – **skutečná váha** a **poznámka** (např. "cítila jsem se silná, přidala jsem váhu"), aniž by se přepsal plán. Naplánovaná i skutečná hodnota tak zůstanou vedle sebe.
- Cviky lze přidávat a odebírat tlačítky `+ Přidat cvik` / `✕`, celý týden lze smazat tlačítkem `🗑 Smazat týden` (musí zůstat aspoň jeden).
- Tlačítko **Uložit plán** odešle aktuální stav (všechny týdny) na server, který ho uloží do `data/plan.json`.
- Výchozí (prázdná) šablona s jedním týdnem je v `data/default.json` – použije se, dokud nebyl plán poprvé uložen.

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
