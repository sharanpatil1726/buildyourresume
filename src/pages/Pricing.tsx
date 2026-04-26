import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

// Replace with your actual UPI ID — shown on the manual UPI section
const BUSINESS_UPI_ID = 'atsbrain@ibl'
const BUSINESS_NAME = 'AtsBrain'

const FREE_FEATURES = [
  '3 ATS scans / month',
  'Score breakdown (keyword, format, content)',
  'Skills detection & ATS checklist',
  'Job board search',
  'Application tracker',
]

const PRO_FEATURES = [
  'Unlimited ATS scans',
  'Full AI analysis report (ATS score, weaknesses)',
  'Interview questions & salary tips',
  'Market demand & role guide',
  'AI-optimised resume download (PDF & DOC)',
  'One-click job apply tracking',
  'Job alerts via email',
  'Cover letter generator',
  'Priority support',
]

export default function Pricing() {
  const { user, refreshPlan } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUPI, setShowUPI] = useState(false)
  const [upiCopied, setUpiCopied] = useState(false)

  const isPro = user?.plan === 'pro'

  const handleUpgrade = async () => {
    if (!user) return
    setError(''); setSuccess('')
    setLoading(true)

    try {
      const order = await api.payment.createOrder('pro')

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: BUSINESS_NAME,
        description: 'Pro Plan — ₹299/month',
        order_id: order.order_id,
        prefill: { email: user.email },
        theme: { color: '#7c3aed' },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        handler: async (response: Record<string, string>) => {
          try {
            await api.payment.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: 'pro',
            })
            refreshPlan('pro')
            setSuccess('You are now on Pro! All features are unlocked.')
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Payment verification failed')
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      }

      if (!window.Razorpay) {
        setError('Payment gateway not loaded. Please refresh and try again.')
        setLoading(false)
        return
      }

      const rz = new window.Razorpay(options)
      rz.open()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create payment order')
      setLoading(false)
    }
  }

  const copyUPI = async () => {
    try {
      await navigator.clipboard.writeText(BUSINESS_UPI_ID)
      setUpiCopied(true)
      setTimeout(() => setUpiCopied(false), 2500)
    } catch {
      setUpiCopied(false)
    }
  }

  return (
    <div className="page">
      <div className="page-inner" style={{ maxWidth: 760 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 20, padding: '4px 16px', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
            Simple Pricing
          </div>
          <h1 className="page-title" style={{ textAlign: 'center', fontSize: '2rem' }}>
            Start free. Go Pro when ready.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '.95rem' }}>
            Cancel anytime · Instant activation · Secure payments via Razorpay
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>

          {/* Free plan */}
          <div className="plan-card" style={{ opacity: isPro ? 0.7 : 1 }}>
            <div>
              <div className="plan-name">Free</div>
              <div className="plan-price">₹0<span>/month</span></div>
              <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 12 }}>
                Get started with the basics
              </p>
            </div>
            <ul className="plan-features">
              {FREE_FEATURES.map(f => <li key={f}>{f}</li>)}
            </ul>
            <button className="btn btn-ghost btn-full" disabled>
              {isPro ? 'Previous plan' : '✓ Current Plan'}
            </button>
          </div>

          {/* Pro plan */}
          <div className="plan-card featured" style={{ position: 'relative' }}>
            <div className="plan-badge-top">Best Value</div>
            <div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">₹299<span>/month</span></div>
              <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 12 }}>
                Everything you need to land the job
              </p>
            </div>
            <ul className="plan-features">
              {PRO_FEATURES.map(f => <li key={f}>{f}</li>)}
            </ul>
            {isPro ? (
              <button className="btn btn-outline btn-full" disabled>✓ Current Plan</button>
            ) : (
              <button
                className="btn btn-primary btn-full"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? 'Opening payment…' : 'Upgrade to Pro — ₹299/mo'}
              </button>
            )}
          </div>
        </div>

        {/* Payment methods section */}
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="section-title">Payment Options</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {['UPI', 'Credit / Debit Card', 'Net Banking', 'Wallet'].map(m => (
              <span key={m} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                background: 'var(--primary-light)', color: 'var(--primary)',
                fontSize: '.8rem', fontWeight: 600,
                border: '1px solid var(--border)',
              }}>
                {m === 'UPI' ? '📱' : m === 'Credit / Debit Card' ? '💳' : m === 'Net Banking' ? '🏦' : '👛'} {m}
              </span>
            ))}
          </div>
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            All payment methods are available in the secure Razorpay checkout.
            Click <strong>Upgrade to Pro</strong> and select your preferred method including UPI (GPay, PhonePe, Paytm, etc.)
          </p>

          {/* UPI manual section toggle */}
          <button
            onClick={() => setShowUPI(v => !v)}
            style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: 'var(--primary)', fontSize: '.82rem', fontWeight: 600, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📲 {showUPI ? 'Hide' : 'Show'} UPI / QR Pay directly
          </button>

          {showUPI && (
            <div style={{ marginTop: 16, padding: 20, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* QR placeholder — replace src with your actual UPI QR image */}
              <div style={{
                width: 130, height: 130, border: '2px solid var(--border)', borderRadius: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'white', flexShrink: 0, gap: 6,
              }}>
                <div style={{ fontSize: '2.5rem' }}>📱</div>
                <span style={{ fontSize: '.65rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
                  Add your UPI QR image here
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontWeight: 700, marginBottom: 6 }}>Pay via UPI</p>
                <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Open any UPI app (GPay, PhonePe, Paytm) → Scan QR or send to UPI ID → Send ₹299 → Email your transaction ID to <strong>support@atsbrain.in</strong> for manual activation.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary-light)', borderRadius: 8, padding: '8px 14px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '.9rem' }}>
                    {BUSINESS_UPI_ID}
                  </span>
                  <button
                    onClick={copyUPI}
                    style={{ marginLeft: 'auto', background: upiCopied ? 'var(--success)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {upiCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 8 }}>
                  Manual activation may take up to 2 hours on business days.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Trust badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '🔒', title: 'Secure Payments', sub: 'Powered by Razorpay' },
            { icon: '↩️', title: '30-Day Refund', sub: 'No questions asked' },
            { icon: '⚡', title: 'Instant Access', sub: 'Activated immediately' },
            { icon: '📧', title: 'Email Support', sub: 'support@atsbrain.in' },
          ].map(b => (
            <div key={b.title} style={{ textAlign: 'center', padding: '14px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{b.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--text)' }}>{b.title}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>{b.sub}</div>
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <div className="card">
          <p className="section-title">What's included</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', padding: '6px 8px', borderBottom: '2px solid var(--border)', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Feature</span>
              <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '.72rem', textAlign: 'center' }}>Free</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '.72rem', textAlign: 'center' }}>Pro</span>
            </div>
            {([
              ['ATS scan', true, true],
              ['Score breakdown', true, true],
              ['Skills & checklist', true, true],
              ['Job search', true, true],
              ['App tracker', true, true],
              ['Full AI report (ATS score, weaknesses)', false, true],
              ['Interview questions & salary tips', false, true],
              ['Optimised resume download', false, true],
              ['Job apply tracking', false, true],
              ['Email job alerts', false, true],
              ['Cover letter generator', false, true],
            ] as [string, boolean, boolean][]).map(([label, free, pro]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', padding: '7px 8px', borderRadius: 6, background: pro && !free ? 'rgba(124,58,237,0.04)' : 'transparent', alignItems: 'center' }}>
                <span style={{ fontSize: '.85rem', color: 'var(--text)' }}>{label}</span>
                <span style={{ textAlign: 'center', fontSize: '.9rem', color: free ? 'var(--success)' : 'var(--muted)' }}>{free ? '✓' : '–'}</span>
                <span style={{ textAlign: 'center', fontSize: '.9rem', color: pro ? 'var(--success)' : 'var(--muted)', fontWeight: pro ? 700 : 400 }}>{pro ? '✓' : '–'}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
