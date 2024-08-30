import { fileURLToPath } from 'node:url'
import { basename } from 'node:path'
import { promises as fs } from 'node:fs'
import { describe, expect, it, onTestFailed } from 'vitest'
import fg from 'fast-glob'
import { JavaScriptScanner } from '../../../core/src/engines/javascript'
import type { Instance } from './types'

const files = await fg('*.json', {
  cwd: fileURLToPath(new URL('./__records__', import.meta.url)),
  absolute: true,
  onlyFiles: true,
})

const cache = new Map<string, RegExp | Error>()

for (const file of files) {
  // Some token positions are off in this record
  const name = basename(file, '.json')
  if (name === 'ts-basic')
    continue

  describe(`record: ${name}`, async () => {
    const instances = JSON.parse(await fs.readFile(file, 'utf-8')) as Instance[]
    let i = 0
    for (const instance of instances) {
      i += 1
      describe(`instances ${i}`, () => {
        const scanner = new JavaScriptScanner(instance.constractor[0], cache, false)
        let j = 0
        for (const execution of instance.executions) {
          j += 1
          it(`case ${j}`, () => {
            onTestFailed(() => {
              console.error(execution.result?.index != null
                ? {
                    args: execution.args,
                    expected: {
                      pattern: scanner.patterns[execution.result.index],
                      regexp: scanner.regexps[execution.result.index],
                    },
                  }
                : {
                    args: execution.args,
                    patterns: scanner.patterns,
                    regexps: scanner.regexps,
                  })
            })
            const result = scanner.findNextMatchSync(...execution.args)
            expect(result).toEqual(execution.result)
          })
        }
      })
    }
  })
}