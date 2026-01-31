import './globals.css'

export const metadata = {
  title: 'Command Center',
  description: 'Your second brain for important concepts and daily discussions',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
