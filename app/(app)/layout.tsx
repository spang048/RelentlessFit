import Navigation from '@/components/Navigation'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation />
      {/* Desktop: offset for sidebar. Mobile: offset for bottom nav */}
      <main className="md:ml-56 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
