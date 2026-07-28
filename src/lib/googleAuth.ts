const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.file'
const TOKEN_KEY = 'daily-tracker:googleToken'

interface StoredToken {
  accessToken: string
  expiresAt: number
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: TokenResponse) => void
          }) => TokenClient
        }
      }
    }
  }
}

let tokenClient: TokenClient | null = null

function getStoredToken(): StoredToken | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredToken
  } catch {
    return null
  }
}

function setStoredToken(token: StoredToken | null) {
  if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  else localStorage.removeItem(TOKEN_KEY)
}

/** Whether Google has ever been connected — stays true even if the access token has expired (that just means a silent/interactive refresh is needed next use). */
export function isGoogleConnected(): boolean {
  return !!getStoredToken()
}

function getValidAccessToken(): string | null {
  const token = getStoredToken()
  if (!token) return null
  if (Date.now() >= token.expiresAt - 60_000) return null
  return token.accessToken
}

function getTokenClient(onToken: (resp: TokenResponse) => void): TokenClient {
  if (!CLIENT_ID) throw new Error('Google Client ID is not configured (VITE_GOOGLE_CLIENT_ID)')
  if (!window.google) throw new Error('Google sign-in script has not loaded yet — try again in a moment')
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: onToken,
    })
  }
  return tokenClient
}

function requestToken(prompt: string): Promise<string | null> {
  return new Promise(resolve => {
    let client: TokenClient
    try {
      client = getTokenClient(resp => {
        if (resp.error || !resp.access_token) {
          resolve(null)
          return
        }
        setStoredToken({ accessToken: resp.access_token, expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 })
        resolve(resp.access_token)
      })
    } catch {
      resolve(null)
      return
    }
    client.requestAccessToken({ prompt })
  })
}

/** Interactive connect — shows Google's consent popup. Call from a user click (e.g. Settings' "Connect" button). */
export function connectGoogle(): Promise<boolean> {
  return requestToken('consent').then(token => token !== null)
}

export function disconnectGoogle(): void {
  setStoredToken(null)
}

/** Returns a usable access token, silently refreshing if the stored one expired. Returns null if never connected or refresh failed (caller should treat that as "not connected"). */
export async function getAccessToken(): Promise<string | null> {
  const existing = getValidAccessToken()
  if (existing) return existing
  if (!isGoogleConnected()) return null
  return requestToken('')
}
