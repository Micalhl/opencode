import { describe, expect, test } from "bun:test"
import { cursorTheme, defaultTheme, vesperTheme } from "./default-themes"

describe("default theme", () => {
  test("borrows no state from Vesper in light mode", () => {
    expect(defaultTheme.light).not.toBe(vesperTheme.light)
    expect(defaultTheme.light.palette).not.toBe(vesperTheme.light.palette)
    expect(defaultTheme.light.overrides).not.toBe(vesperTheme.light.overrides)
  })

  test("borrows no state from Cursor in dark mode", () => {
    expect(defaultTheme.dark).not.toBe(cursorTheme.dark)
    expect(defaultTheme.dark.palette).not.toBe(cursorTheme.dark.palette)
    expect(defaultTheme.dark.overrides).not.toBe(cursorTheme.dark.overrides)
  })
})
