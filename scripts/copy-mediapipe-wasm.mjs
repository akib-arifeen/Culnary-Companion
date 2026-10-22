import { cpSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const dest = join(root, 'public', 'mediapipe', 'wasm')

mkdirSync(dest, { recursive: true })
const files = readdirSync(src)
for (const f of files) cpSync(join(src, f), join(dest, f), { force: true })
console.log(`copied ${files.length} MediaPipe wasm files to public/mediapipe/wasm`)
