import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const GRID_SIZE = 4
const CELL_COUNT = GRID_SIZE * GRID_SIZE
const EMPTY_GRID = Array.from({ length: CELL_COUNT }, () => '')

const ALPHA_ONLY = /[^A-Z]/g
const DIACRITICS = /[\u0300-\u036f]/g

const normalizeWord = (word) =>
  word
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(ALPHA_ONLY, '')

const buildTrie = (words) => {
  const root = { children: Object.create(null), isWord: false }
  for (const word of words) {
    if (!word || word.length < 3) continue
    let node = root
    for (const ch of word) {
      if (!node.children[ch]) {
        node.children[ch] = { children: Object.create(null), isWord: false }
      }
      node = node.children[ch]
    }
    node.isWord = true
  }
  return root
}

const advanceTrie = (node, tile) => {
  let current = node
  for (const ch of tile) {
    if (!current.children[ch]) return null
    current = current.children[ch]
  }
  return current
}

const solveGrid = (grid, trie, minLength) => {
  const results = new Set()
  const used = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => false)
  )

  const visit = (row, col, node, word) => {
    const tile = grid[row * GRID_SIZE + col]
    if (!tile) return
    const nextNode = advanceTrie(node, tile)
    if (!nextNode) return

    const nextWord = word + tile
    if (nextNode.isWord && nextWord.length >= minLength) {
      results.add(nextWord)
    }

    used[row][col] = true
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue
        if (used[nr][nc]) continue
        visit(nr, nc, nextNode, nextWord)
      }
    }
    used[row][col] = false
  }

  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      visit(r, c, trie, '')
    }
  }

  return Array.from(results)
}

const sanitizeToken = (value) => {
  const clean = value.toUpperCase().replace(ALPHA_ONLY, '')
  if (!clean) return ''
  if (clean.startsWith('Q')) return 'QU'
  return clean.slice(0, 1)
}

const tokensFromText = (text) => {
  const letters = text.toUpperCase().replace(ALPHA_ONLY, '').split('')
  const tokens = []
  for (let i = 0; i < letters.length; i += 1) {
    const current = letters[i]
    const next = letters[i + 1]
    if (current === 'Q' && next === 'U') {
      tokens.push('QU')
      i += 1
    } else {
      tokens.push(current)
    }
  }
  return tokens
}



function App() {
  const [grid, setGrid] = useState(EMPTY_GRID)
  const [minLength, setMinLength] = useState(2)
  const [results, setResults] = useState([])
  const [dictionaryStatus, setDictionaryStatus] = useState('loading')
  const [dictionaryMeta, setDictionaryMeta] = useState({ count: 0, source: 'default' })
  const [trie, setTrie] = useState(null)
  const [notice, setNotice] = useState('')
  const cellRefs = useRef([])

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        setDictionaryStatus('loading')
        const response = await fetch('/words-it.txt')
        const text = await response.text()
        const words = text
          .split(/\r?\n/)
          .map(normalizeWord)
          .filter((word) => word.length >= 3)
        setTrie(buildTrie(words))
        setDictionaryMeta({ count: words.length, source: 'default' })
        setDictionaryStatus('ready')
      } catch (error) {
        setDictionaryStatus('error')
      }
    }

    loadDictionary()
  }, [])

  const stats = useMemo(() => {
    if (!results.length) return { total: 0, longest: 0 }
    const longest = results.reduce((max, word) => Math.max(max, word.length), 0)
    return { total: results.length, longest }
  }, [results])

  const handleCellChange = (index, value) => {
    const next = sanitizeToken(value)
    setGrid((prev) => {
      const updated = [...prev]
      updated[index] = next
      return updated
    })

    if (next) {
      const nextIndex = Math.min(index + 1, CELL_COUNT - 1)
      cellRefs.current[nextIndex]?.focus()
      cellRefs.current[nextIndex]?.select?.()
    }
  }

  const handleCellKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !grid[index]) {
      const prevIndex = Math.max(index - 1, 0)
      cellRefs.current[prevIndex]?.focus()
      cellRefs.current[prevIndex]?.select?.()
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = Math.min(index + 1, CELL_COUNT - 1)
      cellRefs.current[nextIndex]?.focus()
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = Math.max(index - 1, 0)
      cellRefs.current[prevIndex]?.focus()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = Math.min(index + GRID_SIZE, CELL_COUNT - 1)
      cellRefs.current[nextIndex]?.focus()
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prevIndex = Math.max(index - GRID_SIZE, 0)
      cellRefs.current[prevIndex]?.focus()
    }
  }

  const handlePaste = (event) => {
    const text = event.clipboardData?.getData('text') || ''
    if (!text) return
    const tokens = tokensFromText(text)
    if (!tokens.length) return
    event.preventDefault()
    const next = Array.from({ length: CELL_COUNT }, (_, i) => tokens[i] || '')
    setGrid(next)
    const lastIndex = Math.min(tokens.length, CELL_COUNT) - 1
    if (lastIndex >= 0) {
      cellRefs.current[lastIndex]?.focus()
    }
  }

  const handleClear = () => {
    setGrid(EMPTY_GRID)
    setResults([])
    setNotice('')
    cellRefs.current[0]?.focus()
  }

  const handleSolve = () => {
    if (!trie) return
    const filled = grid.filter(Boolean).length
    if (filled < CELL_COUNT) {
      setNotice('Completa tutte le 16 caselle prima di cercare le parole.')
      return
    }
    const found = solveGrid(grid, trie, minLength)
    found.sort((a, b) => b.length - a.length || a.localeCompare(b))
    setResults(found)
    setNotice(found.length ? '' : 'Nessuna parola trovata con il dizionario attuale.')
  }

  const handleDictionaryUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const words = text
      .split(/\r?\n/)
      .map(normalizeWord)
      .filter((word) => word.length >= 3)
    setTrie(buildTrie(words))
    setDictionaryMeta({ count: words.length, source: file.name })
    setDictionaryStatus('ready')
    setResults([])
    setNotice('')
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Scarabeo Splash Solver</p>
          <h1>Trova tutte le parole dalla tua griglia 4x4.</h1>
          <p className="subtitle">
            Inserisci manualmente le lettere (auto‑avance, frecce, incolla 16 lettere).
            Adiacenze anche diagonali, niente riuso nella stessa parola, minimo 2 lettere.
          </p>
        </div>
        <div className="card rules">
          <h2>Regole chiave</h2>
          <ul>
            <li>Parole italiane da dizionario.</li>
            <li>“QU” vale due lettere ma una casella.</li>
            <li>Niente nomi propri o parole duplicate.</li>
            <li>Se appare il simbolo stop, trattalo come “O”.</li>
          </ul>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Griglia 4x4</h2>
          <div className="status">
            <span className={`pill ${dictionaryStatus}`}>
              Dizionario: {dictionaryStatus === 'ready' ? 'pronto' : dictionaryStatus}
            </span>
            <span className="pill">{dictionaryMeta.count} parole</span>
          </div>
        </div>

        <div className="grid" onPaste={handlePaste}>
          {grid.map((value, index) => (
            <input
              key={index}
              className="cell"
              value={value}
              onChange={(event) => handleCellChange(index, event.target.value)}
              onKeyDown={(event) => handleCellKeyDown(event, index)}
              ref={(el) => {
                cellRefs.current[index] = el
              }}
              inputMode="text"
              maxLength={2}
              aria-label={`Lettera ${index + 1}`}
            />
          ))}
        </div>

        <div className="controls">
          <button className="primary" onClick={handleSolve}>
            Cerca parole
          </button>
          <button className="ghost" onClick={handleClear}>
            Svuota griglia
          </button>
          <label className="ghost file">
            Carica dizionario
            <input type="file" accept=".txt" onChange={handleDictionaryUpload} />
          </label>
        </div>

        <div className="slider">
          <label htmlFor="min-length">Lunghezza minima: {minLength}</label>
          <input
            id="min-length"
            type="range"
            min="2"
            max="8"
            value={minLength}
            onChange={(event) => setMinLength(Number(event.target.value))}
          />
        </div>

        {notice && <p className="notice">{notice}</p>}
      </section>

      <section className="panel results">
        <div className="panel-header">
          <h2>Risultati</h2>
          <div className="status">
            <span className="pill">Totale: {stats.total}</span>
            <span className="pill">Max: {stats.longest} lettere</span>
          </div>
        </div>
        {results.length ? (
          <div className="word-list">
            {results.map((word) => (
              <div className="word" key={word}>
                <span>{word}</span>
                <span className="length">{word.length}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">Ancora nessuna parola trovata.</p>
        )}
      </section>

      <footer className="footer">
        <p>
          PWA pronta per l’installazione: apri dal browser mobile e “Aggiungi a
          schermata Home”.
        </p>
      </footer>
    </div>
  )
}

export default App
