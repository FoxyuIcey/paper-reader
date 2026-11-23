'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import paper from './paper.json'
import anchors from './anchors.json'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const groups = paper.groups
const pages = [...new Set(groups.map(group => group.page))]
const storageKey = 'paper-reader:v1:' + paper.id

function PdfPage({ pdf, number, width, active }) {
  const canvas = useRef(null)
  const layer = useRef(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!pdf) return
    let stopped = false
    let drawing, textLayer
    const surface = canvas.current
    const container = layer.current
    async function render() {
      const [api, page] = await Promise.all([import('pdfjs-dist'), pdf.getPage(number)])
      if (stopped) return
      const scale = width / 560
      const viewport = page.getViewport({ scale })
      const density = window.devicePixelRatio || 1
      surface.width = Math.ceil(viewport.width * density)
      surface.height = Math.ceil(viewport.height * density)
      container.replaceChildren()
      textLayer = new api.TextLayer({ textContentSource: page.streamTextContent(), container, viewport })
      drawing = page.render({ canvas: surface, viewport, transform: [density, 0, 0, density, 0, 0] })
      await Promise.all([drawing.promise, textLayer.render()])
    }
    render().then(() => { if (!stopped) setError(false) }).catch(() => { if (!stopped) setError(true) })
    return () => {
      stopped = true
      drawing?.cancel()
      textLayer?.cancel()
    }
  }, [pdf, number, width])

  return <div className="sheet" style={{ width, height: width * 720 / 560, '--scale-factor': width / 560 }} aria-label={`PDF 第 ${number} 页`}>
    <canvas ref={canvas} />
    {error && <p className="pdf-error" role="alert">第 {number} 页渲染失败。请刷新重试。</p>}
    {groups.filter(group => group.page === number).map(group =>
      anchors[group.id].map(([top, height], index) =>
        <div key={group.id + index} data-anchor={index === 0 ? group.id : undefined}
          className={`mark ${active === group.id ? 'marked' : ''}`}
          style={{ top: top * 100 + '%', height: height * 100 + '%' }} />))}
    <div ref={layer} className="textLayer" />
  </div>
}

export default function Reader() {
  const [pdf, setPdf] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [mode, setMode] = useState('beginner')
  const [active, setActive] = useState(groups[0].id)
  const [notes, setNotes] = useState({})
  const [saveStatus, setSaveStatus] = useState('')
  const [available, setAvailable] = useState(560)
  const [zoom, setZoom] = useState(100)
  const [ratio, setRatio] = useState(57)
  const [swapped, setSwapped] = useState(false)
  const original = useRef(null)
  const notebook = useRef(null)
  const columns = useRef(null)
  const resizePosition = useRef(null)
  const origin = useRef('initial')
  const current = groups.find(group => group.id === active)
  const width = Math.round(Math.max(210, available - 52) * zoom / 100)

  useEffect(() => {
    let stopped = false
    let task
    import('pdfjs-dist').then(api => {
      if (stopped) return
      api.GlobalWorkerOptions.workerSrc = basePath + '/pdf.worker.min.mjs'
      task = api.getDocument({ url: basePath + '/sample.pdf' })
      return task.promise
    }).then(document => {
      if (!stopped) setPdf(document)
    }).catch(() => { if (!stopped) setLoadError(true) })
    return () => {
      stopped = true
      task?.destroy().catch(() => {})
    }
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
      setNotes(Object.fromEntries(groups.filter(group => typeof saved?.[group.id] === 'string')
        .map(group => [group.id, saved[group.id]])))
    } catch {
      setSaveStatus('无法读取本地笔记')
    }
  }, [])

  function rememberPosition() {
    const panel = original.current
    resizePosition.current = panel.scrollTop / (panel.firstElementChild.offsetHeight || 1)
  }

  useLayoutEffect(() => {
    const panel = original.current
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.floor(entry.contentRect.width)
      if (nextWidth === panel.dataset.width * 1) return
      rememberPosition()
      panel.dataset.width = nextWidth
      setAvailable(nextWidth)
    })
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (resizePosition.current === null) return
    original.current.scrollTop = resizePosition.current * original.current.firstElementChild.offsetHeight
    resizePosition.current = null
  }, [width])

  useLayoutEffect(() => {
    if (origin.current !== 'scroll') return
    const panel = notebook.current
    const card = panel.querySelector(`[data-note="${active}"]`)
    const outer = panel.getBoundingClientRect()
    const inner = card.getBoundingClientRect()
    if (inner.top < outer.top || inner.bottom > outer.bottom) {
      panel.scrollTop += inner.top - outer.top - 2
    }
  }, [active])

  function follow() {
    const panel = original.current
    if (panel.scrollTop < 1) {
      origin.current = 'scroll'
      setActive(groups[0].id)
      return
    }
    const line = panel.getBoundingClientRect().top + Math.min(panel.clientHeight * 0.23, 145)
    const visible = Array.from(panel.querySelectorAll('[data-anchor]'))
    const nearest = visible.findLast(node => node.getBoundingClientRect().top <= line)
    origin.current = 'scroll'
    setActive(nearest?.dataset.anchor || groups[0].id)
  }

  function jump(group) {
    const panel = original.current
    const target = panel.querySelector(`[data-anchor="${group.id}"]`)
    const offset = target.getBoundingClientRect().top - panel.getBoundingClientRect().top
    panel.scrollTop += offset - Math.min(panel.clientHeight * .23, 145) + 2
    origin.current = 'click'
    setActive(group.id)
  }

  function save(id, content) {
    const next = { ...notes, [id]: content }
    setNotes(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setSaveStatus('已保存到此浏览器')
    } catch {
      setSaveStatus('保存失败，笔记仅保留在当前页面')
    }
  }

  return <main>
    <header className="mast">
      <div className="brand"><span className="logo" aria-hidden="true">▤</span>Paper Reader <small>V0.1</small></div>
      <div className="mode" role="group" aria-label="阅读模式">
        <button aria-pressed={mode === 'beginner'} onClick={() => setMode('beginner')}>新手模式</button>
        <button aria-pressed={mode === 'advanced'} onClick={() => setMode('advanced')}>熟手模式</button>
      </div>
    </header>
    <section className="heading">
      <div><div className="eyebrow">阅读工作台 <span>/</span> 示例论文</div><h1>{paper.title}</h1></div>
      <div className="progress" aria-label="阅读位置">{groups.indexOf(current) + 1} / {groups.length} 段落组
        <progress max={groups.length} value={groups.indexOf(current) + 1} />
      </div>
    </section>
    <div ref={columns} className={`columns ${swapped ? 'swapped' : ''}`} style={{ '--paper-ratio': ratio + '%' }}>
      <section className="pane paper" aria-label="论文原文">
        <div className="toolbar">
          <h2><span aria-hidden="true">▧</span> 论文原文</h2>
          <div className="controls">
            <select aria-label="跳转页码" value={current.page} onChange={event => jump(groups.find(group => group.page === Number(event.target.value)))}>
              {pages.map(page => <option key={page} value={page}>第 {page} / {pages.length} 页</option>)}
            </select>
            <button aria-label="缩小" disabled={zoom <= 70} onClick={() => { rememberPosition(); setZoom(zoom - 15) }}>−</button>
            <span className="zoom">{zoom}%</span>
            <button aria-label="放大" disabled={zoom >= 175} onClick={() => { rememberPosition(); setZoom(zoom + 15) }}>+</button>
          </div>
        </div>
        <div ref={original} data-testid="original" className="original" onScroll={follow} tabIndex={0} aria-label="PDF 滚动区域">
          <div className="sheets" style={{ minWidth: width + 32 }}>
            {!pdf && <p className="loading" role={loadError ? 'alert' : 'status'}>{loadError ? 'PDF 加载失败，请刷新重试。' : '正在加载 PDF…'}</p>}
            {pages.map(number => <PdfPage key={number} {...{ pdf, number, width, active }} />)}
            <div className="end-space" />
          </div>
        </div>
      </section>
      <div className="divider" role="separator" aria-label="调整分栏宽度" aria-orientation="vertical"
        aria-valuemin={40} aria-valuemax={70} aria-valuenow={ratio} tabIndex={0}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
          event.preventDefault()
          const delta = event.key === 'ArrowRight' ? 2 : -2
          setRatio(Math.max(40, Math.min(70, ratio + (swapped ? -delta : delta))))
        }}
        onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
        onPointerMove={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          const bounds = columns.current.getBoundingClientRect()
          const left = (event.clientX - bounds.left) / bounds.width * 100
          setRatio(Math.max(40, Math.min(70, swapped ? 100 - left : left)))
        }} />
      <section className="pane notes" aria-label="康奈尔伴读">
        <div className="toolbar">
          <h2><span aria-hidden="true">✦</span> 康奈尔伴读</h2>
          <div className="controls"><span className="preset">预设解读</span><button aria-label="交换左右分栏" title="交换左右分栏" onClick={() => setSwapped(!swapped)}>⇄</button></div>
        </div>
        <aside className="focus">
          <div className="focus-label"><i /> 当前阅读重点 <span>{current.section}</span></div>
          <h3>{current.cue}</h3>
          <p>{current[mode]}</p>
        </aside>
        <div ref={notebook} className="notebook" aria-label="段落组笔记">
          {groups.map((group, index) => <article key={group.id} data-note={group.id} aria-current={active === group.id ? 'location' : undefined}>
            <button className="source" onClick={() => jump(group)} aria-label={`定位原文：${group.label}`}>
              <span><b>{String(index + 1).padStart(2, '0')}</b> {group.label}</span><span>第 {group.page} 页 ↗</span>
            </button>
            <div className="cornell">
              <h3>{group.cue}</h3><p>{group[mode]}</p>
            </div>
            <div className="actions">
              <details>
                <summary>展开精读 · {group.paragraphs.length} 段</summary>
                {group.paragraphs.map(([text, beginner, advanced], i) => <div className="detail" key={text}>
                  <b>第 {i + 1} 段</b><blockquote lang="en">{text}</blockquote><p>{mode === 'beginner' ? beginner : advanced}</p>
                </div>)}
              </details>
              <details>
                <summary>{notes[group.id] ? '编辑我的笔记' : '＋ 我的笔记'}</summary>
                <textarea aria-label={`${group.label}的个人笔记`} placeholder="记录你的想法或疑问…" value={notes[group.id] || ''} onChange={event => save(group.id, event.target.value)} />
              </details>
            </div>
          </article>)}
        </div>
        <footer className="status" role="status">{saveStatus || '个人笔记自动保存在此浏览器'}</footer>
      </section>
    </div>
  </main>
}
