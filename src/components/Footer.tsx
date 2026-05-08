export default function Footer() {
  return (
    <footer
      style={{ backgroundColor: 'var(--fc-green)' }}
      className="mt-auto text-white text-sm py-6"
    >
      <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-semibold">Frost Creek Golf Course</p>
        <div className="flex items-center gap-4">
          <a
            href="tel:9703282326"
            className="hover:text-yellow-300 transition-colors"
          >
            970.328.2326 Ext. 1
          </a>
          <span className="opacity-40">|</span>
          <a
            href="mailto:bwelsh@frostcreek.com"
            className="hover:text-yellow-300 transition-colors"
          >
            bwelsh@frostcreek.com
          </a>
        </div>
      </div>
    </footer>
  )
}
