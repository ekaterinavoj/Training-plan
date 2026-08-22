# Tréninkový plán

Jednoduchá webová aplikace pro plánování tréninků na celý týden – Node.js + Express na backendu, čisté HTML/CSS/JS na frontendu.

## Spuštění

```bash
npm install
npm start
```

Aplikace poběží na [http://localhost:3100](http://localhost:3100) (port lze změnit proměnnou prostředí `PORT`).

## Dva režimy

Nahoře pod hlavičkou jsou dvě velká tlačítka:

- **👁 Zobrazit trénink** – výchozí režim po otevření appky. Slouží k tomu, když jedeš podle plánu: vybereš si cyklus / týden / den (pilulky nahoře) a vidíš čistý přehled dne – Rozcvička, Plán i Realita jsou tu čistě jako text, nic se needituje a nic se nerozbaluje. Tlačítko Uložit se v tomto režimu ani nezobrazuje, protože tu není co ukládat.
- **✏️ Upravit plán** – jediné místo, kde se cokoliv zadává a mění: tvorba/úprava plánu (cykly, týdny, dny, sekce, cviky) i zápis toho, jak trénink doopravdy proběhl (Realita). Sem se přepneš, když plán zakládáš, upravuješ, nebo si po tréninku zapisuješ realitu.

Tlačítko **Uložit plán** (vpravo nahoře, vidět jen v režimu Úprava) odešle aktuální stav na server.

## Jak to funguje (režim Úprava)

Struktura je čtyřúrovňová: **cyklus → týden → den → sekce → cvik**.

- **Cyklus** představuje ucelený tréninkový blok (typicky ~12 týdnů), po kterém se jede podle jiného tréninku. Tlačítko `+ Nový cyklus` přidá nový cyklus a **automaticky srolá ty předchozí** – vidíš jen jejich název, ale kdykoliv je můžeš rozkliknout (▶ → ▼) a podívat se zpětně, co v nich bylo. Cyklus lze přejmenovat (např. "Cyklus 1 – Síla, 12 týdnů") a smazat tlačítkem `🗑 Cyklus` (musí zůstat aspoň jeden).
- **Týden** – uvnitř cyklu je lišta se záložkami (Týden 1, Týden 2, ...) a tlačítko `+ Nový týden`. Název týdne lze přepsat (např. "Týden 1, 12.–18. 8."). Týden lze smazat tlačítkem `🗑 Smazat týden` (musí zůstat aspoň jeden v cyklu).
- **Den** – týden má výchozí 7 dní (Pondělí–Neděle), ale dny lze libovolně **přidávat** (`+ Přidat den`) i **mazat** (`✕ Den`) – hodí se to třeba pro rozdělení na víc/míň tréninkových dní, než je klasický týden.
- **Sekce** – uvnitř dne si tlačítkem `+ Přidat sekci` přidáš libovolně pojmenovanou skupinu cviků (např. "Hlavní cviky", "Ramena", "Core", "Kardio" – názvy si voláš sám/sama, nic není přednastavené). Sekci lze smazat tlačítkem `✕ Sekce`.
- **Cvik** – uvnitř sekce se cviky přidávají a odebírají stejně jako doteď (`+ Přidat cvik` / `✕`). Každý cvik má tři skupiny pod sebou, ve stejném pořadí v editoru i v Zobrazení:
  1. **Rozcvička** – volitelný seznam rozcvičovacích sérií pro tenhle konkrétní cvik. Každá série je vlastní řádek (série × opakování × váha), takže jde zapsat celý rozcvičovací žebřík (např. `1×20×20 kg`, `1×15×30 kg`, `1×10×40 kg`, `1×8×50 kg`) tlačítkem `+ Přidat sérii rozcvičky`, aniž by se cvik musel opakovat. Pokud u cviku není žádná vyplněná, v Zobrazení se vůbec nezobrazuje.
  2. **Plán** – stejným způsobem seznam pracovních sérií (`+ Přidat sérii`), např. tři řádky `1×5×60 kg` pro tři pracovní série s různou váhou/opakováním, pokud se liší. Rozcvička i Plán vypadají stejně (žádná ikonka, žádné barevné odlišení) – pozná se to jen podle nadpisu.
  3. **Realita** – zadává a upravuje se výhradně v režimu Úprava (série, opakování, skutečná váha a poznámka, např. "cítila jsem se silná, přidala jsem váhu i opakování"), aniž by se přepsal plán. V Zobrazení je vidět jen jako prostý červený text pod Plánem – a jen tehdy, když je něco vyplněné; jinak se nezobrazuje vůbec. Tlačítko `✕` u realitního řádku v editoru vše vymaže.
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
