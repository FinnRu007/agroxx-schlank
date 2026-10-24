// Erzeugt die fertige Seite (HTML + verkleinerte Fotos) im Hauptordner.
// Aufruf: npm run bauen   (Fotoquelle: ../agroxx-website/bilder/original, Maschinendaten: ../agroxx-website/daten)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const WURZEL = path.resolve(import.meta.dirname, '..');
const QUELLE = path.resolve(WURZEL, '../agroxx-website');
const LIVE = false; // true = für Google freigeben (noindex weg, robots.txt erlaubt alles)

const FIRMA = { name: 'agroXX techniCCenter', inhaber: 'Thomas Schalkamp', strasse: 'Büttrup 13', ort: '59320 Ennigerloh', tel: '+49 170 7324661', telLink: '+491707324661', mail: 'info@agroxx.eu', traktorpool: 'https://www.traktorpool.de/agroxx/' };
const FIRMA_JSON = JSON.parse(fs.readFileSync(path.join(QUELLE, 'daten/firma.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- Fotos ----------
const bilderOrdner = path.join(WURZEL, 'bilder');
fs.mkdirSync(bilderOrdner, { recursive: true });
const benutzt = new Map(); // name -> Breite
const grosse = new Set(); // Fotos für die Vollbildansicht (bilder/gross/, 1800 px)
fs.mkdirSync(path.join(bilderOrdner, 'gross'), { recursive: true });
function foto(name, breite = 1280) {
  const n = name.replace(/\.jpg$/, '');
  benutzt.set(n, Math.max(benutzt.get(n) || 0, breite));
  return `bilder/${n}.jpg`;
}
function gross(name) {
  const n = name.replace(/\.jpg$/, '');
  grosse.add(n);
  return `bilder/gross/${n}.jpg`;
}
const quellePfad = (n) => (n.startsWith('IMG_') ? eigeneFotos.get(n) : path.join(QUELLE, 'bilder/original', `${n}.jpg`));
// Eigene Fotos von Thomas (entpackte Mail-Anhänge, IMG_xxxx.JPG) liegen in ../rohmaterial/<Ordner>/
const EIGENE = path.resolve(WURZEL, '../rohmaterial');
const eigeneFotos = new Map();
if (fs.existsSync(EIGENE)) {
  for (const f of fs.readdirSync(EIGENE, { recursive: true })) {
    if (/\.jpe?g$/i.test(f)) { const id = path.basename(f).replace(/\.jpe?g$/i, ''); if (!eigeneFotos.has(id)) eigeneFotos.set(id, path.join(EIGENE, f)); }
  }
}
async function bilderErzeugen() {
  const sollen = new Set();
  const erzeuge = async (n, b, ziel) => {
    sollen.add(path.resolve(ziel));
    const quelle = quellePfad(n);
    if (!quelle || !fs.existsSync(quelle)) throw new Error(`Foto fehlt: ${n}`);
    // vorhandene Datei nur behalten, wenn sie schon breit genug ist
    if (fs.existsSync(ziel) && (await sharp(ziel).metadata()).width >= Math.min(b, (await sharp(quelle).metadata()).width)) return;
    await sharp(quelle).rotate().resize({ width: b, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(ziel);
  };
  for (const [n, b] of benutzt) await erzeuge(n, b, path.join(bilderOrdner, `${n}.jpg`));
  for (const n of grosse) await erzeuge(n, 1800, path.join(bilderOrdner, 'gross', `${n}.jpg`));
  // nicht mehr benutzte Fotos aufräumen
  for (const dir of [bilderOrdner, path.join(bilderOrdner, 'gross')]) {
    for (const f of fs.readdirSync(dir)) { const p = path.resolve(dir, f); if (fs.statSync(p).isFile() && !sollen.has(p)) fs.unlinkSync(p); }
  }
}

// ---------- Maschinendaten (nur Info, keine Preise) ----------
const maschinen = fs.readdirSync(path.join(QUELLE, 'daten/maschinen')).map((f) => JSON.parse(fs.readFileSync(path.join(QUELLE, 'daten/maschinen', f), 'utf8'))).filter((m) => m.status !== 'Verkauft');
function modelle(kat, filter = () => true) {
  return maschinen.filter((m) => m.kategorie === kat && filter(m)).sort((a, b) => a.titel.localeCompare(b.titel, 'de', { numeric: true }));
}
function tabelle(liste) {
  const gesehen = new Set();
  liste = liste.filter((m) => { const k = [m.titel, m.zusatz].join('|'); return gesehen.has(k) ? false : gesehen.add(k); });
  if (!liste.length) return '';
  const eck = (m) => (m.eckdaten || []).map((e) => e.replace(/^Baujahr \d{4}( · )?/, '')).filter(Boolean).join(' · ');
  return `<div class="tabelle-scroll"><table class="tabelle"><thead><tr><th>Modell</th><th>Ausführung</th><th>Eckdaten</th></tr></thead><tbody>${liste
    .map((m) => `<tr><td><strong>${esc(m.titel)}</strong></td><td>${esc(m.zusatz || '')}</td><td>${esc(eck(m))}</td></tr>`)
    .join('')}</tbody></table></div>`;
}

// ---------- Seiten ----------
const SEITEN = [
  {
    datei: 'grubber.html', nav: 'TRIPLE-X', titel: 'TRIPLE-X Mulchgrubber', kicker: 'Mulchgrubber',
    kurz: 'Der Premium-Mulchgrubber für intensive Mischarbeit.',
    hero: 'IMG_6063',
    trenner: ['IMG_6091', 'Dreibalkengerät. Kräftiger Rahmen. Saubere Arbeit.'],
    bildgruppen: [
      ['TRIPLE-X Serie', 'Die TRIPLE-X Mulchgrubber der agroXX-Linie: kräftiger Rahmen, TOPMIX-Schare und Nachläufer.', ['IMG_6063', 'IMG_6052', 'IMG_6071', 'IMG_6072', 'IMG_6073', 'IMG_6085', 'IMG_6087', 'IMG_6096']],
      ['TRIPLE-X kleinere Version', 'Auch als kleinere Variante der Maschine erhältlich.', ['IMG_4072', 'IMG_4074', 'IMG_4086', 'IMG_4088', 'IMG_4099', 'IMG_4101']],
      ['Details', 'Zinken, Schare, Randscheiben und Anbaubock aus der Nähe.', ['IMG_4084', 'IMG_4090', 'IMG_4093', 'IMG_4095', 'IMG_4076']],
    ],
    werkzeuge: ['Verschiedene Werkzeuge wählbar', 'Für den TRIPLE-X sind verschiedene Scharspitzen als Werkzeuge verfügbar und wählbar.', ['IMG_4618', 'IMG_4619', 'IMG_4620', 'IMG_4626', 'IMG_4627', 'IMG_4631']],
    lead: 'Intensive Mischarbeit, sauberes Strohmanagement und zügiges Auslaufen von Ausfallgetreide: Der TRIPLE-X ist ein Dreibalkengerät mit kräftigem Rahmen und durchdachtem Zinken- und Scharsystem, für Schlepper von 140 bis 300 PS.',
    zahlen: [['3,0–4,8 m', 'Arbeitsbreite'], ['bis 30 cm', 'Arbeitstiefe'], ['140–300 PS', 'Schlepperleistung'], ['S355', 'Feinkornstahl-Rahmen']],
    punkte: [
      ['Rahmen', '3 Balken, 100 × 100 mm Rohrrahmen aus S355-Feinkornstahl, 82 cm Rahmenhöhe, 80 cm Rahmenabstand'],
      ['Zinken und Schare', 'TOPMIX-Zinken- und Scharsystem von Industriehof Scherenbostel, Flügelschar 315 mm breit und leicht zu demontieren'],
      ['Scharleitbleche', 'abwechselnd rechts und links gedreht'],
      ['Anbau', 'HD-Dreipunktbock Kat. 2 und 3, verstärkte Arme für den Nachläufer'],
      ['Nachläufer', 'Dachringwalze Premium Ø 600 mm mit Abstreifer, STS-Walze ebenfalls erhältlich'],
      ['Randscheiben', 'serienmäßig 10 gezackte Hohlscheiben Ø 465 mm, davon 2 teleskopierbare Randscheiben'],
    ],
    galerie: ['7373771-46402507', '7373771-46402513', '8870254-65368729', '7373771-46402486', '8870254-65368708', '7373771-46402500', '7373771-46402505', '8870254-65368706', '7373771-46402515', '8870254-65368745'],
    gruppen: [['Starre Ausführung, 3,0 m', 'Kompakt für kleinere und mittlere Schlepper, mit Flügelscharen und Steinsicherung.', /TRIPLE-X 3./], ['Klappbare Ausführung, 4,0 und 4,8 m', 'Für große Flächen: klappbar, mit Beleuchtung für die Straßenfahrt.', /TRIPLE-X [45]./]], tabelleFilter: 'Grubber',
    videos: 'grubber',
  },
  {
    datei: 'kurzscheibeneggen.html', nav: 'AVATERRA', titel: 'AVATERRA Kurzscheibeneggen', kicker: 'Kurzscheibeneggen',
    kurz: 'Gezackte Scheiben, Walze nach Wahl, klappbar mit Beleuchtung.',
    hero: 'IMG_5759',
    trenner: ['IMG_5684', 'Flach arbeiten. Gleichmäßig einmischen. Klappbar zum Feld.'],
    bildgruppen: [
      ['AVATERRA Kurzscheibenegge', 'Gezackte Hohlscheiben und Dachringwalze, klappbar und beleuchtet für die Straßenfahrt.', ['IMG_5759', 'IMG_5636', 'IMG_5666', 'IMG_5667', 'IMG_5668', 'IMG_5670', 'IMG_5704', 'IMG_5756', 'IMG_5767']],
      ['AVATERRA mit Fahrwerk', 'Die Ausführung mit Fahrwerk.', ['IMG_3234', 'IMG_3193', 'IMG_3240', 'IMG_3248', 'IMG_3271', 'IMG_3276', 'IMG_3294', 'IMG_3296']],
      ['Details', 'Randscheibe, Scheibenlagerung, Dreipunktbock und Walze.', ['IMG_5646', 'IMG_5651', 'IMG_5738', 'IMG_5744', 'IMG_5673', 'IMG_5781']],
    ],
    lead: 'Die AVATERRA arbeitet Stoppeln und Zwischenfrüchte flach und gleichmäßig ein. Gezackte Hohlscheiben, wahlweise Dachring- oder Krumenpackerwalze und eine klappbare Bauweise machen sie zum Allrounder für große Flächen.',
    zahlen: [['4,5–5,0 m', 'Arbeitsbreite'], ['Ø 560 mm', 'gezackte Scheiben'], ['5 Jahre', 'Garantie Scheibenlagerung']],
    punkte: [
      ['Scheiben', 'gezackte Hohlscheiben Ø 560 mm, Lochkreis 115 mm'],
      ['Walze', 'Dachringwalze oder Krumenpackerwalze'],
      ['Transport', 'klappbar, mit Beleuchtung und Transportstützrad'],
    ],
    galerie: ['8335292-57833131', '8335292-57833137', '8335292-57833134', '8335292-57833138', '8335292-57833135', '8335292-57833132', '8335292-57833123', '8335292-57833127', '8335292-57833121'],
    gruppen: [['AVATERRA Gen4', '4,5 und 5,0 m, mit Dachringwalze, klappbar und beleuchtet.', /Gen4|4.5|5.0 Gen/i], ['AVATERRA K-XL', 'Vollausstattung mit Krumenpackerwalze und Transportstützrad.', /K-XL/]], tabelleFilter: 'Kurzscheibeneggen',
    videos: 'kurzscheibeneggen',
  },
  {
    datei: 'tiefenlockerer.html', nav: 'NITRO-X', titel: 'NITRO-X Tiefenlockerer', kicker: 'Tiefenlockerer',
    kurz: 'Bodenlockerung bis 55 cm Tiefe, mit Steinsicherung.',
    hero: 'IMG_4398',
    trenner: ['IMG_4433', 'Verdichtungen aufbrechen, wo sie entstehen.'],
    bildgruppen: [
      ['NITRO-X 6,0 m, die große Serie', 'Die große NITRO-X Tiefenlockerer Serie mit Stützrädern, klappbar und beleuchtet.', ['IMG_4398', 'IMG_4400', 'IMG_4401', 'IMG_4402', 'IMG_4403', 'IMG_4407', 'IMG_4433', 'IMG_4446', 'IMG_4456']],
      ['NITRO-X weitere Ausführungen', 'Weitere Bilder der NITRO-X Serie mit den verschiedenen Scharsystemen.', ['IMG_8542', 'IMG_8546', 'IMG_8553', 'IMG_8575', 'IMG_8572', 'IMG_8506', 'IMG_8517', 'IMG_8520']],
      ['Details', 'Schare, Scharspitzen, Steinsicherung und Hubwerk im Detail.', ['IMG_8549', 'IMG_8557', 'IMG_8558', 'IMG_8508', 'IMG_8562', 'IMG_8564', 'IMG_8566', 'IMG_4415']],
    ],
    lead: 'Der NITRO-X bricht Verdichtungen auf, wo sie entstehen: bis in große Tiefen, mit Steinsicherung und hydraulischem Hubwerk. Erhältlich als PARAPLOW-HD und mit Flachscharsystem.',
    zahlen: [['bis 55 cm', 'Arbeitstiefe'], ['3,0–6,0 m', 'Arbeitsbreite'], ['4000 kg', 'hydraulisches Hubwerk']],
    punkte: [
      ['PARAPLOW-HD', 'aufgepanzerte Spitzen, Zapfwellendurchtrieb, Steinsicherung'],
      ['Flachscharsystem', '4 Füße à 380 mm breit, Flügelschare'],
      ['Große Ausführung', '6,0 m klappbar mit Stützrädern und Beleuchtung'],
    ],
    galerie: ['8876326-65446967', '8876326-65446972', '8876326-65446973', '8876326-65446963', '8876326-65446964', '8876326-65446961', '8876326-65446965', '8876326-65446960'],
    gruppen: [['PARAPLOW-HD', 'Aufgepanzerte Spitzen, Zapfwellendurchtrieb, in 3,0 und 6,0 m.', /PARAPLOW/], ['Flachscharsystem', 'Vier Füße à 380 mm Breite für flächiges Lockern.', /Flachschar|3.0-4/]], tabelleFilter: 'Tiefenlockerer',
    videos: 'tiefenlockerer',
  },
  {
    datei: 'walzen.html', nav: 'Quivogne', titel: 'Quivogne Cambridge-Walzen', kicker: 'Walzenprogramm',
    kurz: 'Cambridgewalzen mit Pendelausgleich und Messerwalzen.',
    hero: 'IMG_7094',
    trenner: ['IMG_7121', 'Rückverfestigen. Saatbett bereiten. Flächenleistung.'],
    bildgruppen: [
      ['Quivogne Cambridge-Walzenprogramm', 'Die Quivogne-Cambridgewalzen im Feld: klappbar, mit Beleuchtung und Pendelausgleich.', ['IMG_7094', 'IMG_7066', 'IMG_7071', 'IMG_7076', 'IMG_7121', 'IMG_7124']],
      ['Weitere Ansichten', 'ROLLMAX und ROLLFIRST in verschiedenen Arbeitsbreiten.', ['8428162-59086186', '8428162-59086182', '8428162-59086179', '8428162-59086176', '8428162-59086177', '8428162-59086175']],
    ],
    lead: 'Rückverfestigung, Strohzerkleinerung, Saatbettbereitung: Quivogne-Cambridgewalzen mit Pendelausgleich und Messerwalzen für die Strohbearbeitung. Die Frontanbau-Walzen von agroXX finden Sie unter Frontanbau.',
    zahlen: [['bis 9,50 m', 'Arbeitsbreite'], ['Ø 520–620 mm', 'Ringe'], ['klappbar', 'mit Beleuchtung']],
    punkte: [
      ['ROLLMAX', 'Quivogne-Cambridgewalze mit 620-mm-Ringen und Pendelausgleich'],
      ['ROLLFIRST', 'Quivogne-Cambridgewalze mit 520-mm-Ringen und XL-Bereifung'],
      ['Messerwalze', 'SlashCut für die Strohbearbeitung'],
    ],
    galerie: ['8428162-59086182', '8428162-59086179', '8428162-59086176', '8428162-59086177', '8428162-59086175', '8428162-59086183', '8428162-59086188', '8428162-59086172'],
    gruppen: [['ROLLMAX', 'Cambridgewalze mit 620-mm-Ringen und Pendelausgleich, 8,30 und 9,50 m.', /ROLLMAX/i], ['ROLLFIRST', 'Cambridgewalze mit 520-mm-Ringen und XL-Bereifung, 8,20 m.', /ROLLFIRST/i], ['Messerwalze', 'SlashCut für die Strohbearbeitung.', /SlashCut|Messer/i]], tabelleFilter: 'Walzen & Packer',
    videos: 'walzen',
  },
  {
    datei: 'frontanbau.html', nav: 'Frontanbau', titel: 'Frontanbau-Geräte', kicker: 'Frontanbau',
    kurz: 'STAR CRACKER und MAXXIMUS-Walzen für den Frontanbau.',
    hero: 'IMG_9038',
    trenner: ['IMG_9020', 'Für den Frontanbau gebaut.'],
    bildgruppen: [
      ['STAR CRACKER', 'Das agroXX Frontanbaugerät STAR CRACKER mit Sternringen und Dreipunktanbau.', ['IMG_9038', 'IMG_9000', 'IMG_9001', 'IMG_9011', 'IMG_9019', 'IMG_9020', 'IMG_9024', 'IMG_9034', 'IMG_9037', 'IMG_9046', 'IMG_9050']],
      ['MAXXIMUS Frontwalze', 'Die agroXX-Walze MAXXIMUS für den Frontanbau, mit Dreipunktanbau und Stützfüßen.', ['IMG_0250', 'IMG_0209', 'IMG_0212', 'IMG_0216', 'IMG_0218', 'IMG_0221', 'IMG_0222', 'IMG_0238', 'IMG_0239', 'IMG_0242', 'IMG_0243', 'IMG_0258']],
    ],
    lead: 'Zur agroXX-Linie gehören Geräte für den Frontanbau: der STAR CRACKER und die MAXXIMUS-Walze. Beide werden vorne am Schlepper angebaut.',
    zahlen: [],
    punkte: [
      ['STAR CRACKER', 'agroXX Frontanbaugerät mit Sternringen'],
      ['MAXXIMUS', 'agroXX Cambridge-Frontpacker mit Lenkbock und 525-mm-Ringen'],
      ['Frontpacker 6,0 m', 'agroXX FRONTPACKER in 6,0 m Arbeitsbreite'],
    ],
    galerie: [],
    gruppen: [['MAXXIMUS und FRONTPACKER', 'agroXX Frontpacker für den Frontanbau.', /MAXXIMUS|FRONTPACKER|Frontpacker/i]], tabelleFilter: 'Walzen & Packer',
    videos: 'frontanbau',
  },
  {
    datei: 'pfluege.html', nav: 'ESCUDERO', titel: 'ESCUDERO Ecologic Onland Schälpflüge', kicker: 'Schälpflüge', exklusiv: true,
    youtube: [['https://youtu.be/dHTcP3nwmNY', 'Escudero Ecologic Onland-Pflug im Einsatz (YouTube)'], ['https://www.youtube.com/watch?v=7fUyuvBVwco', 'Weiteres Video zum Pflug (YouTube)']],
    trenner: ['4995195-28536732', 'In Deutschland exklusiv über agroXX.'],
    kurz: 'Ecologic Onland Dreh-Schälpflüge mit 6 bis 10 Scharen.',
    hero: '4995195-28536746',
    lead: 'Die ESCUDERO Ecologic Onland Dreh-Schälpflüge pflügen in der Furche und schonen so den Boden. Erhältlich mit 6 bis 10 Scharen, mit Steinsicherung und zum Teil hydropneumatisch abgesichert.',
    zahlen: [['6–10', 'Schare'], ['37 cm', 'Furchenbreite'], ['65 cm', 'Körperabstand']],
    punkte: [
      ['Rahmen', '70 cm Rahmenhöhe, 65 cm Körperabstand'],
      ['Sicherung', 'Steinsicherung, beim CHRH hydropneumatisch'],
      ['Einsatz', 'Onland-Pflügen für größere Schlepper und Flächen'],
    ],
    galerie: ['4995195-28536746', '4995195-28536732', '4995195-28536734', '4995195-28536721', '4995195-28536731', '4995195-28536722', '4995195-28536720', '4995195-28536723'],
    gruppen: [['CHRF', 'Ecologic Onland Dreh-Schälpflug in 6 bis 10 Scharen.', /CHRF/], ['CHRH', 'Mit hydropneumatischer Steinsicherung.', /CHRH/]], tabelleFilter: 'Pflüge',
    videos: 'pfluege',
  },
  {
    datei: 'programm.html', nav: 'Mehr', titel: 'Weiteres Programm', kicker: 'Weiteres Programm',
    kurz: 'Kreiseleggen, Muldenkipper, Schlepperreifen und Verschleißteile.',
    hero: '8335855-57839995',
    lead: 'Neben der Bodenbearbeitung führt das techniCCenter Kreiseleggen, Muldenkipper, Schlepperreifen und Verschleißteile. Fragen Sie nach Ihrem Bedarf, vieles ist ab Lager lieferbar.',
    zahlen: [],
    punkte: [
      ['Kreiseleggen', 'Quivogne MEKFOLD, klappbar, 6,0 m, mit Zahnpackerwalze'],
      ['Muldenkipper', 'Pronar Wannen- und Halfpipe-Muldenkipper, 19 bis 30 m³ Ladevolumen'],
      ['Schlepperreifen', 'Michelin, Alliance und Ascenso, zum Teil als Sonderposten'],
      ['Verschleißteile', 'Hohlscheiben und Meißelspitzen, passend für agroXX, Mandam, Bremer, Saphir und Meyer'],
    ],
    galerie: ['8335855-57840000', '8335855-57839995', '8335855-57840002', '8335855-57839998', '8448886-59341366', '2948657-51202157', '4713206-36295899', '8335855-57840019'],
    gruppen: [['Kreiseleggen', 'Quivogne MEKFOLD, klappbar, 6,0 m.', /MEKFOLD/], ['Muldenkipper', 'Pronar Wannen- und Halfpipe-Muldenkipper.', /Pronar|T6dd/], ['Federzinkeneggen', 'Speedline Großfederzinkenegge.', /Speedline/]], tabelleFilter: ['Kreiseleggen', 'Muldenkipper', 'Grubber'],
    videos: 'programm',
  },
];

const REIHE = ['grubber.html', 'kurzscheibeneggen.html', 'tiefenlockerer.html', 'frontanbau.html', 'pfluege.html', 'walzen.html', 'programm.html'];
SEITEN.sort((a, b) => REIHE.indexOf(a.datei) - REIHE.indexOf(b.datei));

// [Foto, Überschrift, Zeile darunter, Seite]
const HERO_FOLIEN = [
  ['IMG_6063', 'TRIPLE-X Mulchgrubber', 'Intensive Mischarbeit für große Flächen', 'grubber.html'],
  ['IMG_5759', 'AVATERRA Kurzscheibeneggen', 'Flach arbeiten, gleichmäßig einmischen', 'kurzscheibeneggen.html'],
  ['IMG_4407', 'NITRO-X Tiefenlockerer', 'Verdichtungen aufbrechen bis 55 cm', 'tiefenlockerer.html'],
  ['IMG_9038', 'STAR CRACKER', 'Frontanbau aus der agroXX-Linie', 'frontanbau.html'],
  ['4995195-28536746', 'ESCUDERO Ecologic Onland', 'In Deutschland exklusiv über agroXX', 'pfluege.html'],
  ['IMG_7094', 'Quivogne Cambridge-Walzen', 'Rückverfestigung in großer Breite', 'walzen.html'],
  ['IMG_6096', 'agroXX techniCCenter', 'Bodenbearbeitung aus Ennigerloh', 'grubber.html'],
];

// ---------- Bausteine ----------
const kopf = (aktiv, transparent) => `<header class="kopf${transparent ? ' ueber-bild' : ''}" id="kopf"><div class="wrap">
  <a class="logo" href="index.html" aria-label="${FIRMA.name} – Startseite"><img src="logo.png" width="804" height="382" alt="${FIRMA.name}"></a>
  <button class="burger" aria-expanded="false" aria-controls="menue" aria-label="Menü"><span></span><span></span><span></span></button>
  <nav class="nav" id="menue" aria-label="Hauptmenü"><ul>
    ${SEITEN.map((s) => `<li><a href="${s.datei}"${aktiv === s.datei ? ' aria-current="page"' : ''}>${s.nav}</a></li>`).join('\n    ')}
    <li><a href="kontakt.html" class="nav-knopf"${aktiv === 'kontakt.html' ? ' aria-current="page"' : ''}>Kontakt</a></li>
  </ul></nav>
</div></header>`;

const fuss = `<footer class="fuss"><div class="wrap">
  <div class="fuss-spalten">
    <div><img class="fuss-logo" src="logo.png" width="804" height="382" alt="${FIRMA.name}" loading="lazy"><p>${FIRMA.inhaber}<br>${FIRMA.strasse}<br>${FIRMA.ort}</p></div>
    <div><h3>Kontakt</h3><p><a href="tel:${FIRMA.telLink}">${FIRMA.tel}</a><br><a href="https://wa.me/${FIRMA.telLink.slice(1)}">WhatsApp</a><br><a href="mailto:${FIRMA.mail}">${FIRMA.mail}</a></p></div>
    <div><h3>Programm</h3><ul>${SEITEN.map((s) => `<li><a href="${s.datei}">${s.kicker}</a></li>`).join('')}</ul></div>
  </div>
  <div class="fuss-unten"><span>© 2026 ${FIRMA.name}</span><span><a href="impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutz</a> · <a href="${FIRMA.traktorpool}" target="_blank" rel="noopener">Angebote bei traktorpool.de</a></span></div>
</div></footer>`;

function seite({ datei, titel, beschreibung, aktiv, transparent = false, inhalt, vorKopf = '' }) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
${LIVE ? '' : '<meta name="robots" content="noindex, nofollow">\n'}<meta name="theme-color" content="#3c8eed">
<link rel="icon" href="logo.png">
<link rel="stylesheet" href="style.css">
</head>
<body>
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
${kopf(aktiv, transparent)}
<main id="inhalt">
${inhalt}
</main>
${fuss}
<script src="seite.js" defer></script>
</body>
</html>
`;
}

const kontaktBand = `<section class="band"><div class="wrap">
  <h2>Beratung direkt vom Händler</h2>
  <p>Rufen Sie an, schreiben Sie per WhatsApp oder E-Mail. Wir sprechen mit Ihnen über Maschine, Ausstattung und Lieferung.</p>
  <div class="knoepfe">
    <a class="knopf knopf-weiss" href="tel:${FIRMA.telLink}">${FIRMA.tel}</a>
    <a class="knopf knopf-rand" href="https://wa.me/${FIRMA.telLink.slice(1)}">WhatsApp</a>
    <a class="knopf knopf-rand" href="mailto:${FIRMA.mail}">${FIRMA.mail}</a>
  </div>
</div></section>`;

function videoBlock(schluessel) {
  const dateien = fs.existsSync(path.join(WURZEL, 'videos')) ? fs.readdirSync(path.join(WURZEL, 'videos')).filter((f) => f.startsWith(schluessel) && /\.(mp4|webm)$/.test(f)) : [];
  if (!dateien.length) return '';
  return `<section class="abschnitt"><div class="wrap"><h2>Im Einsatz</h2><div class="videos">${dateien
    .map((f) => `<video controls preload="metadata" playsinline${fs.existsSync(path.join(WURZEL, 'videos', f.replace(/\.(mp4|webm)$/, '.jpg'))) ? ` poster="videos/${f.replace(/\.(mp4|webm)$/, '.jpg')}"` : ''}><source src="videos/${f}"></video>`)
    .join('')}</div></div></section>`;
}

// ---------- Startseite ----------
function startseite() {
  const folien = HERO_FOLIEN.map(([f, t, z, link], i) => `<div class="folie${i === 0 ? ' aktiv' : ''}" data-link="${link}"><img src="${foto(f, 2000)}" alt="${esc(t)}"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}><div class="folie-text"><p class="kicker">agroXX techniCCenter</p><h2>${esc(t)}</h2><p class="folie-zeile">${esc(z)}</p><a class="knopf" href="${link}">Mehr erfahren</a></div></div>`).join('\n');
  const heroVideo = fs.existsSync(path.join(WURZEL, 'videos/start.mp4')) ? '<video class="hero-video" src="videos/start.mp4" autoplay muted loop playsinline></video>' : '';
  const kacheln = SEITEN.map((s) => `<a class="kachel" href="${s.datei}"><img src="${foto(s.kachel || s.hero, 1280)}" alt="${esc(s.titel)}" loading="lazy"><span class="kachel-text">${s.exklusiv ? '<b class="marke-exklusiv">Exklusiv bei agroXX</b>' : ''}<small>${esc(s.kicker)}</small><strong>${esc(s.titel)}</strong><em>${esc(s.kurz)}</em></span></a>`).join('\n');
  const tri = SEITEN[0];
  return seite({
    datei: 'index.html', aktiv: 'index.html', transparent: true,
    titel: 'agroXX techniCCenter – Bodenbearbeitung aus Ennigerloh',
    beschreibung: 'agroXX techniCCenter in Ennigerloh: Mulchgrubber TRIPLE-X, Kurzscheibeneggen, Tiefenlockerer, Walzen, Pflüge und mehr. Beratung direkt vom Händler.',
    inhalt: `<section class="hero" aria-roledescription="Bildergalerie" aria-label="Maschinen im Einsatz">
  ${heroVideo}
  ${folien}
  <div class="hero-steuerung">
    <button class="pfeil" data-richtung="-1" aria-label="Vorheriges Bild">‹</button>
    <div class="punkte" role="tablist">${HERO_FOLIEN.map((_, i) => `<button role="tab" aria-label="Bild ${i + 1}"${i === 0 ? ' class="aktiv"' : ''}></button>`).join('')}</div>
    <button class="pfeil" data-richtung="1" aria-label="Nächstes Bild">›</button>
    <button class="pause" aria-label="Wechsel anhalten">Pause</button>
  </div>
  <a class="runter" href="#start" aria-label="Nach unten"></a>
</section>

<section class="abschnitt" id="start"><div class="wrap schmal">
  <p class="kicker blau">Bodenbearbeitung aus Ennigerloh</p>
  <h1>Maschinen, die im Boden überzeugen.</h1>
  <p class="gross">Mulchgrubber, Kurzscheibeneggen, Tiefenlockerer und Frontanbau aus der agroXX-Linie, dazu die Onland-Schälpflüge von ESCUDERO und das Cambridge-Walzenprogramm von Quivogne. Wir beraten Sie als Händler persönlich und sprechen Ihre Sprache, in elf Sprachen.</p>
</div></section>

<section class="kacheln wrap" aria-label="Programm">
${kacheln}
</section>

<section class="schwerpunkt"><div class="wrap schwer-grid">
  <img src="${foto('IMG_6071', 1600)}" alt="Mulchgrubber TRIPLE-X" loading="lazy">
  <div>
    <p class="kicker blau">Unser Schwerpunkt</p>
    <h2>TRIPLE-X Mulchgrubber</h2>
    <p>${esc(tri.lead)}</p>
    <ul class="zahlen">${tri.zahlen.map(([z, b]) => `<li><strong>${esc(z)}</strong><span>${esc(b)}</span></li>`).join('')}</ul>
    <a class="knopf knopf-blau" href="grubber.html">Alle Details zum TRIPLE-X</a>
  </div>
</div></section>

<section class="vollbild"><img src="${foto('IMG_5684', 2000)}" alt="AVATERRA Kurzscheibenegge mit ausgeklappten Walzen" loading="lazy"><div class="wrap"><p class="vollbild-text">Aus Ennigerloh für Ihren Boden.</p></div></section>

<section class="schwerpunkt exklusiv-block"><div class="wrap schwer-grid umgekehrt">
  <div>
    <p class="kicker blau">Exklusiv bei agroXX</p>
    <h2>ESCUDERO Ecologic Onland Schälpflüge</h2>
    <p>Die Ecologic Onland Dreh-Schälpflüge von ESCUDERO sind in Deutschland exklusiv über agroXX erhältlich. Sie pflügen in der Furche und schonen so den Boden.</p>
    <a class="knopf knopf-blau" href="pfluege.html">Zu den Schälpflügen</a>
  </div>
  <img src="${foto('4995195-28536732', 1600)}" alt="ESCUDERO Ecologic Onland Schälpflug" loading="lazy">
</div></section>

<section class="abschnitt"><div class="wrap schmal">
  <h2>Marken im Programm</h2>
  <p class="marken">${FIRMA_JSON.marken.map(esc).join(' · ')}</p>
  <p>Sprachen: ${FIRMA_JSON.sprachen.map(esc).join(', ')}.</p>
  <p><a href="${FIRMA.traktorpool}" target="_blank" rel="noopener">Aktuellen Bestand mit Preisen bei traktorpool.de ansehen</a></p>
</div></section>

${kontaktBand}`,
  });
}

// ---------- Produktseiten ----------
// Bildgruppe: Text links, Foto-Mosaik rechts (abwechselnd), großes Foto zuerst
function bildgruppe(s, titel, text, fotos, nr) {
  return `<section class="abschnitt bildgruppe${nr % 2 ? '' : ' hell'}"><div class="wrap bg-grid${nr % 2 ? '' : ' umgekehrt'}">
  <div class="bg-text"><p class="kicker blau">${esc(s.kicker)}</p><h2>${esc(titel)}</h2><p>${esc(text)}</p></div>
  <div class="mosaik">${fotos.map((f, i) => `<a href="${gross(f)}" data-gross><img src="${foto(f, i === 0 ? 1400 : 900)}" alt="${esc(titel)}, Bild ${i + 1}" loading="lazy"></a>`).join('')}</div>
</div></section>`;
}
const bildgruppenHtml = (s) => s.bildgruppen.map(([t, x, f], i) => bildgruppe(s, t, x, f, i)).join('\n');

function produktseite(s) {
  const katListe = [].concat(s.tabelleFilter); const alle = katListe.flatMap((k) => modelle(k)); const rest = new Set(alle);
  const gruppenHtml = s.gruppen.map(([n, t, re]) => { const l = alle.filter((m) => re.test(m.titel)); l.forEach((m) => rest.delete(m)); return l.length ? `<div class="untergruppe"><h3>${esc(n)}</h3><p>${esc(t)}</p>${tabelle(l)}</div>` : ''; }).join('');
  const tab = gruppenHtml;
  return seite({
    datei: s.datei, aktiv: s.datei, transparent: true,
    titel: `${s.titel} – agroXX techniCCenter`,
    beschreibung: `${s.titel}: ${s.kurz} agroXX techniCCenter, Ennigerloh.`,
    inhalt: `<section class="seitenkopf"><img src="${foto(s.hero, 2000)}" alt="${esc(s.titel)}" fetchpriority="high"><div class="wrap"><p class="kicker">${esc(s.kicker)}</p><h1>${esc(s.titel)}</h1>${s.exklusiv ? '<p class="exklusiv">In Deutschland exklusiv über agroXX erhältlich</p>' : ''}</div></section>

<section class="abschnitt"><div class="wrap schmal"><p class="gross">${esc(s.lead)}</p></div>
${s.zahlen.length ? `<div class="wrap"><ul class="zahlenband">${s.zahlen.map(([z, b]) => `<li><strong>${esc(z)}</strong><span>${esc(b)}</span></li>`).join('')}</ul></div>` : ''}
</section>

<section class="abschnitt hell"><div class="wrap"><h2>Ausstattung</h2><dl class="punkte-liste">${s.punkte.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></section>

${s.bildgruppen ? bildgruppenHtml(s) : `<section class="abschnitt"><div class="wrap"><h2>Bilder</h2><div class="galerie">${s.galerie.map((f, i) => `<a href="${foto(f, 1600)}" data-gross><img src="${foto(f, 1280)}" alt="${esc(s.titel)}, Bild ${i + 1}" loading="lazy"></a>`).join('')}</div></div></section>`}

${s.trenner ? `<section class="vollbild"><img src="${foto(s.trenner[0], 2000)}" alt="" loading="lazy"><div class="wrap"><p class="vollbild-text">${esc(s.trenner[1])}</p></div></section>` : ''}

${s.werkzeuge ? bildgruppe(s, s.werkzeuge[0], s.werkzeuge[1], s.werkzeuge[2], 1) : ''}

${videoBlock(s.videos)}
${s.youtube ? `<section class="abschnitt"><div class="wrap schmal"><h2>Weitere Videos</h2><ul class="linkliste">${s.youtube.map(([u, t]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul><p class="klein">Diese Links führen zu YouTube. Erst beim Anklicken werden Daten an YouTube übertragen.</p></div></section>` : ''}
${tab ? `<section class="abschnitt hell"><div class="wrap"><h2>Baugrößen und Ausführungen</h2>${tab}<p class="klein">Angaben ohne Gewähr. Aktuelle Verfügbarkeit und Preise erfragen Sie bitte direkt bei uns.</p></div></section>` : ''}

${kontaktBand}`,
  });
}

// ---------- Kontakt und Rechtliches ----------
const kontaktSeite = seite({
  datei: 'kontakt.html', aktiv: 'kontakt.html', titel: 'Kontakt – agroXX techniCCenter', beschreibung: 'Kontakt zum agroXX techniCCenter in Ennigerloh: Telefon, WhatsApp, E-Mail und Adresse.',
  inhalt: `<section class="abschnitt kopfabstand"><div class="wrap schmal">
  <p class="kicker blau">Kontakt</p><h1>Sprechen wir über Ihre Maschine.</h1>
  <div class="kontakt-grid">
    <div><h2>${FIRMA.name}</h2><p>Inh. ${FIRMA.inhaber}<br>${FIRMA.strasse}<br>${FIRMA.ort}</p></div>
    <div><h2>Erreichbar</h2><p>Mobil: <a href="tel:${FIRMA.telLink}">${FIRMA.tel}</a><br>WhatsApp: <a href="https://wa.me/${FIRMA.telLink.slice(1)}">Nachricht schreiben</a><br>E-Mail: <a href="mailto:${FIRMA.mail}">${FIRMA.mail}</a></p></div>
  </div>
  <p><a href="${FIRMA.traktorpool}" target="_blank" rel="noopener">Unser aktuelles Angebot bei traktorpool.de</a></p>
</div></section>
${kontaktBand}`,
});

const impressum = seite({
  datei: 'impressum.html', aktiv: '', titel: 'Impressum – agroXX techniCCenter', beschreibung: 'Impressum des agroXX techniCCenter.',
  inhalt: `<section class="abschnitt kopfabstand"><div class="wrap schmal rechtstext">
<h1>Impressum</h1>
<h2>Angaben gemäß § 5 DDG</h2><p><strong>${FIRMA.name}</strong><br>Inhaber: ${FIRMA.inhaber}<br>${FIRMA.strasse}<br>${FIRMA.ort}<br>Deutschland</p>
<h2>Kontakt</h2><p>Mobil: <a href="tel:${FIRMA.telLink}">${FIRMA.tel}</a><br>E-Mail: <a href="mailto:${FIRMA.mail}">${FIRMA.mail}</a></p>
<h2>Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h2><p>${FIRMA.inhaber}, Anschrift wie oben.</p>
<h2>Verbraucherstreitbeilegung</h2><p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung für Inhalte</h2><p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben unberührt. Alle Angaben zu Maschinen und Ausstattung sind freibleibend und ohne Gewähr.</p>
<h2>Haftung für Links</h2><p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
<h2>Urheberrecht</h2><p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.</p>
</div></section>`,
});

const datenschutz = seite({
  datei: 'datenschutz.html', aktiv: '', titel: 'Datenschutz – agroXX techniCCenter', beschreibung: 'Datenschutzerklärung des agroXX techniCCenter.',
  inhalt: `<section class="abschnitt kopfabstand"><div class="wrap schmal rechtstext">
<h1>Datenschutzerklärung</h1>
<h2>1. Verantwortlicher</h2><p>${FIRMA.name}, ${FIRMA.inhaber}<br>${FIRMA.strasse}, ${FIRMA.ort}<br>Telefon: ${FIRMA.tel}<br>E-Mail: ${FIRMA.mail}</p>
<h2>2. Hosting und Server-Logfiles</h2><p>Diese Website wird über den Dienst GitHub Pages der GitHub Inc. (88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA) bereitgestellt. Beim Aufruf verarbeitet GitHub technisch notwendige Daten, insbesondere die IP-Adresse, Datum und Uhrzeit, die aufgerufene Seite und den verwendeten Browser, um die Seite auszuliefern und abzusichern (Art. 6 Abs. 1 lit. f DSGVO). Dabei kann eine Übermittlung von Daten in die USA stattfinden. Näheres regelt die Datenschutzerklärung von GitHub.</p>
<h2>3. Cookies und Tracking</h2><p>Wir setzen keine Cookies zu Werbe- oder Analysezwecken ein und verwenden keine Tracking-Dienste. Es werden keine externen Schriften, Karten oder Videodienste nachgeladen. Videos werden von dieser Website selbst abgespielt.</p>
<h2>4. Kontaktaufnahme per Telefon, E-Mail oder WhatsApp</h2><p>Wenn Sie uns anrufen, anschreiben oder über WhatsApp kontaktieren, verarbeiten wir Ihre Angaben (z. B. Name, Telefonnummer, Nachricht) zur Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Bei Nutzung von WhatsApp gelten zusätzlich die Datenschutzbestimmungen des Anbieters WhatsApp (Meta). Die Nutzung ist freiwillig. Ihre Daten löschen wir, sobald die Anfrage erledigt ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
<h2>5. Externe Links (traktorpool.de)</h2><p>Diese Seite verlinkt auf unser Angebot bei traktorpool.de. Erst wenn Sie einen Link anklicken, werden Daten an den Betreiber von traktorpool.de übermittelt. Dafür gilt dessen Datenschutzerklärung.</p>
<h2>6. Ihre Rechte</h2><p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Wenden Sie sich dazu an die oben genannte Adresse.</p>
<h2>7. Beschwerderecht</h2><p>Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren. Zuständig ist für uns die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen, Kavalleriestraße 2–4, 40213 Düsseldorf.</p>
<p>Stand: 24.10.2026</p>
</div></section>`,
});

// ---------- Schreiben ----------
const ausgabe = { 'index.html': startseite(), 'kontakt.html': kontaktSeite, 'impressum.html': impressum, 'datenschutz.html': datenschutz };
for (const s of SEITEN) ausgabe[s.datei] = produktseite(s);
for (const [d, inhalt] of Object.entries(ausgabe)) fs.writeFileSync(path.join(WURZEL, d), inhalt);
fs.writeFileSync(path.join(WURZEL, 'robots.txt'), LIVE ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
await bilderErzeugen();
console.log(`${Object.keys(ausgabe).length} Seiten, ${benutzt.size} Fotos, Modus ${LIVE ? 'LIVE' : 'Vorstellung (noindex)'}`);
