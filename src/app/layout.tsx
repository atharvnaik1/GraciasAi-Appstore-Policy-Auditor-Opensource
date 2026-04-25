import './globals.css';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'ipaShip - App Store Compliance Auditor',
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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_ZHVtbXkua2V5LmNsZXJrLmRldiQ'}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
