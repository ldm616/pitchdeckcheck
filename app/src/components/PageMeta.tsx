import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Sets noindex,nofollow meta tag for all pages except homepage.
 * Homepage SEO is handled in index.html.
 */
export function PageMeta() {
  const location = useLocation()

  useEffect(() => {
    const robotsMeta = document.querySelector('meta[name="robots"]')

    if (location.pathname === '/' || location.pathname === '') {
      // Homepage: allow indexing (set in index.html, but ensure it's correct)
      if (robotsMeta) {
        robotsMeta.setAttribute('content', 'index, follow')
      }
    } else {
      // All other pages: noindex, nofollow
      if (robotsMeta) {
        robotsMeta.setAttribute('content', 'noindex, nofollow')
      }
    }
  }, [location.pathname])

  return null
}
