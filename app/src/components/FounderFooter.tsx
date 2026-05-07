import { useState } from 'react'
import { ContactModal } from './ContactModal'

export function FounderFooter() {
  const [showContact, setShowContact] = useState(false)

  return (
    <>
      <footer className="py-6 text-center">
        <button
          type="button"
          onClick={() => setShowContact(true)}
          className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          Contact
        </button>
      </footer>

      <ContactModal
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
    </>
  )
}
