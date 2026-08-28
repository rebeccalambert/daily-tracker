// One-command smoke test for the whole backend: health check, login, and
// all four /items endpoints, end to end against a real running server.
//
// Usage:
//   SMOKE_TEST_PASSWORD=yourpassword npm run smoke-test
//
// If a server is already running at BASE_URL, this uses it as-is. Otherwise
// it starts one itself (and shuts it down again when done) — either way,
// you get one command and a pass/fail summary.

import { spawn, type ChildProcess } from 'node:child_process'

const BASE_URL = process.env.SMOKE_TEST_URL ?? 'http://localhost:3001'
const PASSWORD = process.env.SMOKE_TEST_PASSWORD

type Result = { name: string; pass: boolean; note: string }
const results: Result[] = []

function record(name: string, pass: boolean, note: string) {
  results.push({ name, pass, note })
  console.log(`${pass ? '✅' : '❌'} ${name} — ${note}`)
}

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs: number): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

async function runChecks() {
  // 1. Health check — proves the app is up AND can reach the real database.
  try {
    const res = await fetch(`${BASE_URL}/health`)
    const body = await res.json()
    record('Health check', res.ok && body.db === 'connected', `status ${res.status}, db=${body.db}`)
  } catch (err: any) {
    record('Health check', false, `request failed: ${err.message}`)
  }

  // 2. Login
  let token = ''
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    })
    const body = await res.json()
    token = body.token ?? ''
    record('Login', res.ok && !!token, res.ok ? 'got a token' : `status ${res.status}: ${body.error}`)
  } catch (err: any) {
    record('Login', false, `request failed: ${err.message}`)
  }

  if (!token) {
    record('Remaining checks', false, 'skipped — no token from login, nothing else can be tested')
    return
  }
  const auth = { Authorization: `Bearer ${token}` }

  // 3. Unauthenticated request rejected
  {
    const res = await fetch(`${BASE_URL}/items`)
    record('Unauthenticated request rejected', res.status === 401, `status ${res.status}`)
  }

  // 4. Authenticated list
  {
    const res = await fetch(`${BASE_URL}/items`, { headers: auth })
    const body = await res.json()
    record('Authenticated list', res.ok && Array.isArray(body), `status ${res.status}, ${Array.isArray(body) ? body.length : '?'} item(s)`)
  }

  // 5. Create an item
  let id = ''
  {
    const res = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'todo', recurrence: 'once', text: 'Smoke test item' }),
    })
    const body = await res.json()
    id = body.id ?? ''
    record('Create item', res.status === 201 && !!id, res.status === 201 ? `created id ${id}` : `status ${res.status}`)
  }

  if (!id) {
    record('Remaining item checks', false, 'skipped — item creation failed, nothing to update/delete')
    return
  }

  // 6. Mark it completed
  {
    const res = await fetch(`${BASE_URL}/items/${id}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    const body = await res.json()
    record('Update item', res.ok && body.completed === true, `status ${res.status}, completed=${body.completed}`)
  }

  // 7. Delete it
  {
    const res = await fetch(`${BASE_URL}/items/${id}`, { method: 'DELETE', headers: auth })
    record('Delete item', res.status === 204, `status ${res.status}`)
  }

  // 8. Deleting again should 404 — proves it's actually gone
  {
    const res = await fetch(`${BASE_URL}/items/${id}`, { method: 'DELETE', headers: auth })
    record('Delete already-deleted item rejected', res.status === 404, `status ${res.status}`)
  }
}

async function main() {
  if (!PASSWORD) {
    console.error('SMOKE_TEST_PASSWORD is not set. Usage:\n  SMOKE_TEST_PASSWORD=yourpassword npm run smoke-test')
    process.exit(1)
  }

  let startedServer: ChildProcess | null = null

  if (await isServerUp()) {
    console.log(`Using already-running server at ${BASE_URL}\n`)
  } else {
    console.log(`No server running at ${BASE_URL} — starting one...\n`)
    startedServer = spawn('npx', ['tsx', 'src/index.ts'], { stdio: 'ignore' })
    const up = await waitForServer(15_000)
    if (!up) {
      console.error('Server did not become healthy within 15s.')
      startedServer.kill()
      process.exit(1)
    }
  }

  await runChecks()

  if (startedServer) {
    startedServer.kill()
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed.`)
  if (failed.length > 0) {
    console.log('Failed:', failed.map((r) => r.name).join(', '))
    process.exit(1)
  }
}

main()
