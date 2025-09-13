export function RostaraLogo({ size = 24, withText = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: withText ? 8 : 0 }}>
      {/* Icon = hex with plus (new) */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7.5 6h9l3 6-3 6h-9l-3-6 3-6z" />
        <path d="M12 10.5v3" />
        <path d="M10.5 12h3" />
      </svg>
      {withText && (
        <span
          style={{
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            fontWeight: 600,
            letterSpacing: '0.2px',
          }}
        >
          Rostara
        </span>
      )}
    </div>
  )
}

export default RostaraLogo
