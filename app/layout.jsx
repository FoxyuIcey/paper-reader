import 'pdfjs-dist/web/pdf_viewer.css'
import './style.css'

export const metadata = {
  title: 'Paper Reader · 文献阅读工作台',
  description: 'PDF 原文与康奈尔式伴读笔记',
}

export default function Layout({ children }) {
  return <html lang="zh-CN"><body>{children}</body></html>
}
