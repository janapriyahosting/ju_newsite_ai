'use client';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  return (
    <div className="max-w-7xl mx-auto px-6 pt-3">
      <button onClick={() => router.back()}
        className="text-xs font-semibold flex items-center gap-1 transition-colors hover:text-[#2A3887]"
        style={{ color: '#94a3b8' }}>
        ← Back
      </button>
    </div>
  );
}
