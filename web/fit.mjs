/* Throwaway: the hero lines are white-space: nowrap above 760px, so new copy can
   silently overhang the column instead of wrapping. This measures the rendered
   widths against the container at the widths that matter. Delete after use. */
import { spawn } from 'node:child_process'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9224
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (p) return p.webSocketDebuggerUrl
    } catch {
      /* not up */
    }
    await sleep(250)
  }
  throw new Error('no devtools')
}

function cdp(ws) {
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    }
  })
  return (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id
      pending.set(mid, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)))
      ws.send(JSON.stringify({ id: mid, method, params }))
    })
}

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '\\rl-fit-profile',
  'about:blank',
])

try {
  const ws = new WebSocket(await wsUrl())
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  const send = cdp(ws)
  await send('Page.enable')
  await send('Runtime.enable')

  for (const w of [1440, 1100, 900, 780, 760, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 900,
      deviceScaleFactor: 1,
      mobile: w < 700,
    })
    await send('Page.navigate', { url: 'http://localhost:5173/' })
    await sleep(1800)
    const { result } = await send('Runtime.evaluate', {
      expression: `(() => {
        const t = document.querySelector('.h2c-hero__title');
        const s = document.querySelector('.h2c-hero__sub');
        const box = document.querySelector('.h2c-hero');
        const m = (el) => {
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), lines: Math.round(r.height / parseFloat(getComputedStyle(el).lineHeight)) };
        };
        return JSON.stringify({ box: Math.round(box.getBoundingClientRect().width),
          vw: innerWidth, title: m(t), sub: m(s) });
      })()`,
      returnByValue: true,
    })
    const r = JSON.parse(result.value)
    const overT = r.title.w > r.box
    const overS = r.sub.w > r.box
    console.log(
      `${String(w).padStart(4)}px  col=${String(r.box).padStart(3)}  ` +
        `title=${String(r.title.w).padStart(3)}(${r.title.lines}L)${overT ? ' OVERHANG' : ''}  ` +
        `sub=${String(r.sub.w).padStart(3)}(${r.sub.lines}L)${overS ? ' OVERHANG' : ''}`,
    )
  }
  // and one look at the result
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 760,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: 'http://localhost:5173/' })
  await sleep(2200)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const { writeFile, mkdir } = await import('node:fs/promises')
  await mkdir('shots', { recursive: true })
  await writeFile('shots/hero-new.png', Buffer.from(data, 'base64'))
  console.log('captured shots/hero-new.png')

  ws.close()
} finally {
  chrome.kill()
}
