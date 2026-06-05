import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export default function Page() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Construction className="h-12 w-12 mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Yakında</h2>
        <p className="text-sm text-slate-500 mt-1">Bu modül sıradaki sürümde devreye alınacak.</p>
      </CardContent>
    </Card>
  )
}
