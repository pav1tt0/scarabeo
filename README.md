# Scarabeo Splash Solver

PWA per trovare tutte le parole valide nella griglia 4x4 di Scarabeo Splash (adiacenze anche diagonali, niente riuso, minimo 3 lettere).

## Avvio rapido

```bash
npm install
npm run dev
```

## Dizionario

Il file `public/words-it.txt` usa la lista MIT di parole italiane dal progetto napolux/paroleitaliane, filtrata per rimuovere parole tronche/rare e mantenere termini più puliti.
Fonte: https://github.com/napolux/paroleitaliane

Puoi sostituirla con un'altra wordlist (una parola per riga) oppure caricare un file `.txt` direttamente dall'interfaccia.

## Input

Inserisci manualmente le lettere nella griglia 4x4.
