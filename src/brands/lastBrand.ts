/**
 * Remembers the brand the admin was looking at so `/brands` can reopen it. Same
 * `sessionStorage` trade-off as the tokens: survives a refresh, not the tab.
 */
const KEY = 'adminLastBrandId'

export const lastBrandStorage = {
  read(): string | null {
    try {
      return sessionStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  write(brandId: string): void {
    try {
      sessionStorage.setItem(KEY, brandId)
    } catch {
      // storage unavailable: the choice just will not survive a refresh
    }
  },
}
