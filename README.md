# Tréninkový plán

Jednoduchá webová aplikace pro plánování tréninků na celý týden – Node.js + Express na backendu, čisté HTML/CSS/JS na frontendu.

## Spuštění

```bash
npm install
npm start
```

Aplikace poběží na [http://localhost:3100](http://localhost:3100) (port lze změnit proměnnou prostředí `PORT`).

## Jak to funguje

Struktura je čtyřúrovňová: **cyklus → týden → den → sekce → cvik**.

- **Cyklus** představuje ucelený tréninkový blok (typicky ~12 týdnů), po kterém se jede podle jiného tréninku. Tlačítko `+ Nový cyklus` přidá nový cyklus a **automaticky srolá ty předchozí** – vidíš jen jejich název, ale kdykoliv je můžeš rozkliknout (▶ → ▼) a podívat se zpětně, co v nich bylo. Cyklus lze přejmenovat (např. "Cyklus 1 – Síla, 12 týdnů") a smazat tlačítkem `🗑 Cyklus` (musí zůstat aspoň jeden).
- **Týden** – uvnitř cyklu je lišta se záložkami (Týden 1, Týden 2, ...) a tlačítko `+ Nový týden`. Název týdne lze přepsat (např. "Týden 1, 12.–18. 8."). Týden lze smazat tlačítkem `🗑 Smazat týden` (musí zůstat aspoň jeden v cyklu).
- **Den** – týden má výchozí 7 dní (Pondělí–Neděle), ale dny lze libovolně **přidávat** (`+ Přidat den`) i **mazat** (`✕ Den`) – hodí se to třeba pro rozdělení na víc/míň tréninkových dní, než je klasický týden.
- **Sekce** – uvnitř dne si tlačítkem `+ Přidat sekci` přidáš libovolně pojmenovanou skupinu cviků (např. "Hlavní cviky", "Ramena", "Core", "Kardio" – názvy si voláš sám/sama, nic není přednastavené). Sekci lze smazat tlačítkem `✕ Sekce`.
- **Cvik** – uvnitř sekce se cviky přidávají a odebírají stejně jako doteď (`+ Přidat cvik` / `✕`). U každého lze zadat počet sérií, opakování a **plánovanou** váhu.
- Hned pod plánovaným řádkem je vždy vidět (žlutě odlišený) řádek **Realita** – série, opakování, skutečná váha a poznámka (např. "cítila jsem se silná, přidala jsem váhu i opakování"), aniž by se přepsal plán. Nic se nemusí rozbalovat, naplánovaná i skutečná hodnota jsou vidět naráz. Tlačítko `✕` u realitního řádku vše vymaže.
- Mazání dne/sekce, které už obsahují vyplněné údaje, se ptá na potvrzení; prázdné (právě přidané a nevyplněné) jde smazat rovnou.
- Tlačítko **Uložit plán** odešle aktuální stav (všechny cykly, týdny, dny, sekce i cviky) na server, který ho uloží do `data/plan.json`.
- Výchozí (prázdná) šablona s jedním cyklem a jedním týdnem je v `data/default.json` – použije se, dokud nebyl plán poprvé uložen. Starší formáty dat (z dřívějších verzí aplikace) se při načtení automaticky převedou na aktuální strukturu.

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
