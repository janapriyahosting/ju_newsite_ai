import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-16"
        style={{ background: 'linear-gradient(135deg,#F8F9FB 0%,#E2F1FC 100%)' }}>
        <div className="text-center px-6 max-w-lg">
          <div className="text-8xl mb-6">🏚️</div>
          <h1 className="text-5xl font-black mb-3" style={{ color: '#2A3887' }}>404</h1>
          <h2 className="text-2xl font-black mb-3" style={{ color: '#262262' }}>
            This property is no longer available
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            The unit you're looking for may have been sold, removed, or the link may be outdated.
            Explore our other available properties below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/store"
              className="px-8 py-3.5 rounded-full font-black text-white text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#2A3887,#29A9DF)' }}>
              Browse Available Units
            </Link>
            <Link href="/projects"
              className="px-8 py-3.5 rounded-full font-black text-sm border-2 transition-all hover:bg-gray-50"
              style={{ borderColor: '#2A3887', color: '#2A3887' }}>
              View Projects
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-8">
            If you believe this is an error, please <Link href="/contact" className="underline">contact us</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
