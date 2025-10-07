export interface Game {
  id: string
  title: string
  publisher: string
  releaseDate: string
  coverImage: string
  status: 'Playing' | 'Completed' | 'Stopped'
  percentage: number
  dateStarted: string | null
  dateCompleted: string | null
  daysPlayed: number
  hoursPlayed: number
  minutesPlayed: number
  console: string
  store: string
  price: number
  pricePerHour: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface GameSearchResult {
  id: number
  name: string
  background_image: string
  released: string
  publishers?: Array<{ name: string }>
  platforms?: Array<{ platform: { name: string } }>
}
