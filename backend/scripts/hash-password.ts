// Generates the value for the PASSWORD_HASH env var. Run this once to set up
// (or later, to change) the single password that gates the whole API — there's
// no database row involved, just an env var checked by POST /login.
//
// Usage: npm run hash-password
// Then paste the printed value into backend/.env locally, and into Render's
// environment variables for the deployed API.

import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { hashPassword } from '../src/lib/password.js'

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout })
  // Not masked — this is a local, one-time interactive script. Run it
  // somewhere private.
  const password = await rl.question('New password (not masked while typing): ')
  rl.close()

  if (!password) {
    console.error('Password is required.')
    process.exit(1)
  }

  const hash = await hashPassword(password)
  console.log('\nPASSWORD_HASH value — paste this into .env and Render:\n')
  console.log(hash)
}

main()
