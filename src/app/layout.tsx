import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gracias AI - App Store Compliance Auditor',
  description: 'AI-powered iOS App Store compliance auditing. Upload your project and get a comprehensive audit against Apple\'s Review Guidelines.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
