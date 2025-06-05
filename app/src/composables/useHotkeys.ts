import { useMagicKeys, whenever } from '@vueuse/core'
import { setTheme, themes } from './useTheme'

export function useHotThemeKeys() {
  const keys = useMagicKeys()

  whenever(keys.ctrl_shift_1, () => setTheme(themes[0]))
  whenever(keys.ctrl_shift_2, () => setTheme(themes[1]))
  whenever(keys.ctrl_shift_3, () => setTheme(themes[2]))
  whenever(keys.ctrl_shift_4, () => setTheme(themes[3]))
  whenever(keys.ctrl_shift_5, () => setTheme(themes[4]))
}
