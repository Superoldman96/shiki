import { codeToHtml } from 'shiki/bundle/full'
import { describe, expect, it, vi } from 'vitest'

const style = `
<style>
.highlighted {
  background-color: #ff000050;
  display: inline;
}
.highlighted-body {
  background-color: #8883;
}
.highlighted-border {
  border: 1px solid #ff0000;
}
</style>`

const code = `/**
 * Get highlighted code in HTML.
 */
export function codeToHtml(
  internal: ShikiInternal,
  code: string,
  options: CodeToHastOptions,
): string {
  let result = hastToHtml(codeToHast(internal, code, options, context))
  return result
}
// final`

describe('decorations', () => {
  it('works', async () => {
    const transformMock = vi.fn()

    const html = await codeToHtml(code, {
      theme: 'vitesse-light',
      lang: 'ts',
      decorations: [
        // The `e` letter in `export` is highlighted.
        // Testing decorations that break tokens.
        {
          start: { line: 3, character: 0 },
          end: { line: 3, character: 1 },
          tagName: 'div',
          properties: { class: 'highlighted' },
        },
        // The space below `export` is highlighted.
        // Testing decorations with whitespace.
        {
          start: { line: 4, character: 1 },
          end: { line: 4, character: 2 },
          tagName: 'div',
          properties: { class: 'highlighted' },
        },
        // The space combined with `co` in `code` is highlighted.
        // Testing decorations with multiple tokens.
        {
          start: { line: 5, character: 1 },
          end: { line: 5, character: 4 },
          properties: { class: 'highlighted', style: 'filter: invert(1)' },
        },
        // The starting comment
        // Testing indexed offsets
        {
          start: 0,
          end: 20,
          properties: { class: 'highlighted' },
        },
        // The function body
        // Testing decorations that span multiple lines.
        {
          start: { line: 7, character: 10 },
          end: { line: 10, character: 1 },
          properties: { class: 'highlighted-body' },
          transform: transformMock,
        },
        // "hastToHtml"
        // Testing nested decorations.
        {
          start: { line: 8, character: 15 },
          end: { line: 8, character: 25 },
          properties: { class: 'highlighted' },
        },
        // "hast"
        // Testing nested decorations with shared start.
        {
          start: { line: 8, character: 15 },
          end: { line: 8, character: 19 },
          properties: { class: 'highlighted' },
        },
        // "Html"
        // Testing nested decorations with shared end.
        {
          start: { line: 8, character: 21 },
          end: { line: 8, character: 25 },
          properties: { class: 'highlighted' },
        },
        // "// final"
        // Testing offset === code.length edge case
        {
          start: code.length - 8,
          end: code.length,
          properties: { class: 'highlighted' },
        },
      ],
    })

    expect(transformMock).toBeCalledTimes(4)

    await expect(style + html)
      .toMatchFileSnapshot('./out/decorations/basic.html')
  })

  it('adjacent', async () => {
    const html = await codeToHtml('hello', {
      theme: 'vitesse-light',
      lang: 'ts',
      decorations: [
        // Empty decoration adjacent to the trailing decoration.
        {
          start: { line: 0, character: 1 },
          end: { line: 0, character: 1 },
          properties: { class: 'highlighted-border' },
        },
        // Non empty decoration adjacent to non empty decoration.
        {
          start: { line: 0, character: 1 },
          end: { line: 0, character: 2 },
          properties: { class: 'highlighted' },
        },
        // Non empty decoration adjacent to non empty decoration.
        {
          start: { line: 0, character: 2 },
          end: { line: 0, character: 3 },
          properties: { class: 'highlighted-body' },
        },
        // Empty decoration adjacent to the leading decoration.
        {
          start: { line: 0, character: 3 },
          end: { line: 0, character: 3 },
          properties: { class: 'highlighted-border' },
        },
      ],
    })

    await expect(style + html)
      .toMatchFileSnapshot('./out/decorations/adjacent.html')
  })
})

describe('decorations errors', () => {
  it('throws when start is higher than end', async () => {
    await expect(async () => {
      await codeToHtml(code, {
        theme: 'vitesse-light',
        lang: 'ts',
        decorations: [
          { start: 10, end: 0 },
        ],
      })
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[ShikiError: Invalid decoration range: {"line":1,"character":6,"offset":10} - {"line":0,"character":0,"offset":0}]`)
  })

  it('throws when decorations intersect', async () => {
    await expect(async () => {
      await codeToHtml(code, {
        theme: 'vitesse-light',
        lang: 'ts',
        decorations: [
          { start: 0, end: 10 },
          { start: 1, end: 11 },
        ],
      })
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[ShikiError: Decorations {"line":0,"character":0,"offset":0} and {"line":0,"character":1,"offset":1} intersect.]`)
  })

  it('throws when lines overflow', async () => {
    await expect(async () => {
      await codeToHtml(code, {
        theme: 'vitesse-light',
        lang: 'ts',
        decorations: [
          { start: { line: 100, character: 0 }, end: { line: 100, character: 1 } },
        ],
      })
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[ShikiError: Invalid decoration position {"line":100,"character":0}. Lines length: 12]`)
  })

  it('throws when chars overflow', async () => {
    await expect(async () => {
      await codeToHtml(code, {
        theme: 'vitesse-light',
        lang: 'ts',
        decorations: [
          { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        ],
      })
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[ShikiError: Invalid decoration position {"line":0,"character":10}. Line 0 length: 4]`)

    await expect(async () => {
      await codeToHtml(code, {
        theme: 'vitesse-light',
        lang: 'ts',
        decorations: [
          {
            start: { line: 2, character: 1 },
            end: { line: 1, character: 36 }, // actual position is { line: 2, character: 3, offset 40 }
          },
        ],
      })
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[ShikiError: Invalid decoration position {"line":1,"character":36}. Line 1 length: 33]`)
  })

  it('throws when offset underflows/overflows', async () => {
    await expect(async () => {
      await codeToHtml(code, {
        theme: 'vitesse-light',
        lang: 'ts',
        decorations: [{ start: 1, end: 1000 }],
      })
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[ShikiError: Invalid decoration offset: 1000. Code length: 252]`)

    await expect(async () => {
      await codeToHtml(code, {
        theme: 'vitesse-light',
        lang: 'ts',
        decorations: [{ start: -3, end: 5 }],
      })
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`[ShikiError: Invalid decoration offset: -3. Code length: 252]`)
  })
})
