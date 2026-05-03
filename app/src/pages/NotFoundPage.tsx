import { Button } from '../components/Button'
import { ROUTES } from '../lib/routes'

export function NotFoundPage() {
  return (
    <div className="py-20">
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-6xl font-bold text-navy-200">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-semibold text-navy-900">
          Page not found
        </h2>
        <p className="mt-4 text-navy-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8">
          <Button href={ROUTES.HOME}>
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
