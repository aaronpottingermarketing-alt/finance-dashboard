import { Suspense } from 'react'
import FinanceDashboard from '@/components/finance-dashboard/FinanceDashboard'

export default function Home() {
  return (
    <div className="h-screen overflow-hidden">
      <Suspense>
        <FinanceDashboard />
      </Suspense>
    </div>
  )
}
