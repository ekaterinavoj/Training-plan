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

**Změna hesla** (když ho znáš a chceš jiné) – po přihlášení klikni v hlavičce appky na **Heslo**, zadej současné a nové heslo. Funguje pro každého přihlášeného, na svůj vlastní účet.

**Zapomenuté heslo** jde změnit dvěma způsoby, oba přes stejný **záchranný kód** (společný pro všechny účty, ne totéž co heslo):
- **Před přihlášením** – na přihlašovací stránce klikni na "🔑 Zapomenuté heslo?", zadej uživatelské jméno a záchranný kód.
- **Po přihlášení, pro sebe** – v **Profilu** dole je karta "Zapomenuté heslo (změna záchranným kódem)" – zadáš tam jen kód a nové heslo (jméno se doplní samo, vždy jde jen o tvůj vlastní účet).

Záchranný kód by měl být uložený jinde než v tomhle souboru (např. u tebe v poznámkách, ne v gitu).

Přihlašovací jméno hlavního účtu, jeho heslo i záchranný kód jdou přepsat proměnnými prostředí `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_RESET_CODE` (viz sekce Docker níže) – to je nejlepší způsob, jak výchozí hodnoty změnit natrvalo v produkci, aniž bys je musela pamatovat jako "změněné heslo v appce" (byť obojí funguje zároveň – heslo změněné přes appku/reset kód má vždy přednost před `ADMIN_PASSWORD`, dokud se neodstraní `data/users.json`).

## Víc uživatelů (samostatné účty)

Appka umí víc než jeden účet – hodí se, když ji chce používat i někdo další (partner/ka, kamarád/ka). Každý účet má **vlastní trénink i profil** (samostatná data, jeden druhého nevidí ani nepřepíše), ale **stejné šablony a doplňky** (ty jsou sdílené pro všechny, viz [Profil, maximální váhy a šablony tréninků](#profil-maximální-váhy-a-šablony-tréninků)) – takže nový člověk má hned po založení účtu k dispozici všech 15 šablon stejně jako ty.

**Přístup je jednosměrný – jen hlavní účet vidí a spravuje ostatní.** Tlačítko **Uživatelé** v hlavičce se zobrazí jen tobě (hlavnímu účtu); ostatní uživatelé ho vůbec nevidí a o sobě navzájem nevědí – neuvidí seznam jmen, nemůžou založit další účet ani sáhnout na cizí heslo (appka to hlídá i na serveru, ne jen schováním tlačítka).

**Založení nového účtu** – po přihlášení klikni v hlavičce na **Uživatelé**, vyplň nové uživatelské jméno (jen písmena bez diakritiky, čísla, tečka, pomlčka, podtržítko) a heslo. Účet je hned aktivní, nový člověk se s ním může rovnou přihlásit na `/login`. Odsud appku i nasdílíš – stačí poslat adresu (`http://<tvoje-IP-nebo-doména>:3100`) a přihlašovací údaje, které jsi právě založila.

Ve stejném okně vidíš i seznam existujících účtů (hlavní účet má štítek "Hlavní účet") a u každého tlačítko **nastavit heslo** – jako hlavní účet můžeš **kdykoli nastavit nové heslo komukoli** (bez znalosti jeho současného), pro případ že si někdo zapomene heslo i záchranný kód. Kterýkoli uživatel navíc může sám měnit svoje vlastní heslo běžně (**Heslo** v hlavičce) i záchranným kódem (karta v **Profilu**, viz [Přihlášení](#přihlášení) výše) – nepotřebuje k tomu tebe.

Appka zatím neumí účty mazat přes rozhraní – kdybys chtěla nějaký odebrat, napiš mi, uděláme to napřímo v `data/users.json` (a smažeme jeho `data/plan-<jméno>.json`/`data/profile-<jméno>.json`).

Technicky: hlavní účet (ten, co appka měla odjakživa) dál používá stejné soubory jako dřív – `data/plan.json` a `data/profile.json` – takže upgrade na víc uživatelů nijak nenarušil existující data. Každý další účet dostane vlastní `data/plan-<jméno>.json` a `data/profile-<jméno>.json` (založí se automaticky při prvním uložení). Všechny tyhle soubory jsou gitignored stejně jako dřív – žádná osobní data žádného účtu se necommitují.

**Hesla se v `data/users.json` ukládají hashovaná** (scrypt + náhodná sůl na uživatele; vestavěné v Node, žádná externí závislost), ne jako prostý text. Starší `data/users.json` (appka před touhle úpravou) mělo heslo ještě čitelné přímo v souboru – appka to pozná a při nejbližším úspěšném přihlášení (nebo změně hesla) ho potichu přehashuje, takže není potřeba nic ručně migrovat.

## Dva režimy

Nahoře pod hlavičkou jsou dvě velká tlačítka:

- **👁 Zobrazit trénink** – výchozí režim po otevření appky. Slouží k tomu, když jedeš podle plánu: vybereš si cyklus / týden / den (pilulky nahoře) a vidíš čistý přehled dne – Rozcvička, Plán i Realita jsou tu čistě jako text, nic se needituje a nic se nerozbaluje. Tlačítko Uložit se v tomto režimu ani nezobrazuje, protože tu není co ukládat.
- **✏️ Upravit plán** – jediné místo, kde se cokoliv zadává a mění: tvorba/úprava plánu (cykly, týdny, dny, sekce, cviky) i zápis toho, jak trénink doopravdy proběhl (Realita). Sem se přepneš, když plán zakládáš, upravuješ, nebo si po tréninku zapisuješ realitu.

V režimu Úprava se **ukládá automaticky** – každá změna (psaní, přidání/smazání/přesun cviku...) se sama uloží ~1 sekundu po tom, co přestaneš psát/klikat. Vedle hlavičky vidíš stav ("Ukládání…" / "✓ Uloženo"). Tlačítko **Uložit plán** zůstává pro jistotu jako ruční záloha, ale běžně ho nepotřebuješ mačkat.

Vedle těch dvou tlačítek je v hlavičce ještě tlačítko **Profil** – otevře **Profil a maxima** (výška/váha, jednotky, historie maximálních vah, šablony – viz níž). Není to třetí rovnocenný režim, spíš přehled/nastavení nad plánem: klikni na tlačítko znovu (nebo přepni na Zobrazit/Upravit) a vrátíš se tam, kde jsi skončil/a.

Tlačítko **Uživatelé** vedle něj otevře správu uživatelů – viz [Víc uživatelů](#víc-uživatelů-samostatné-účty) výš (vidí ho jen hlavní účet). Poslední dvě tlačítka jsou **Heslo** (změna vlastního hesla) a **Odhlásit**.

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
    2. **Plán** – stejným způsobem seznam pracovních sérií (`+ Přidat sérii`), např. tři řádky `1×5×60 kg` pro tři pracovní série s různou váhou/opakováním, pokud se liší. Rozcvička i Plán vypadají stejně (žádná ikonka, žádné barevné odlišení) – pozná se to jen podle nadpisu. **Opakování** je teď volný text, ne jen číslo – klidně `8–10`, `30 s` nebo `AMRAP`, ne všude jde napsat pevné číslo. Do pole váhy stačí napsat číslo – jednotka (kg/lb podle Profilu, viz níž) se k němu automaticky přidá jako značka v poli, není potřeba ji psát ručně; u volného textu (rozsahy, "prázdná osa" apod.) se značka schová, aby se s textem nepletla. Vedle `+ Přidat sérii` je i tlačítko **⚡ Doplnit z maxima** – viz sekce Profil a maxima níž. Pod sériemi je ještě volitelná **poznámka k plánu** (v šedomodrém rámečku, kurzívou), na cíl/techniku/RIR apod. (např. "Cíl 75–80 % 1RM, RIR 2–3") – v Zobrazení se ukáže rovnou pod Plánem, ne pod Realitou (je to komentář k tomu, co *máš* dělat, ne k tomu, co se doopravdy stalo).
    3. **Realita** – zadává a upravuje se výhradně v režimu Úprava (série, opakování, skutečná váha a **poznámka k realitě**, např. "cítila jsem se silná, přidala jsem váhu i opakování"), aniž by se přepsal plán. Má vlastní pole odděleně od poznámky k plánu výš – ať nejde splést, co je cíl/instrukce a co skutečný zápis po tréninku. V Zobrazení je vidět jen jako prostý červený text pod Plánem (a pod poznámkou k plánu, pokud tam nějaká je) – a jen tehdy, když je něco vyplněné; jinak se nezobrazuje vůbec. Tlačítko `✕` u realitního řádku v editoru vše vymaže (poznámku k plánu nechá být, ta se maže zvlášť).
  - V **Zobrazení** je série/opakování/váha každého řádku vidět jako tři barevně odlišené "pilulky" (ne jeden splihlý text spojený tečkami), takže je na první pohled jasné, co je co. Každá série (Rozcvička i Plán) má navíc checkbox – odškrtneš ji, jakmile ji odcvičíš, a hned vidíš, kolik sérií máš za sebou a která je další na řadě. Odškrtávání je jen vizuální (nikam se neukládá) a resetne se při přechodu na jiný den nebo obnovení stránky.
- Mazání dne/sekce, které už obsahují vyplněné údaje, se ptá na potvrzení; prázdné (právě přidané a nevyplněné) jde smazat rovnou.
- Tlačítko **Uložit plán** odešle aktuální stav (všechny cykly, týdny, dny, sekce i cviky) na server, který ho uloží do `data/plan.json`.
- Výchozí (prázdná) šablona s jedním cyklem a jedním týdnem je v `data/default.json` – použije se, dokud nebyl plán poprvé uložen. Starší formáty dat (z dřívějších verzí aplikace) se při načtení automaticky převedou na aktuální strukturu.

## Profil, maximální váhy a šablony tréninků

Otevře se tlačítkem **Profil** v hlavičce. Karty:

- **Základní údaje** – výška, váha, **jednotky vah** (kg / lb), **tréninková zkušenost** (začátečník / středně pokročilý / pokročilý) a **tréninkové dny v týdnu**. Jednotka se hned projeví u váhové značky ve všech polích (editor i tady) – nejde o přepočet starých čísel, jen o to, jaká jednotka se od teď automaticky nabízí. Zkušenost a dny v týdnu se nikam jinam nepromítají než do doporučení u šablon níž (žádné pole není povinné).
- **Maximální váhy** – u každého cviku (dřep, bench, mrtvý tah...) si zapíšeš aktuální maximum. Není to jedno přepisované číslo – každý zápis zůstává v **historii**, takže je u cviku vidět poslední hodnota, trend oproti minulému záznamu (▲/▼) a po rozkliknutí "Historie (N)" celý vývoj v čase i s daty a poznámkami. Jednotlivé záznamy jde smazat tlačítkem ✕.
  - Tahle maxima se používají na dvou místech:
    1. Tlačítko **⚡ Doplnit z maxima** u každého cviku v editoru (vedle `+ Přidat sérii`) – když název cviku odpovídá nějakému zapsanému maximu, dopočítá váhu podle pravidla **60 % maxima v 1. týdnu cyklu, +2,5 kg každý další týden** (týden se pozná podle toho, na které záložce týdne zrovna jsi) a doplní ji do prázdných řádků Plánu. Hodí se to i bez šablony, když si trénink píšeš ručně.
    2. Šablony tréninků (viz níž) – ty počítají váhu ze stejného maxima podle procenta, které šablona předepisuje.
- **Šablony tréninků** – appka se dodává s **15 hotovými, výzkumem podloženými protokoly** (viz níž), každý jako karta se štítky úrovně/frekvence (zeleně zvýrazněné, pokud sedí k tomu, co máš vyplněné v Základních údajích výše, plus štítek "✓ sedí ti", když sedí obojí), krátkým popisem, zdrojem a tlačítkem **⚡ Vygenerovat trénink**, které vytvoří nový cyklus s váhami dopočítanými z maxim výše (a upozorní, pokud pro nějaký hlavní cvik maximum ještě nemáš).

  ### Dodávané protokoly (`data/templates.json`)

  | Šablona | Úroveň | Dní/týden | Princip |
  |---|---|---|---|
  | **Nováček – lineární progrese** | začátečník | 3× | Váha u hlavních cviků stoupá každý týden o pevný krok (60→70 % 1RM za 4 týdny). |
  | **Lineární periodizace – síla** | středně pokročilý | 4× | Klasický blokový model: opakování klesají, % 1RM stoupá (4×8@65 % → 3×3@82,5 %), 5. týden deload/test. Horní/dolní split. |
  | **Vlnitá (undulující) periodizace** | středně pokročilý | 3× | Intenzita/opakování se mění den ode dne (těžký/střední/lehký), ne jen týden od týdne. Celotělově, deload na konci bloku. |
  | **Autoregulace dle RIR** | pokročilý | 4× | Váhu u hlavního cviku volíš sama podle pocitu (RIR = kolik opakování bys ještě zvládla navíc), ne podle pevného procenta. RIR v bloku postupně klesá, pak deload. |
  | **5×5 (Heavy/Light/Medium)** | středně pokročilý | 3× | Klasický systém Billa Starra: stejné hlavní cviky 3×/týden s jinou intenzitou (těžký/lehký/střední den); těžký den se postupně mění z 5×5 na 5×3, jak síla roste. |
  | **Powerliftingový trénink (Wendler 5/3/1)** | středně pokročilý | 4× | Jeden hlavní cvik denně (dřep/bench/mrtvý tah/OHP), čtyřtýdenní vlny 5/5/5+ → 3/3/3+ → 5/3/1+ → deload, poslední série je AMRAP ("+"). Procenta už mají vestavěný polštář tréninkového maxima. |
  | **Silová vytrvalost** | (kterákoli) | 3× | Ne max. síla, ale víc opakování se střední zátěží (40–60 % 1RM, 15–20 opakování, pauzy do 90 s) — čtvrtý typ projevu síly vedle max. síly, výbušnosti a hypertrofie. |
  | **Push/Pull/Legs (PPL)** | středně pokročilý | 3× | Rozdělení podle pohybového vzoru (tlak/tah/nohy) — jeden ze dvou nejrozšířenějších splitů vedle Upper/Lower. Hlavní cvik dne na nižší opakování (síla), doplňky na víc opakování (hypertrofie). |
  | **Bloková periodizace** | pokročilý | 3× | Akumulace (objem, 3 týdny) → Transmutace (specifičtější varianty, 3 týdny) → Realizace (soutěžní cviky, 2 týdny) → Deload. Mezi fázemi se mění i výběr cviků (přední dřep → pauzovaný dřep → soutěžní dřep), ne jen váha. Pro pokročilé s konkrétním cílem/testem. |
  | **Upper/Lower (horní/dolní)** | středně pokročilý | 4× | Druhý z nejrozšířenějších splitů vedle PPL. Dva páry dnů — Horní A/Dolní A (síla, klesající opakování, rostoucí % 1RM) a Horní B/Dolní B (hypertrofie, víc opakování a objemu doplňků) — takže každá partie vyjde 2×/týden, jednou těžčí a jednou objemověji ("mix" modifikace). |
  | **Texas Method** | středně pokročilý | 3× | Na rozdíl od 5×5 (HLM) výš je tohle týdenní, ne denní rozdělení: pondělní Objemový den (5×5), středeční Regenerační den (lehce) a páteční Intenzivní den (1×5 na nový rekord, malý přírůstek každý týden). Dřep všechny 3 dny, mrtvý tah jen v pátek. |
  | **Powerlifting / „3-lift" split** | pokročilý | 3× | Čistě dřep/bench/mrtvý tah, žádný jiný cíl. Dřep a bench 2×/týden, mrtvý tah těžce jen 1× + samostatný den na jeho techniku lehce. Nízká opakování (2–5), vysoké % 1RM. Jiné rozvržení frekvence než Wendler 5/3/1. |
  | **Torso/Limbs ("bro split")** | středně pokročilý | 4× | Rozdělení podle části těla, ne pohybového vzoru — Torso (hrudník/záda/ramena) a Limbs (nohy/paže) jako T–L–T–L. Hypertrofický důraz (8–12 opakování), každá partie 1×/týdně s velkým objemem najednou. |
  | **Domácí trénink (vlastní váha)** | (kterákoli) | 3× | Celotělově, žádné vybavení potřeba. Princip: progrese k těžší variantě stejného cviku (klik → klik se zvednutýma nohama → klik na jedné ruce; dřep → bulharský dřep → pistol squat), ne přidávání zátěže na činku. |
  | **Circuit / kondiční trénink** | středně pokročilý | 3× | Síla a kondice zároveň — okruh 5 cviků (dřep/tlak/tah/hip hinge/core) provedený vcelku, pauza až po celém kole. Počet kol roste (3→5), pauzy se zkracují (90→60 s). Ne pro vrcholovou sílu (krátké pauzy), zato dobrá kombinace síly a kondice. |

  Zdroje, ze kterých protokoly vycházejí (každý je navíc vypsaný přímo u dané šablony v appce):
  - American College of Sports Medicine. [Progression Models in Resistance Training for Healthy Adults](https://pubmed.ncbi.nlm.nih.gov/19204579/) (2009 Position Stand) — doporučené rozsahy % 1RM a opakování podle úrovně zkušenosti i pro svalovou vytrvalost.
  - American College of Sports Medicine. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults ([2026 Position Stand](https://acsm.org/resistance-training-guidelines-update-2026/), první aktualizace od roku 2009, 137 systematických review, ~30 000 účastníků) — potvrzuje mj. ≥80 % 1RM pro sílu, 2–3 série, 2×/týden.
  - Rhea, M. R. a kol. [Comparison between linear and daily undulating periodized resistance training to increase strength](https://pubmed.ncbi.nlm.nih.gov/19910831/) (2002) a novější systematická review/meta-analýzy srovnávající lineární a vlnitou (DUP) periodizaci.
  - Zourdos, M. C. a kol. — zavedení RIR škály (reps-in-reserve) pro sílový trénink; autoregulační výzkum u vzpěračů/silových trojbojařů (Helms a kol.).
  - Princip nováčkovské lineární progrese (Starting Strength / novice linear progression literatura).
  - Bill Starr, *The Strongest Shall Survive* — systém Heavy/Light/Medium.
  - Jim Wendler, *5/3/1: The Simplest and Most Effective Training System for Raw Strength* — princip sdílí (nižší frekvence hlavního cviku, vysoká specifičnost) i s pokročilejšími powerliftingovými metodami jako Sheikův systém nebo Westside Barbell / conjugate metoda, které appka samostatně neimplementuje (jsou hodně specifické na výběr cvičebních variací a vybavení), ale stojí za zmínku, pokud bys chtěla jít touhle cestou dál.
  - Push/Pull/Legs a Bloková periodizace (akumulace → transmutace → realizace → deload, s délkami fází a chybami, kterým se vyhnout) vycházejí z **Perplexity Deep Research** reportu *"najdi v literatuře a oficiálních zdrojích všechny silové tréninky, co existují"* (2026) — konkrétní primární zdroje, ze kterých report v těchto pasážích čerpal, jsou vypsané přímo u obou šablon v `data/templates.json` (pole `source`): přehled konceptu blokové periodizace ([PMC4637911](https://pmc.ncbi.nlm.nih.gov/articles/PMC4637911/)), NSCA JSCR 2021 [Periodization and Block Periodization in Sports](https://journals.lww.com/nsca-jscr/Fulltext/2021/08000/Periodization_and_Block_Periodization_in_Sports_.39.aspx), srovnání blokové vs. lineární/vlnité periodizace ([PubMed 25807030](https://pubmed.ncbi.nlm.nih.gov/25807030/), [PubMed 35044672](https://pubmed.ncbi.nlm.nih.gov/35044672/)), vliv objemu a blízkosti selhání na hypertrofii nezávisle na modelu periodizace ([PMC7068252](https://pmc.ncbi.nlm.nih.gov/articles/PMC7068252/), [PMC10818109](https://pmc.ncbi.nlm.nih.gov/articles/PMC10818109/)) a frekvence 2×/týden na sval pro PPL ([Frontiers 2022](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.949021/full)) — viz i sekce [Teorie: jak se sestavuje trénink](#teorie-jak-se-sestavuje-trénink-shrnutí-z-literatury) níž pro širší kontext (WHO, ACSM 2026, NSCA, PubMed meta-analýzy).

  **Doplňky a pořadí cviků:** u všech 15 šablon platí, že hlavní (víceklubové) cviky jsou vždy před doplňky — v souladu s obecným doporučením NSCA řadit velké svalové skupiny/víceklubové cviky před malé svalové skupiny/jednoklubové cviky, dokud jsi ještě čerstvá a formu nezačíná kazit únava. Doplňky navíc běží **celým pracovním blokem** (ne jen první týden) a taktně mizí jen na deload/testovacím týdnu, kdy má mít přednost zotavení nebo čistý test hlavního cviku.

  U šablony Wendler 5/3/1 doplňky odpovídají tomu, co popisuje Wendlerova vlastní kniha — tlak/tah/core po každém hlavním cviku (dřív appka měla chybně pojmenovanou i jinak sestavenou sekci "Boring But Big", což je ve skutečnosti jiná, pokročilejší varianta assistance práce — opraveno). Protože ale 3 ze 4 hlavních cviků v 5/3/1 (dřep, bench, OHP) jsou tlakové a jen mrtvý tah je tahový, dny s tlakovým hlavním cvikem mají v doplňcích místo dalšího tlaku druhý tahový cvik — vychází to z doporučovaného poměru **cca 1:2 tlak:tah** pro zdraví ramen (nerovnováha zvyšuje riziko impingement syndromu). Zároveň byl počet sérií u doplňků snížen z původních 5 na 3 (dřív šlo o víc, než je u vedlejších cviků k hlavnímu tréninku obvyklé — 5 sérií je sice jedna z variant, kterou Wendler sám zmiňuje, ale při týdenní kumulaci přes víc dnů to snadno přeroste do zbytečně vysokého objemu).

  **Délka cyklu (kolik má mít týdnů):** mesocykly (ucelené tréninkové bloky) běžně trvají **3–6 týdnů**, přičemž poslední týden bloku bývá deload. 14 z 15 šablon (4–5 týdnů, s deloadem na konci u těch, které ho mají mít) do tohohle rozmezí spadá přímo — ověřeno, žádná neměla špatnou délku. Šablona Nováček deload záměrně nemá (u čisté nováčkovské progrese se dokud funguje, prostě pokračuje) a Wendler 5/3/1 má přesně 4 týdny, protože to je i v originále pevná délka jedné "vlny". Jediná výjimka je **Bloková periodizace** (9 týdnů) — ta je záměrně navazující sled kratších fází (Akumulace/Transmutace/Realizace/Deload), z nichž každá spadá do 3–6týdenního rozmezí zvlášť.

  **Rozdíly mezi ženami a muži:** aktuální evidence (např. [Frontiers 2023, systematické review](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1054542/full)) **nepodporuje**, že by se přístup k sílovému tréninku měl mezi ženami a muži zásadně lišit, ani že by šlo trénink smysluplně plánovat podle fáze menstruačního cyklu — důkazy pro to jsou zatím nedostatečné a nekonzistentní. Reálné rozdíly, které se v datech objevují, jsou spíš v míře adaptace než v tom, *jak* trénovat: ženy v průměru získávají větší **relativní** sílu dolní poloviny těla a výraznější zlepšení svalové vytrvalosti (hlavně v pozdější fázi programu), muži v průměru víc **absolutní** síly, velikosti svalů a výbušnosti. Proto appka nemá zvlášť "dámskou" a "pánskou" šablonu — stejné principy (progresivní přetížení, dostatečný objem, blízkost k selhání) fungují pro obě pohlaví, liší se jen výchozí čísla (tvoje vlastní maxima v Profilu).

  **Oprava: nový cyklus se po vygenerování nemusel zobrazit.** `switchMode('edit')` končí bez efektu, pokud jsi v Úpravě už byla (typicky když vygeneruješ druhou šablonu hned po první) — cyklus se sice uložil do dat, ale editor se nepřekreslil, takže by na obrazovce chyběl, dokud bys nepřepnula režim tam a zpátky. Opraveno tak, že se editor po vygenerování překreslí vždy, ať jde vidět **celý** nový cyklus (všechny týdny) hned.

  ### Výběr varianty doplňku (🔄)

  Vedle jména každého cviku v editoru je tlačítko **🔄** — funguje úplně stejně u cviku vygenerovaného ze šablony i u cviku, který si píšeš ručně od nuly. Otevře malé okno, kde nejdřív vybereš, **co** má cvik trénovat, a pak **jakým vybavením** ho chceš dělat (vlastní váha / činky / stroj) — appka doplní název cviku a doporučenou sérii/opakování (jen tam, kde je Plán zatím prázdný, ať ti nepřepíše, co už máš vyplněné).

  Nabídka má **9 kategorií** (rozšířeno z původních 5 podle podrobné rešerše cviků podle svalových partií): tlak-hrudník, tah-záda, nohy-kvadricepsy, zadní řetězec (hamstringy/hýždě), lýtka, ramena (tlak nad hlavu a delty), biceps, triceps, core. U každého vybavení (vlastní váha/činky/stroj) je navíc obvykle **2–3 cviků na výběr**, ne jen jeden pevný — dohromady **61 cviků** (dřív 15). Kategorie i konkrétní varianty jsou v `data/accessory-variants.json` (obecný obsah, stejně jako šablony — není gitignored):
  - Rozdělení na tlak/tah respektuje stejný **poměr cca 1:2 ve prospěch tahu** jako u šablony Wendler 5/3/1 (zdraví ramen).
  - Tři varianty vybavení pro každou kategorii jsou vybrané tak, aby šlo o **stejný vzor pohybu** (jen jiné náčiní) — opřeno o [systematický přehled a meta-analýzu Heidt a kol. 2023](https://pubmed.ncbi.nlm.nih.gov/37582807/), která u volných vah a strojů nenašla rozdíl v hypertrofii; síla je částečně specifická pro typ tréninku, ale ne natolik, aby jedna varianta byla "špatná". Výběr vybavení je tedy hlavně otázka dostupnosti, ne správnosti.
  - Samotné rozdělení na 9 kategorií a výběr konkrétních cviků vychází z Perplexity Deep Research (rešerše cviků podle partií + doplňkových cviků k hlavním zdvihům), která cituje především [NSCA Strength and Conditioning Journal 2017 o velkých a malých svalech v silovém tréninku](https://journals.lww.com/nsca-scj/fulltext/2017/10000/large_and_small_muscles_in_resistance_training__is.9.aspx) (odtud i parametry doplňků — 8+ opakování, 1–3 série u síly / 3–4 u hypertrofie, pořadí power → core → assistance) a ACSM Position Stand.

  `data/templates.json` na rozdíl od `plan.json`/`profile.json` **není gitignored** — jde o obecný, appkou dodávaný obsah (stejně jako `data/default.json`), ne o tvoje osobní data. Formát:
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

V režimu Úprava je nahoře vedle `+ Nový cyklus` jedno tlačítko **📄 CSV**, které po kliknutí rozbalí nabídku se dvěma volbami (obousměrně, export i import z jednoho místa):

- **⬇️ Export CSV (trénink i profil)** – stáhne **celý** aktuální trénink (všechny cykly, týdny, dny, sekce, cviky, rozcvičku, plán i Realitu) **a k tomu i celý Profil** (výška, váha, jednotky, zkušenost, dny v týdnu a kompletní historii maxim) jako jeden `.csv` soubor, čitelný a upravitelný v Excelu/Google Sheets (oddělovač `;`, kódování UTF-8, jde tedy rovnou otevřít i s českými znaky).
- **⬆️ Import CSV (nahradí trénink i profil)** – nahraje trénink i profil zpátky ze souboru ve stejném formátu. **Import nahradí celý aktuální trénink i Profil** (aplikace se před tím zeptá na potvrzení) – hodí se to jako záloha/obnova, nebo přesun mezi dvěma nasazeními appky (např. z lokálního vývoje na produkční server – exportuješ tady, importuješ tam beze změny souboru), případně hromadná úprava v Excelu (např. přepsání vah pro celý týden najednou) s následným zpětným nahráním.

Export i import jsou tedy vzájemné – co aplikace vyexportuje, to i sama zpátky bezezbytku naimportuje (obousměrně, včetně diakritiky, čárek/středníků v poznámkách i víceřádkových poznámek), ověřeno automatizovaným testem, který export znovu naimportuje a porovná výsledek s originálem beze změny.

Jeden CSV soubor nese tři druhy řádků, rozlišené prvním sloupcem **Typ**:
- `PROFIL` – jeden řádek se základními údaji (výška, váha, jednotky, zkušenost, dny v týdnu).
- `MAXIMUM` – jeden řádek na každý zapsaný záznam historie maxim.
- `PLAN` – řádky s tréninkem samotným; každý odpovídá jedné sérii (rozcvička nebo plán) a nese s sebou celý "rodokmen" (Cyklus/Tyden/Den/Sekce/Cvik) jako sloupce, plus `Poznamka_planu` (poznámka k plánu – cíl/RIR/technika) a `Realita_poznamka` (poznámka k realitě – jak to doopravdy šlo), pěkně oddělené sloupce, ať se nepletou. Prázdné dny/sekce/cviky beze všech sérií dostanou vlastní řádek jen s vyplněným rodokmenem, ať se při zpětném importu neztratí.

Starší export bez sloupce Typ (z appky před touhle úpravou) se při importu bere jako čistě `PLAN` (bez profilu), takže funguje i zpětně. Jediné omezení: pokud je ve stejné sekci **dvakrát za sebou cvik se stejným názvem**, import je sloučí do jednoho (v praxi se to skoro neděje).

## Teorie: jak se sestavuje trénink (shrnutí z literatury)

Tahle sekce je shrnutí toho, **z čeho appka vychází** při sestavování šablon výše — ne kompletní učebnice, ale praktický přehled pojmů a čísel, podle kterých jde trénink sama posoudit nebo upravit. Vychází ze zprávy **Perplexity Deep Research** *"Najdi v literatuře a oficiálních zdrojích všechny silové tréninky, co existují... sepiš je s parametry, doplňky i modely"* (2026), která sama cituje především [WHO doporučení k pohybové aktivitě](https://iris.who.int/server/api/core/bitstreams/f3885485-e7eb-4504-8026-edd9bb53a6ee/content), [ACSM 2026 Position Stand on Resistance Training](https://acsm.org/resistance-training-guidelines-update-2026/) (137 systematických review, ~30 000 účastníků) a desítky dalších recenzovaných studií a metaanalýz (NSCA, PubMed) — plný report s kompletním seznamem odkazů máš uložený lokálně jako export z Perplexity; tady je jen destilát, který appka přímo používá.

### Základní cíle a jejich parametry

| Cíl | Zátěž (% 1RM) | Opakování | Série | Pauza | Hlavní důraz |
|---|--:|--:|--:|--:|---|
| Maximální síla | ~80–100 % | 1–5 | 2–6 | 3–5 min | těžké vícekloubové cviky |
| Síla a svalový růst | 70–85 % | 4–10 | 3–5 | 2–4 min | progresivní přetížení |
| Hypertrofie | ~30–85 % | 5–30 | 2–5 | 1–3 min | dostatečný objem, blízkost selhání |
| Svalová vytrvalost | 30–60 % | 15–30+ | 2–4 | 30–90 s | delší série |
| Výkon a explozivita | 30–70 % | 1–6 | 3–6 | 2–5 min | maximální rychlost pohybu |

Vyšší zátěže jsou obecně účinnější pro maximální sílu; svalový růst jde dosáhnout širokým rozmezím zátěží, pokud je série dostatečně náročná (blízko selhání). Pro hypertrofii ACSM doporučuje orientačně **≥10 pracovních sérií týdně na svalovou skupinu**, pro sílu **≥80 % 1RM, 2–3 série, aspoň 2× týdně**.

### Tréninkové proměnné (jimi se dá popsat každý program)

Frekvence · Objem (série × opakování × zátěž) · Intenzita (% 1RM, RPE, RIR) · Úsilí (blízkost selhání) · Výběr cviků (vícekloubové/izolace, volné váhy/stroje/vlastní váha) · **Pořadí cviků** (technicky/nervově náročné první — appka to dodržuje ve všech šablonách, hlavní cvik vždy před doplňky) · Tempo · Pauzy · Rozsah pohybu · Progrese · Periodizace.

### RIR (Reps in Reserve) — kolik opakování zbývá do selhání

| RIR | Význam | Použití |
|--:|---|---|
| 4–5 | velmi lehká série | rozcvičení, regenerace, deload |
| 2–3 | náročná, ale kontrolovaná | většina základních pracovních sérií |
| 1 | téměř selhání | těžší pracovní série |
| 0 | momentální selhání | hlavně bezpečné izolace a stroje, ne těžké dřepy/tahy |

### Úrovně cvičenců

- **Začátečník** — 2–3× týdně celé tělo, 5–8 cviků, 1–3 série, 6–15 opakování, RIR 2–4. Přidávat váhu, až jsou všechna opakování technicky čistá.
- **Středně pokročilý** — 3–5× týdně, objem rozdělený na víc jednotek, ~8–20 sérií týdně na hlavní partie, kombinace těžkých/středních/lehkých dnů, pravidelné odlehčovací týdny.
- **Pokročilý** — vyšší frekvence nebo specializace, periodizace (akumulace/transmutace/realizace), autoregulace přes RPE/RIR/rychlost činky, deload před testy.

### Hlavní typy rozdělení (splits)

| Model | Frekvence | Pro koho |
|---|--:|---|
| Full body | 2–4× | začátečníci, časově vytížení |
| Upper/Lower | 4× | středně pokročilí |
| Push/Pull/Legs | 3–6× | středně pokročilí až pokročilí |
| Bro split (partie/den) | 4–6× | pokročilí, nízká frekvence na sval |
| Powerlifting split | 3–5× | maximální síla |
| Circuit training | 2–4× | kondice, časová efektivita |

Rozdělení samo o sobě není "kouzelné" — jeho účelem je rozložit objem tak, aby série byly kvalitní a regenerace zvládnutelná. Appka pokrývá Full body (Nováček), Upper/Lower (Lineární periodizace), Push/Pull/Legs a Powerlifting split (Wendler 5/3/1, Bloková periodizace) jako hotové šablony.

### Progrese, deload a časté chyby

- **Progrese zátěže:** horní tělo obvykle +1–2,5 kg, dolní tělo +2,5–5 kg, jakmile jdou splnit všechny série v cílovém rozsahu.
- **Progrese objemu** (když nejde přidat váha): +1 opakování, +1 série, lepší rozsah pohybu, kratší pauza (jen u doplňků), náročnější varianta cviku.
- **Deload** (po ~3–8 týdnech, podle výkonu a únavy, ne podle kalendáře): série −30–50 %, zátěž −5–15 %, ponechat rezervu, zachovat techniku. Varovné signály, že je čas: stagnace/pokles výkonu 2+ týdny, zhoršující se technika, špatný spánek, přetrvávající bolest.
- **Nejčastější chyby u periodizace:** současné zvyšování objemu i intenzity místo jejich vyvažování; příliš dlouhý objemový blok; příliš rychlé skoky mezi fázemi; testování jiného cviku, než na jaký se trénovalo; ignorování únavy; chybějící nebo příliš pozdní deload.

Nejsilnější evidence podporuje **jednoduchý program s dostatečným objemem, vhodnou intenzitou, plným rozsahem pohybu, konzistentní progresí a dlouhodobou vytrvalostí u programu** — složité periodizační systémy jsou nástroj pro konkrétní potřeby (test, závod, stagnace), ne povinná součást každého tréninku.

## Struktura projektu

```
training-plan/
├── data/
│   ├── default.json     # výchozí šablona týdne (start pro nový účet bez uloženého plánu)
│   ├── users.json       # seznam účtů (jméno/hash hesla/primary) — víc uživatelů, viz sekce výše; vzniká automaticky, není v gitu
│   ├── plan.json        # uložený plán hlavního účtu (vzniká po prvním uložení, není v gitu)
│   ├── profile.json     # profil hlavního účtu — výška/váha/jednotky + historie maxim (vzniká při prvním uložení, není v gitu)
│   ├── plan-<jméno>.json, profile-<jméno>.json  # totéž pro každý další účet (vzniká při prvním uložení, není v gitu)
│   ├── auth.json         # z appky před podporou víc uživatelů — čte se už jen jednou při prvním spuštění po upgradu (migrace hesla hlavního účtu do users.json), pak se nepoužívá
│   ├── templates.json   # databáze šablon tréninků — 9 dodávaných protokolů, JE v gitu (viz sekce výše); vlastní šablony si sem můžeš přidat, jen zvaž gitignore
│   └── accessory-variants.json  # nabídka doplňků (9 kategorií podle svalových partií × vybavení), JE v gitu
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

Aplikace je bezstavová (celý stav je pár JSON souborů na disku ve složce `data/`, žádná databáze) a nemá žádné závislosti na externí databázi, takže Docker obraz je jednoduchý – `node:20-alpine` + Express.

### Potřebné parametry pro nasazení (shrnutí)

Co je potřeba mít připravené/nastavené, než appku pustíš na serveru:

| Co | Kde se nastavuje | Povinné? |
|---|---|---|
| Docker + Docker Compose na serveru | nainstalované na hostitelském stroji | ano |
| Otevřený/přesměrovaný port (výchozí `3100`) | firewall / router / reverzní proxy serveru | ano |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_RESET_CODE` | proměnné prostředí v `docker-compose.yml` (viz tabulka níž) | ano – jinak se použijí výchozí hodnoty z tohoto README, což je v produkci bezpečnostní riziko |
| Složka `./data` vedle `docker-compose.yml`, zapisovatelná | vznikne automaticky při prvním spuštění (bind mount) | ano – bez ní appka neuloží žádná data |
| `PORT` (jen pokud měníš výchozí `3100`) | proměnná prostředí + `EXPOSE`/mapování portu v `docker-compose.yml` | ne (má výchozí hodnotu) |
| Reverzní proxy s HTTPS (nginx/Caddy/Traefik) | mimo appku, na serveru | doporučeno pro veřejně dostupnou adresu (viz sekce Reverzní proxy níž) |

Detailní popis jednotlivých kroků a proměnných je v sekcích níž.

### Rychlý start přes docker-compose (doporučeno)

```bash
docker compose up -d --build
```

Appka poběží na `http://<adresa-serveru>:3100`. `docker-compose.yml` už má nastavené:

- **restart: unless-stopped** – po pádu nebo restartu serveru se kontejner sám znovu spustí,
- **bind mount** `./data:/app/data` – kontejner čte a zapisuje přímo do složky `data/` na hostitelském disku (tam, odkud appku spouštíš), takže vidí tvůj skutečný `data/plan.json` a `docker compose down`/rebuild/update image ho nijak neovlivní. (Pozn.: dřív tu byl pojmenovaný Docker volume – ten při prvním spuštění vznikne prázdný a neobsahuje tvá už uložená data, takže appka běžela s prázdnou výchozí šablonou, dokud jsi ho ručně nenaplnila. Bind mount na `./data` tenhle krok navíc nepotřebuje.)
- **`data/templates.json` a `data/accessory-variants.json` se při každém startu automaticky obnoví na verzi z aktuálního image** – i když je bind mount na `./data` dobrý pro tvoje osobní soubory (`plan.json`, `profile.json`, `users.json` – ty se update nikdy nedotkne), stejný bind mount by jinak zamrazil i tyhle dva soubory s obecným obsahem (šablony, doplňky) na tom, co bylo na disku úplně poprvé, a novější šablony/doplňky z dalších verzí appky by se na běžící kontejner nikdy nedostaly, i po `docker compose up -d --build`. Proto Dockerfile drží čerstvou kopii těchhle dvou souborů mimo `data/` (ve `shipped-defaults/` uvnitř image) a `server.js` ji při startu natvrdo zkopíruje zpátky do `data/` – takže `docker compose up -d --build` teď skutečně dotáhne i novější šablony/doplňky, ne jen novější kód.
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
| `ADMIN_USERNAME` | `trainer936499` | Přihlašovací jméno **hlavního účtu** (další účty se zakládají přes appku, viz [Víc uživatelů](#víc-uživatelů-samostatné-účty)). |
| `ADMIN_PASSWORD` | `SilaHubnuti-26x!` | Heslo hlavního účtu – **změň před nasazením do produkce.** Použije se jen při úplně prvním spuštění (založí `data/users.json`); po založení je zdrojem pravdy `data/users.json`, ne tahle proměnná. |
| `ADMIN_RESET_CODE` | `ObnovaHesla-9427-Trenink` | Záchranný kód pro obnovení zapomenutého hesla na `/login` → "Zapomenuté heslo?" — funguje pro kterýkoli účet. **Změň ho na něco, co nikde jinde nepoužíváš** – kdokoliv tenhle kód zná, může nastavit nové přihlašovací heslo libovolnému účtu bez znalosti toho starého. |

`docker-compose.yml` má tyhle proměnné už vyplněné (stejnými výchozími hodnotami) – v produkci je tam rovnou přepiš na vlastní.

### Zálohování dat

Celý stav appky je pár souborů přímo ve složce `data/` vedle `docker-compose.yml` (díky bind mountu) — `plan.json`/`profile.json` hlavního účtu, `plan-<jméno>.json`/`profile-<jméno>.json` každého dalšího účtu a `users.json` se seznamem účtů. Nejjednodušší záloha je celá složka najednou:

```bash
cp -r data data-backup-$(date +%F)
```

a obnovíš stejně opačným směrem. Zálohovat jde i jednotlivý soubor stejným způsobem jako dřív, např. `cp data/plan.json data/plan-backup-$(date +%F).json`. (`data/*backup*` je v `.gitignore`/`.dockerignore`, takže si takhle pojmenované zálohy klidně nech přímo ve složce.)

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
