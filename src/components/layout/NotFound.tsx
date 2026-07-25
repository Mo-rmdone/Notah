import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="font-brand text-6xl text-primary">٤٠٤</p>
      <p className="text-lg font-semibold">الصفحة غير موجودة</p>
      <Button asChild>
        <Link to="/">العودة للرئيسية</Link>
      </Button>
    </div>
  )
}
