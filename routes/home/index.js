import { react, html, css } from 'https://unpkg.com/rplus'
import ProjectBadge from '../../components/ProjectBadge.js'
import Editor from '../../components/editor.js'
const styles = css`/routes/home/index.css`

export default () => {
  const [entry, setEntry] = react.useState('')
  const [code, setCode] = react.useState([])
  const [meta, setMeta] = react.useState({
    imports: [],
    exports: [],
  })
  const [displayedOverlay, toggleDisplayed] = react.useState(false)

  react.useEffect(() => {
    if (displayedOverlay) {
      window.localStorage.setItem('displayedOverlay', true)
    }
  }, [displayedOverlay])

  react.useEffect(() => {
    const go = () => {
      const entry =
        window.location.search === ''
          ? 'lodash-es'
          : window.location.search.slice(1).replace(/\/$/, '')

      fetch(`https://unpkg.com/${entry}`).then(async res => {
        const text = await res.text()
        setCode(text)

        const size = text.length
        const url = res.url
        const base = url.replace(/\/[^\/]*\.js/, '')
        const imports = [
          ...(text.match(/(?<=(import|export).*from ['"]).*(?=['"])/g) || []),
          ...(text.match(/(?<=require\(['"])[^)]*(?=['"]\))/g) || []),
        ]

        setEntry(url.replace('https://unpkg.com/', ''))

        Promise.all(
          imports.map(x =>
            fetch(
              x.startsWith('./')
                ? base + x.replace('./', '/')
                : x.startsWith('https://')
                ? x
                : 'https://unpkg.com/' + x
            )
              .then(res => res.text())
              .then(res => ({ [x]: res }))
          )
        ).then(deps => {
          setMeta({
            size,
            imports: deps.reduce((a, b) => ({ ...a, ...b }), {}),
          })
        })
      })
    }

    // Rerender the app when pushState or replaceState are called
    ;['pushState', 'replaceState'].map(event => {
      const original = window.history[event]
      window.history[event] = function() {
        original.apply(history, arguments)
        go()
      }
    })
    // Rerender when the back and forward buttons are pressed
    addEventListener('popstate', go)
    history.replaceState({}, null, location.search)
  }, [])

  return html`
    <main class=${styles}>
      <article>
        ${code.length < 200000 || window.location.hash === '#supercomputer'
          ? html`
              <${Editor}
                value=${code}
                style=${{ lineHeight: '138%' }}
                onValueChange=${code => setCode(code)}
              />
            `
          : html`
              <pre>${code}</pre>
            `}
      </article>
      <aside>
        <h1 onClick=${() => history.pushState(null, null, '?' + entry)}>
          ${entry.split('/')[0]}
        </h1>
        <h2>
          ${entry.match(/\/.*$/) || 'index.js'} ${' '}(${meta.size} B)
        </h2>
        <div>
          <h3>Dependencies</h3>
          <span>${Object.keys(meta.imports).length}</span>
        </div>
        <ul>
          ${Object.entries(meta.imports).map(
            ([x, v]) =>
              html`
                <li
                  onClick=${e =>
                    history.pushState(
                      null,
                      null,
                      '?' +
                        (x.startsWith('./')
                          ? entry.replace(/\/[^\/]*\.js/, '') +
                            x.replace('./', '/')
                          : x.replace('https://unpkg.com/', ''))
                    )}
                >
                  <b>${x.replace('.js', '')}</b>
                  <span>${v.length} B</span>
                </li>
              `
          )}
        </ul>
      </aside>
      ${!displayedOverlay &&
        !window.localStorage.displayedOverlay &&
        html`
          <div className="Overlay">
            <${ProjectBadge}
              color="#ca5688"
              abbreviation="De"
              description="Dora Explorer"
              number="43"
            />
            <p>
              Explore, learn about and perform static analysis on npm packages
              in the browser.
            </p>
            <button
              className="Overlay-Button"
              onClick=${() => toggleDisplayed(true)}
            >
              Start Exploring
            </button>
          </div>
        `}
    </main>
  `
}
