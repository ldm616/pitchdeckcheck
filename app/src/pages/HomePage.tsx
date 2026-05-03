import { Button } from '../components/Button'
import { ROUTES } from '../lib/routes'

export function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-navy-900 tracking-tight">
              Is your pitch deck ready for investors?
            </h1>
            <p className="mt-6 text-xl text-navy-600 leading-relaxed">
              Get a free instant investor-readiness score and see where your deck needs work.
            </p>
            <div className="mt-10">
              <Button href={ROUTES.UPLOAD} size="lg">
                Check My Deck for Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-navy-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-12">
            What you get
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title="Free Deck Score"
              description="Get an overall investor-readiness grade for your pitch deck in seconds."
            />
            <FeatureCard
              title="Slide-by-Slide Grades"
              description="See which slides are strong and which need the most work."
            />
            <FeatureCard
              title="Upgrade Potential"
              description="Learn how much each slide could improve with targeted fixes."
            />
            <FeatureCard
              title="Paid Fix Plan"
              description="Unlock exact fixes, suggested wording, and investor-backed examples."
            />
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy-900 text-center mb-8">
              Built on real investor standards
            </h2>
            <div className="space-y-6 text-navy-600">
              <p className="text-lg leading-relaxed">
                Pitch Deck Check evaluates your deck the way investors do. Each slide is scored
                against the specific question investors need answered at that point in the deck.
              </p>
              <p className="text-lg leading-relaxed">
                The free report shows you where your deck falls short. The paid fix plan shows
                you exactly what to change, with suggested wording and examples from decks that
                raised funding.
              </p>
            </div>
            <div className="mt-10 text-center">
              <Button href={ROUTES.UPLOAD} variant="outline" size="lg">
                Get Your Free Score
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
}

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-navy-100">
      <h3 className="text-lg font-semibold text-navy-900 mb-2">
        {title}
      </h3>
      <p className="text-navy-600 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  )
}
