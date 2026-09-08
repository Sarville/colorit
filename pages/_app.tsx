import '../styles/global.css';
import '@/lib/audioFocus';
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}