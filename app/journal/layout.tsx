import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Journal - Full Tracker',
  description: 'Write and reflect on your daily thoughts, moods, and experiences',
}

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
