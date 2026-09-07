// Loopback-only local verification; never used by Vercel functions.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try { process.loadEnvFile(path.join(root, '.env.local')) } catch (e) { if (e.code !== 'ENOENT') throw e }
process.env.NODE_ENV = 'development'
if (process.argv.includes('--synthetic')) {
  process.env.DASHBOARD_PASSWORD = 'synthetic-local-check-only'
  process.env.SESSION_SECRET = 'synthetic-local-session-secret-only-123456789'
  process.env.FORMSPREE_READ_KEY = 'synthetic-never-sent'
  const actualFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://formspree.io/api/0/forms/xkgknpkl/submissions')) {
      const old = new Date(Date.now() - 40 * 86400000).toISOString()
      return new Response(JSON.stringify({ submissions: [
        { _id:'synthetic-1',_date:new Date().toISOString(),name:'Synthetic verification',email:'synthetic@example.com',message:'Synthetic data only.\n\n'+ 'A longer synthetic note for testing the full submission view. '.repeat(60) + '\nFINAL MESSAGE LINE',notes:'Additional synthetic notes.\nKeep this separate paragraph visible.',form_key:'contact',whichBestDescribesYou:'new_patient' },
        { _id:'synthetic-2',_date:old,name:'Synthetic older record',utm_source:'google',message:'Older synthetic row' },
        { _id:'synthetic-3',_date:new Date().toISOString(),name:'Synthetic marked test',_codex_test:true,utm_source:'chatgpt',form_key:'chatgpt_ads_consultation' },
        { _id:'synthetic-4',name:'Synthetic undated record',utm_source:'constructor' }
      ] }), { headers: { 'content-type':'application/json' } })
    }
    return actualFetch(url, options)
  }
}
const handlers = Object.fromEntries(await Promise.all(['login','logout','session','leads'].map(async name => [name,(await import(`../api/${name}.js`)).default])))
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}
http.createServer(async (req,res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname
    res.setHeader('Cache-Control','no-store')
    if (pathname.startsWith('/api/')) {
      const handler = handlers[pathname.slice(5)]
      if (!handler) { res.writeHead(404); return res.end() }
      let body = ''
      for await (const chunk of req) { body += chunk; if (body.length > 4096) { res.writeHead(413); return res.end() } }
      if (body) { try { req.body = JSON.parse(body) } catch { res.writeHead(400); return res.end() } }
      res.status = code => { res.statusCode=code; return res }
      res.json = value => res.end(JSON.stringify(value))
      return await handler(req,res)
    }
    let file = path.resolve(root,'dist','.'+decodeURIComponent(pathname))
    if (!file.startsWith(path.join(root,'dist')+path.sep)) file=path.join(root,'dist','index.html')
    try { if (!(await fs.stat(file)).isFile()) file=path.join(root,'dist','index.html') } catch { file=path.join(root,'dist','index.html') }
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream')
    res.end(await fs.readFile(file))
  } catch { res.writeHead(500); res.end('Local request failed') }
}).listen(4317,'127.0.0.1',()=>console.log('Local dashboard: http://localhost:4317 (loopback only)'))
