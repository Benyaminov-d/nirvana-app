import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="glass nv-glass--inner-hairline border border-white/10 rounded-2xl p-8 md:p-12">
        <p className="text-8xl md:text-9xl font-semibold tracking-wider trajan-text">404</p>
        <h1 className="mt-4 text-2xl md:text-3xl font-bold trajan-text">Page not found</h1>
        <p className="mt-3 text-gray-300 md:text-lg">The page you’re looking for doesn’t exist or was moved.</p>
        <div className="mt-8 flex items-center justify-center">
          <Link to="/" className="glass nv-glass--inner-hairline border border-white/10 rounded-lg px-4 py-2 inline-block text-gray-200 hover:text-white">Go Home</Link>
        </div>
      </div>
    </main>
  );
}


