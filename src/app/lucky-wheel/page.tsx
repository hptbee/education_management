import { redirect } from 'next/navigation'

export default function LuckyWheelRedirectPage() {
  redirect('/tools?tool=wheel')
}
