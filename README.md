# Tréninkový plán

Jednoduchá webová aplikace pro plánování tréninků na celý týden – Node.js + Express na backendu, čisté HTML/CSS/JS na frontendu.

## Spuštění

```bash
npm install
npm start
```

Aplikace poběží na [http://localhost:3100](http://localhost:3100) (port lze změnit proměnnou prostředí `PORT`).

## Přihlášení

Celá appka je za přihlášením – bez přihlášení tě server přesměruje na `/login`.

**Výchozí přihlašovací údaje:**

| | |
|---|---|
| Uživatelské jméno | `ekaterina` |
| Heslo | `Rozcvicka2026!` |
| Záchranný kód (pro obnovení hesla) | `TreninkovyPlan-obnova` |

⚠️ **Tohle jsou dočasné výchozí hodnoty – změň si je hned po prvním přihlášení** (viz níže). Nejsou nikde jinde v repozitáři utajené, takže dokud je nezměníš, kdokoliv se čtením tohohle README se může přihlásit.

**Změna hesla** (když ho znáš a chceš jiné) – po přihlášení klikni v hlavičce appky na 🔑, zadej současné a nové heslo.

**Zapomenuté heslo** – na přihlašovací stránce klikni na "🔑 Zapomenuté heslo?" a zadej **záchranný kód** (ne heslo!) – ten slouží jen k tomuto účelu a měl by být uložený jinde než v tomto souboru (např. u tebe v poznámkách, ne v gitu). Po zadání kódu si nastavíš nové heslo.

Přihlašovací jméno, heslo i záchranný kód jdou přepsat proměnnými prostředí `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_RESET_CODE` (viz sekce Docker níže) – to je nejlepší způsob, jak výchozí hodnoty změnit natrvalo v produkci, aniž bys je musela pamatovat jako "změněné heslo v appce" (byť obojí funguje zároveň – heslo změněné přes appku/reset kód má vždy přednost před `ADMIN_PASSWORD`, dokud se neodstraní `data/auth.json`).

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
│   ├── plan.json       # uložený plán (vzniká po prvním uložení, není v gitu)
│   └── auth.json        # heslo změněné přes appku/reset (vzniká při změně, není v gitu)
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

## Nasazení do produkce (Docker)

Aplikace je bezstavová (celý stav je jen jeden JSON soubor na disku) a nemá žádné závislosti na externí databázi, takže Docker obraz je jednoduchý – `node:20-alpine` + Express.

### Rychlý start přes docker-compose (doporučeno)

```bash
docker compose up -d --build
```

Appka poběží na `http://<adresa-serveru>:3100`. `docker-compose.yml` už má nastavené:

- **restart: unless-stopped** – po pádu nebo restartu serveru se kontejner sám znovu spustí,
- **pojmenovaný volume** `training_plan_data` připojený do `/app/data` – **data přežijí `docker compose down`, rebuild i update image**. Bez tohoto volume by se `data/plan.json` při každém přebuildování kontejneru smazal zpět na prázdnou výchozí šablonu.
- **HEALTHCHECK** (`GET /health`) – Docker/orchestrátor podle něj pozná, že kontejner skutečně běží a odpovídá, ne jen že proces existuje.

### Ruční build a spuštění (bez compose)

```bash
docker build -t training-plan .
docker run -d \
  --name training-plan \
  --restart unless-stopped \
  -p 3100:3100 \
  -v training_plan_data:/app/data \
  training-plan
```

`-v training_plan_data:/app/data` je tu to nejdůležitější – bez pojmenovaného volume (nebo bind mountu na hostitelský adresář) se při každém `docker run`/rebuildu ztratí uložený plán.

### Proměnné prostředí

| Proměnná | Výchozí | Význam |
|---|---|---|
| `PORT` | `3100` | Port, na kterém server poslouchá uvnitř kontejneru. Pokud ho měníš, uprav i `EXPOSE`/mapování portu. |
| `ADMIN_USERNAME` | `ekaterina` | Přihlašovací jméno. |
| `ADMIN_PASSWORD` | `Rozcvicka2026!` | Přihlašovací heslo – **změň před nasazením do produkce.** Pokud si heslo později změníš přes appku (🔑) nebo přes záchranný kód, uloží se do `data/auth.json` a od té chvíle má přednost před touhle proměnnou. |
| `ADMIN_RESET_CODE` | `TreninkovyPlan-obnova` | Záchranný kód pro obnovení zapomenutého hesla na `/login` → "Zapomenuté heslo?". **Změň ho na něco, co nikde jinde nepoužíváš** – kdokoliv tenhle kód zná, může nastavit nové přihlašovací heslo bez znalosti toho starého. |

`docker-compose.yml` má tyhle proměnné už vyplněné (stejnými výchozími hodnotami) – v produkci je tam rovnou přepiš na vlastní.

### Zálohování dat

Celý stav appky je jeden soubor, `data/plan.json` uvnitř volume `training_plan_data`. Zálohu uděláš např.:

```bash
docker run --rm -v training_plan_data:/data -v "$PWD":/backup alpine \
  cp /data/plan.json /backup/plan-backup-$(date +%F).json
```

a obnovíš stejně opačným směrem (`cp /backup/plan-backup-XXXX-XX-XX.json /data/plan.json`).

### Reverzní proxy a HTTPS

Server sám o sobě neřeší TLS. Na vlastním serveru appku typicky pustíš za reverzní proxy (nginx, Caddy, Traefik), která:

- terminuje HTTPS (např. přes Let's Encrypt),
- proxuje na `http://127.0.0.1:3100` (nebo na jméno kontejneru/service, pokud proxy běží ve stejné Docker síti).

Appka za proxy nepotřebuje žádnou speciální konfiguraci (žádné hardcoded absolutní URL, žádné WebSockety).

### ⚠️ Než appku pustíš na veřejně dostupnou adresu

Appka je celá za přihlášením (viz sekce Přihlášení výše), ale je dobré vědět, jak přesně to funguje, aby ses na tom nespálila:

- **Nezapomeň změnit výchozí heslo a záchranný kód** – přes proměnné prostředí (`ADMIN_PASSWORD`, `ADMIN_RESET_CODE` v `docker-compose.yml`) nebo přes appku po prvním přihlášení. Výchozí hodnoty jsou veřejně vidět v tomhle README/gitu.
- **Přihlášení je jen jeden účet, ne uživatelský systém** – hodí se pro "appka pro mě/rodinu", ne pro víc lidí s různými přístupovými právy.
- **Session jsou jen v paměti serveru** – při restartu kontejneru (update, redeploy, pád) se všichni odhlásí a musí se přihlásit znovu. To je normální, ne chyba.
- **`/health` zůstává bez přihlášení schválně** – kvůli Docker healthchecku; nevrací žádná data plánu, jen `ok`.
- I s přihlášením platí, že appka nemá HTTPS sama o sobě (viz sekce Reverzní proxy výše) – bez HTTPS jde přihlašovací heslo po síti nešifrovaně. Na veřejné adrese appku vždy pouštěj za HTTPS reverzní proxy.

### Chybějící kousky, na které je dobré myslet dopředu

- **Logrotate/log limit** – appka loguje jen krátkou zprávu při startu, žádné rotující logy navíc není potřeba řešit.
- **Limit velikosti requestu** je nastavený na 2 MB (`express.json({ limit: '2mb' })`) – pro čistě textový tréninkový plán víc než dost.
- **Žádné automatické zálohy** – volume přežije restart/update kontejneru, ale ne smazání volume (`docker volume rm`) ani zničení disku serveru. Pravidelná záloha (viz výše) je na tobě.
