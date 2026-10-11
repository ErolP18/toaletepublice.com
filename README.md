# toaletepublice.com

Harta toaletelor publice din România. Proiect personal.

## Hartă

Baza e [OpenStreetMap](https://www.openstreetmap.org/copyright), desenată cu [MapLibre](https://maplibre.org/) și tile-uri vectoriale [OpenFreeMap](https://openfreemap.org/). Nu e nevoie de cheie API.

Acoperă toată țara: județe, orașe, sate, străzi, parcuri, râuri, Carpați, Deltă. La zoom mare apar numele străzilor.

## Date

Punctele din `data/toilets.json` sunt un schelet, ca harta să fie folosibilă. Coordonatele oficiale vor veni de la primării și consilii județene.

Propunerile adăugate din interfață se salvează local, în browser.

## Rulare

```bash
npm install
npm run dev
```

Apoi deschide [http://localhost:3000](http://localhost:3000).
