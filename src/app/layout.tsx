import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://opensource.gracias.sh'),
  title: {
    default: 'Gracias AI — App Store Compliance Auditor',
    template: '%s | Gracias AI',
  },
  description: 'AI-powered iOS and Play Store compliance auditing with structured reports, remediation steps, and exportable audit output.',
  keywords: [
    'App Store compliance',
    'Play Store audit',
    'iOS review guidelines',
    'mobile app policy auditor',
    'PDF compliance report',
  ],
  applicationName: 'Gracias AI',
  category: 'developer tools',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Gracias AI — App Store Compliance Auditor',
    description: 'Upload an IPA and get a structured compliance audit with evidence, severity, and actionable remediation steps.',
    url: 'https://opensource.gracias.sh',
    siteName: 'Gracias AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gracias AI — App Store Compliance Auditor',
    description: 'Audit iOS and Play Store compliance with structured AI-generated reports and actionable remediation guidance.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
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
