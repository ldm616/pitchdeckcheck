import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { sendReportLink } from '../../lib/api'

// Disposable/temporary email domains to block
const DISPOSABLE_DOMAINS = new Set([
  // Major disposable services
  'tempmail.com', 'temp-mail.org', 'tempmail.net', 'tempmailo.com',
  'throwaway.email', 'throwawaymail.com',
  '10minutemail.com', '10minutemail.net', '10minmail.com',
  'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz',
  'mailinator.com', 'mailinator.net', 'mailinator.org',
  'trashmail.com', 'trashmail.net', 'trashmail.org',
  'fakeinbox.com', 'fakemailgenerator.com',
  'tempail.com', 'tempr.email', 'temp.email',
  'dispostable.com', 'disposablemail.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'sharklasers.com', 'spam4.me', 'spamgourmet.com',
  'mailnesia.com', 'maildrop.cc', 'mailsac.com',
  'mintemail.com', 'mohmal.com', 'mytrashmail.com',
  'getnada.com', 'nada.email',
  'emailondeck.com', 'anonymousemail.me',
  'burnermail.io', 'burnmail.com',
  'getairmail.com', 'air-mail.cc',
  'discard.email', 'discardmail.com',
  'crazymailing.com', 'inboxalias.com',
  'jetable.org', 'jetable.com',
  'spambox.us', 'spamfree24.org', 'spamspot.com',
  'tempmailaddress.com', 'tempmails.net',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'mailcatch.com', 'mailforspam.com',
  'mt2009.com', 'mt2015.com',
  'owlpic.com', 'pokemail.net',
  'proxymail.eu', 'rcpt.at',
  'rmqkr.net', 'royal.net',
  'rppkn.com', 'rtrtr.com',
  'spambog.com', 'spambog.de', 'spambog.ru',
  'superrito.com', 'suremail.info',
  'teleworm.us', 'tempinbox.com',
  'thankyou2010.com', 'thisisnotmyrealemail.com',
  'tmail.ws', 'tmailinator.com',
  'tradermail.info', 'trash2009.com',
  'trbvm.com', 'trbvn.com',
  'trickmail.net', 'twinmail.de',
  'uggsrock.com', 'upliftnow.com',
  'venompen.com', 'veryrealemail.com',
  'viditag.com', 'viewcastmedia.com',
  'wasteland.rfc822.org', 'webemail.me',
  'weg-werf-email.de', 'willselfdestruct.com',
  'wooleys.org', 'xagloo.com',
  'xemaps.com', 'xents.com',
  'xmaily.com', 'xoxy.net',
  'yapped.net', 'yeah.net',
  'yogamaven.com', 'yuurok.com',
  'zippymail.info', 'zoemail.net',
  'zoho.com.disposable', 'zomg.info',
  'mailexpire.com', 'mailmoat.com',
  'mailnull.com', 'mail-temporaire.fr',
  'fakedemail.com', 'fakeemail.de',
  'emailfake.com', 'emkei.cz',
  'emlhub.com', 'emlpro.com',
  'disposableinbox.com', 'dropmail.me',
  'dumpmail.de', 'email-fake.com',
  'emailsensei.com', 'emailtemporaire.com',
  'emailtemporaire.fr', 'emailwarden.com',
  'enterto.com', 'ephemail.net',
  'evopo.com', 'explodemail.com',
  'express.net.ua', 'eyepaste.com',
  'fastacura.com', 'fastchevy.com',
  'fastchrysler.com', 'fastkawasaki.com',
  'fastmazda.com', 'fastmitsubishi.com',
  'fastnissan.com', 'fastsubaru.com',
  'fastsuzuki.com', 'fasttoyota.com',
  'fastyamaha.com', 'fazmail.net',
  'filzmail.com', 'fivemail.de',
  'fixmail.tk', 'fizmail.com',
  'flyspam.com', 'frapmail.com',
  'freundin.ru', 'friendlymail.co.uk',
  'fuckingduh.com', 'fudgerub.com',
  'garliclife.com', 'gehensiull.com',
  'gelitik.in', 'gentlemansclub.de',
  'getonemail.com', 'getonemail.net',
  'ghosttexter.de', 'girlsundertheinfluence.com',
  'gishpuppy.com', 'gmx.us.disposable',
])

function isDisposableDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}

interface ToastProps {
  message: string
  visible: boolean
}

function Toast({ message, visible }: ToastProps) {
  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[80%] max-w-[300px]">
      <div className="bg-gray-900 text-white text-sm px-4 py-3 rounded-lg text-center shadow-lg">
        {message}
      </div>
    </div>
  )
}

interface SaveReportSectionProps {
  deckId: string
  accessToken: string
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'error'

export function SaveReportSection({ deckId, accessToken }: SaveReportSectionProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<SendStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(t => ({ ...t, visible: false }))
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast.visible])

  const showToast = (message: string) => {
    setToast({ message, visible: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) return

    // Check for disposable domain
    if (isDisposableDomain(email.trim())) {
      showToast("Please use a permanent email so you don't lose access to your report.")
      return
    }

    setStatus('sending')
    setErrorMessage(null)

    try {
      const result = await sendReportLink(deckId, accessToken, email.trim())

      if (result.ok) {
        setStatus('sent')
        setEmail('')
        showToast('Email sent.')
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setErrorMessage("We couldn't send the link. Try again or copy this page URL for now.")
    }
  }

  // Success state
  if (status === 'sent') {
    return (
      <>
        <Toast message={toast.message} visible={toast.visible} />
        <div className="mb-8 pb-8 border-b border-gray-100">
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <Check className="w-4 h-4 text-gray-400" strokeWidth={2.5} />
            Private link sent.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} />
      <div className="mb-8 pb-8 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Save this report
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Email yourself a private link so you can return to this report later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            disabled={status === 'sending'}
          />

          <button
            type="submit"
            disabled={!email.trim() || status === 'sending'}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'sending' ? 'Sending...' : 'Send private link'}
          </button>
        </form>

        {status === 'error' && errorMessage && (
          <p className="mt-3 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        <p className="mt-4 text-xs text-gray-400">
          No account required. Your deck is used only to generate this report.
        </p>
      </div>
    </>
  )
}
