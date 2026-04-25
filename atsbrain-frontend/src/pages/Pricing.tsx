import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['3 ATS scans/month', 'Basic score breakdown', 'Job search access', 'Application tracker'],
    cta: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 749,
    featured: true,
    features: ['Unlimited ATS scans', 'Full AI analysis', 'Cover letter generator', 'Job alerts via email', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'career',
    name: 'Career+',
    price: 1399,
    features: ['Everything in Pro', 'LinkedIn profile tips', 'Interview prep questions', 'Career roadmap insights', 'Dedicated support'],
    cta: 'Upgrade to Career+',
  },
]

export default function Pricing() {
  const { user, refreshPlan } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleUpgrade = async (planId: string) => {
    if (!user) return
    setError(''); setSuccess('')
    setLoading(planId)

    try {
      const order = await api.payment.createOrder(planId)

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'AtsBrain',
        description: `${order.plan_name} Plan`,
        order_id: order.order_id,
        prefill: { email: user.email },
        theme: { color: '#2563eb' },
        handler: async (response: Record<string, string>) => {
          try {
            await api.payment.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            })
            refreshPlan(planId)
            setSuccess(`🎉 You're now on the ${order.plan_name} plan!`)
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Payment verification failed')
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      }

      if (!window.Razorpay) {
        setError('Payment gateway not loaded. Please refresh and try again.')
        setLoading(null)
        return
      }

      const rz = new window.Razorpay(options)
      rz.open()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create payment order')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h1 className="page-title">Simple, Transparent Pricing</h1>
          <p style={{ color: 'var(--muted)' }}>Invest in your career. Cancel anytime.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="pricing-grid">
          {PLANS.map(plan => {
            const isCurrent = user?.plan === plan.id
            const isDowngrade = plan.id === 'free' && user?.plan !== 'free'

            return (
              <div key={plan.id} className={`plan-card ${plan.featured ? 'featured' : ''}`}>
                {plan.featured && <div className="plan-badge-top">Most Popular</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price">
                  {plan.price === 0 ? 'Free' : <>₹{plan.price}<span>/month</span></>}
                </div>
                <ul className="plan-features">
                  {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                {isCurrent ? (
                  <button className="btn btn-outline btn-full" disabled>✓ Current Plan</button>
                ) : isDowngrade ? (
                  <button className="btn btn-ghost btn-full" disabled>Downgrade</button>
                ) : plan.id === 'free' ? (
                  <button className="btn btn-outline btn-full" disabled>Free Plan</button>
                ) : (
                  <button
                    className={`btn btn-full ${plan.featured ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Opening payment…' : plan.cta}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--muted)', fontSize: '.85rem' }}>
          <p>Payments processed securely by Razorpay · 30-day money-back guarantee</p>
          <p style={{ marginTop: 4 }}>Questions? Email us at support@atsbrain.in</p>
        </div>
      </div>
    </div>
  )
}
