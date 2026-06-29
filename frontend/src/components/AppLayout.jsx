import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import api from '../lib/api'

export default function AppLayout({ children }) {
  const [restaurantName, setRestaurantName] = useState('')

  useEffect(() => {
    api.get('/api/restaurants/me').then(r => {
      if (r.data?.name) setRestaurantName(r.data.name)
    }).catch(() => {})
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar restaurantName={restaurantName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
