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
| Uživatelské jméno | `trainer936499` |
| Heslo | `SilaHubnuti-26x!` |
| Záchranný kód (pro obnovení hesla) | `ObnovaHesla-9427-Trenink` |

⚠️ **Tohle jsou dočasné výchozí hodnoty – změň si je hned po prvním přihlášení** (viz níže). Nejsou nikde jinde v repozitáři utajené, takže dokud je nezměníš, kdokoliv se čtením tohohle README se může přihlásit.

**Změna hesla** (když ho znáš a chceš jiné) – po přihlášení klikni v hlavičce appky na 🔑, zadej současné a nové heslo.

**Zapomenuté heslo** – na přihlašovací stránce klikni na "🔑 Zapomenuté heslo?" a zadej **záchranný kód** (ne heslo!) – ten slouží jen k tomuto účelu a měl by být uložený jinde než v tomto souboru (např. u tebe v poznámkách, ne v gitu). Po zadání kódu si nastavíš nové heslo.

Přihlašovací jméno, heslo i záchranný kód jdou přepsat proměnnými prostředí `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_RESET_CODE` (viz sekce Docker níže) – to je nejlepší způsob, jak výchozí hodnoty změnit natrvalo v produkci, aniž bys je musela pamatovat jako "změněné heslo v appce" (byť obojí funguje zároveň – heslo změněné přes appku/reset kód má vždy přednost před `ADMIN_PASSWORD`, dokud se neodstraní `data/auth.json`).

## Dva režimy

Nahoře pod hlavičkou jsou dvě velká tlačítka:

- **👁 Zobrazit trénink** – výchozí režim po otevření appky. Slouží k tomu, když jedeš podle plánu: vybereš si cyklus / týden / den (pilulky nahoře) a vidíš čistý přehled dne – Rozcvička, Plán i Realita jsou tu čistě jako text, nic se needituje a nic se nerozbaluje. Tlačítko Uložit se v tomto režimu ani nezobrazuje, protože tu není co ukládat.
- **✏️ Upravit plán** – jediné místo, kde se cokoliv zadává a mění: tvorba/úprava plánu (cykly, týdny, dny, sekce, cviky) i zápis toho, jak trénink doopravdy proběhl (Realita). Sem se přepneš, když plán zakládáš, upravuješ, nebo si po tréninku zapisuješ realitu.

V režimu Úprava se **ukládá automaticky** – každá změna (psaní, přidání/smazání/přesun cviku...) se sama uloží ~1 sekundu po tom, co přestaneš psát/klikat. Vedle hlavičky vidíš stav ("Ukládání…" / "✓ Uloženo"). Tlačítko **Uložit plán** zůstává pro jistotu jako ruční záloha, ale běžně ho nepotřebuješ mačkat.

Vedle těch dvou tlačítek je v hlavičce ještě ikonka **👤** – otevře **Profil a maxima** (výška/váha, jednotky, historie maximálních vah, šablony – viz níž). Není to třetí rovnocenný režim, spíš přehled/nastavení nad plánem: klikni na ikonku znovu (nebo přepni na Zobrazit/Upravit) a vrátíš se tam, kde jsi skončil/a.

## Jak to funguje (režim Úprava)

Struktura je čtyřúrovňová: **cyklus → týden → den → sekce → cvik**.

- **Cyklus** představuje ucelený tréninkový blok (typicky ~12 týdnů), po kterém se jede podle jiného tréninku. Tlačítko `+ Nový cyklus` přidá nový cyklus a **automaticky srolá ty předchozí** – vidíš jen jejich název, ale kdykoliv je můžeš rozkliknout (▶ → ▼) a podívat se zpětně, co v nich bylo. Cyklus lze přejmenovat (např. "Cyklus 1 – Síla, 12 týdnů") a smazat tlačítkem `🗑 Cyklus` (musí zůstat aspoň jeden).
- **Týden** – uvnitř cyklu je lišta se záložkami (Týden 1, Týden 2, ...) a dvě tlačítka:
  - `+ Nový prázdný týden` – založí týden úplně od nuly.
  - `📋 Duplikovat týden` – zkopíruje **celý aktuální týden** (dny, sekce, cviky, série, váhy) do nového týdne. Hodí se to na to, co bývá běžné: trénink zůstává stejný, mění se hlavně váhy – zkopíruješ týden a jen upravíš čísla. Realita (co bylo odcvičeno) se do kopie nepřenáší, ta se zapisuje znovu.

  Název týdne lze přepsat (např. "Týden 1, 12.–18. 8."). Týden lze smazat tlačítkem `🗑 Smazat týden` (musí zůstat aspoň jeden v cyklu).
- **Den** – týden má výchozí 7 dní (Pondělí–Neděle), ale dny lze libovolně **přidávat** (`+ Přidat den`) i **mazat** (`✕ Den`) – hodí se to třeba pro rozdělení na víc/míň tréninkových dní, než je klasický týden. Každý den má svou barvu (levý okraj karty + podbarvení jména dne), ať je při scrollování dlouhým týdnem hned jasné, kde jeden den končí a další začíná.
- **Sekce** – uvnitř dne si tlačítkem `+ Přidat sekci` přidáš libovolně pojmenovanou skupinu cviků (např. "Hlavní cviky", "Ramena", "Core", "Kardio" – názvy si voláš sám/sama, nic není přednastavené). Sekci lze smazat tlačítkem `✕ Sekce`.
- **Cvik** – uvnitř sekce se cviky přidávají a odebírají stejně jako doteď (`+ Přidat cvik` / `✕`).
  - Šipkami **▲ ▼** vedle jména cviku ho posuneš výš/níž v pořadí v rámci sekce.
  - Tlačítkem **🔗** (vedle jména cviku) spojíš cvik s **dalším cvikem pod ním** do superserie – oba se pak vizuálně spojí do jednoho přerušovaného rámečku, v Úpravě i v Zobrazení, ať je jasné, že jdou hned za sebou.
  - Každý cvik má tři skupiny pod sebou, ve stejném pořadí v editoru i v Zobrazení:
    1. **Rozcvička** – volitelný seznam rozcvičovacích sérií pro tenhle konkrétní cvik. Nad seznamem je malý popisek sloupců (Série / Opakování / Váha), pod ním pak vlastní řádky – jde tak zapsat celý rozcvičovací žebřík (např. `1×20×20 kg`, `1×15×30 kg`, `1×10×40 kg`, `1×8×50 kg`) tlačítkem `+ Přidat sérii rozcvičky`, aniž by se cvik musel opakovat. Pokud u cviku není žádná vyplněná, v Zobrazení se vůbec nezobrazuje.
    2. **Plán** – stejným způsobem seznam pracovních sérií (`+ Přidat sérii`), např. tři řádky `1×5×60 kg` pro tři pracovní série s různou váhou/opakováním, pokud se liší. Rozcvička i Plán vypadají stejně (žádná ikonka, žádné barevné odlišení) – pozná se to jen podle nadpisu. **Opakování** je teď volný text, ne jen číslo – klidně `8–10`, `30 s` nebo `AMRAP`, ne všude jde napsat pevné číslo. Do pole váhy stačí napsat číslo – jednotka (kg/lb podle Profilu, viz níž) se k němu automaticky přidá jako značka v poli, není potřeba ji psát ručně; u volného textu (rozsahy, "prázdná osa" apod.) se značka schová, aby se s textem nepletla. Vedle `+ Přidat sérii` je i tlačítko **⚡ Doplnit z maxima** – viz sekce Profil a maxima níž.
    3. **Realita** – zadává a upravuje se výhradně v režimu Úprava (série, opakování, skutečná váha a poznámka, např. "cítila jsem se silná, přidala jsem váhu i opakování"), aniž by se přepsal plán. V Zobrazení je vidět jen jako prostý červený text pod Plánem – a jen tehdy, když je něco vyplněné; jinak se nezobrazuje vůbec. Tlačítko `✕` u realitního řádku v editoru vše vymaže.
  - V **Zobrazení** je série/opakování/váha každého řádku vidět jako tři barevně odlišené "pilulky" (ne jeden splihlý text spojený tečkami), takže je na první pohled jasné, co je co. Každá série (Rozcvička i Plán) má navíc checkbox – odškrtneš ji, jakmile ji odcvičíš, a hned vidíš, kolik sérií máš za sebou a která je další na řadě. Odškrtávání je jen vizuální (nikam se neukládá) a resetne se při přechodu na jiný den nebo obnovení stránky.
- Mazání dne/sekce, které už obsahují vyplněné údaje, se ptá na potvrzení; prázdné (právě přidané a nevyplněné) jde smazat rovnou.
- Tlačítko **Uložit plán** odešle aktuální stav (všechny cykly, týdny, dny, sekce i cviky) na server, který ho uloží do `data/plan.json`.
- Výchozí (prázdná) šablona s jedním cyklem a jedním týdnem je v `data/default.json` – použije se, dokud nebyl plán poprvé uložen. Starší formáty dat (z dřívějších verzí aplikace) se při načtení automaticky převedou na aktuální strukturu.

## Profil, maximální váhy a šablony tréninků

Otevře se ikonkou **👤** v hlavičce. Tři karty:

- **Základní údaje** – výška, váha, a **jednotky vah** (kg / lb). Přepnutí jednotky se hned projeví u váhové značky ve všech polích (editor i tady) – nejde o přepočet starých čísel, jen o to, jaká jednotka se od teď automaticky nabízí.
- **Maximální váhy** – u každého cviku (dřep, bench, mrtvý tah...) si zapíšeš aktuální maximum. Není to jedno přepisované číslo – každý zápis zůstává v **historii**, takže je u cviku vidět poslední hodnota, trend oproti minulému záznamu (▲/▼) a po rozkliknutí "Historie (N)" celý vývoj v čase i s daty a poznámkami. Jednotlivé záznamy jde smazat tlačítkem ✕.
  - Tahle maxima se používají na dvou místech:
    1. Tlačítko **⚡ Doplnit z maxima** u každého cviku v editoru (vedle `+ Přidat sérii`) – když název cviku odpovídá nějakému zapsanému maximu, dopočítá váhu podle pravidla **60 % maxima v 1. týdnu cyklu, +2,5 kg každý další týden** (týden se pozná podle toho, na které záložce týdne zrovna jsi) a doplní ji do prázdných řádků Plánu. Hodí se to i bez šablony, když si trénink píšeš ručně.
    2. Šablony tréninků (viz níž) – ty počítají váhu ze stejného maxima podle procenta, které šablona předepisuje.
- **Šablony tréninků** – zatím prázdné, čeká se na databázi šablon (bude doplněna později). Až tam nějaká šablona bude, objeví se tu jako karta s tlačítkem **⚡ Vygenerovat trénink**, které vytvoří nový cyklus s váhami dopočítanými z maxim výše.

  Formát `data/templates.json` (soubor je gitignored, protože jde o osobní data stejně jako plán):
  ```json
  {
    "templates": [
      {
        "id": "libovolné-id",
        "label": "Název šablony (např. Síla 8 týdnů)",
        "description": "Volitelný krátký popis, zobrazí se pod názvem.",
        "cycle": {
          "label": "Název cyklu, který šablona vytvoří",
          "weeks": [
            {
              "label": "Týden 1",
              "days": [
                {
                  "name": "Pondělí",
                  "focus": "Volitelná poznámka ke dni",
                  "sections": [
                    {
                      "name": "Hlavní cviky",
                      "exercises": [
                        {
                          "name": "Zadní dřep",
                          "warmup": [{ "sets": 1, "reps": "8", "weight": "prázdná osa" }],
                          "plan": [{ "sets": 3, "reps": "5", "weight": "60%" }]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  }
  ```
  `cycle` má úplně stejnou strukturu jako cyklus v `data/plan.json` (týdny → dny → sekce → cviky → `warmup`/`plan` řádky), akorát pole **`weight`** může být místo pevné hodnoty i **procento maxima** zapsané jako text končící `%` (např. `"60%"`, `"75 %"`) – při generování se dopočítá z posledního zapsaného maxima pro cvik se stejným **`name`** (musí se shodovat přesně) a zaokrouhlí na 2,5 kg/lb. Pokud maximum pro daný cvik chybí, pole zůstane prázdné a appka po vygenerování upozorní, u kterých cviků je potřeba váhu doplnit ručně. Statický text (např. `"prázdná osa"`, `"vlastní váha"`) se propíše beze změny.

## Export a import CSV

V režimu Úprava jsou nahoře vedle `+ Nový cyklus` dvě tlačítka:

- **⬇️ Export CSV** – stáhne **celý** aktuální trénink (všechny cykly, týdny, dny, sekce, cviky, rozcvičku, plán i Realitu) jako jeden `.csv` soubor, čitelný a upravitelný v Excelu/Google Sheets (oddělovač `;`, kódování UTF-8, jde tedy rovnou otevřít i s českými znaky).
- **⬆️ Import CSV** – nahraje trénink zpátky ze souboru ve stejném formátu. **Import nahradí celý aktuální trénink** (appka se před tím zeptá na potvrzení) – hodí se to jako záloha/obnova, přesun mezi zařízeními, nebo hromadná úprava v Excelu (např. přepsání vah pro celý týden najednou) s následným zpětným nahráním.

Export i import jsou tedy vzájemné – co appka vyexportuje, to i sama zpátky bezezbytku naimportuje (obousměrně, včetně diakritiky, čárek/středníků v poznámkách i víceřádkových poznámek). Každý řádek CSV odpovídá jedné sérii (rozcvička nebo plán) a nese s sebou celý "rodokmen" (Cyklus/Tyden/Den/Sekce/Cvik) jako sloupce – prázdné dny/sekce/cviky beze všech sérií dostanou vlastní řádek jen s vyplněným rodokmenem, ať se při zpětném importu neztratí. Jediné omezení: pokud je ve stejné sekci **dvakrát za sebou cvik se stejným názvem**, import je sloučí do jednoho (v praxi se to skoro neděje).

## Struktura projektu

```
training-plan/
├── data/
│   ├── default.json     # výchozí šablona týdne
│   ├── plan.json        # uložený plán (vzniká po prvním uložení, není v gitu)
│   ├── auth.json        # heslo změněné přes appku/reset (vzniká při změně, není v gitu)
│   ├── profile.json     # výška/váha/jednotky + historie maxim (vzniká při prvním uložení, není v gitu)
│   └── templates.json   # databáze šablon tréninků (doplníš později, není v gitu)
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
- **bind mount** `./data:/app/data` – kontejner čte a zapisuje přímo do složky `data/` na hostitelském disku (tam, odkud appku spouštíš), takže vidí tvůj skutečný `data/plan.json` a `docker compose down`/rebuild/update image ho nijak neovlivní. (Pozn.: dřív tu byl pojmenovaný Docker volume – ten při prvním spuštění vznikne prázdný a neobsahuje tvá už uložená data, takže appka běžela s prázdnou výchozí šablonou, dokud jsi ho ručně nenaplnila. Bind mount na `./data` tenhle krok navíc nepotřebuje.)
- **HEALTHCHECK** (`GET /health` na `127.0.0.1`, ne na `localhost`) – Docker/orchestrátor podle něj pozná, že kontejner skutečně běží a odpovídá, ne jen že proces existuje. (`localhost` uvnitř kontejneru se občas přeloží na IPv6 `::1`, na kterém server neposlouchá – proto vždy `127.0.0.1`.)

### Ruční build a spuštění (bez compose)

```bash
docker build -t training-plan .
docker run -d \
  --name training-plan \
  --restart unless-stopped \
  -p 3100:3100 \
  -v "$(pwd)/data:/app/data" \
  training-plan
```

`-v "$(pwd)/data:/app/data"` je tu to nejdůležitější – bez bind mountu (nebo aspoň pojmenovaného volume) na hostitelský adresář se při každém `docker run`/rebuildu ztratí uložený plán, a s prázdným pojmenovaným volume appka navíc nastartuje s prázdnou šablonou místo tvých dat.

### Proměnné prostředí

| Proměnná | Výchozí | Význam |
|---|---|---|
| `PORT` | `3100` | Port, na kterém server poslouchá uvnitř kontejneru. Pokud ho měníš, uprav i `EXPOSE`/mapování portu. |
| `ADMIN_USERNAME` | `trainer936499` | Přihlašovací jméno. |
| `ADMIN_PASSWORD` | `SilaHubnuti-26x!` | Přihlašovací heslo – **změň před nasazením do produkce.** Pokud si heslo později změníš přes appku (🔑) nebo přes záchranný kód, uloží se do `data/auth.json` a od té chvíle má přednost před touhle proměnnou. |
| `ADMIN_RESET_CODE` | `ObnovaHesla-9427-Trenink` | Záchranný kód pro obnovení zapomenutého hesla na `/login` → "Zapomenuté heslo?". **Změň ho na něco, co nikde jinde nepoužíváš** – kdokoliv tenhle kód zná, může nastavit nové přihlašovací heslo bez znalosti toho starého. |

`docker-compose.yml` má tyhle proměnné už vyplněné (stejnými výchozími hodnotami) – v produkci je tam rovnou přepiš na vlastní.

### Zálohování dat

Celý stav appky je jeden soubor, `data/plan.json`, přímo ve složce `data/` vedle `docker-compose.yml` (díky bind mountu). Zálohu uděláš úplně obyčejným zkopírováním, žádný Docker příkaz není potřeba:

```bash
cp data/plan.json data/plan-backup-$(date +%F).json
```

a obnovíš stejně opačným směrem (`cp data/plan-backup-XXXX-XX-XX.json data/plan.json`). (`data/*backup*` je v `.gitignore`/`.dockerignore`, takže si takhle pojmenované zálohy klidně nech přímo ve složce.)

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
