const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default {
  basePath,
  ...(process.env.GITHUB_PAGES === 'true' ? { output: 'export' } : {}),
}
