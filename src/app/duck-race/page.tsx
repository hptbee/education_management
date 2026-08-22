import { redirect } from 'next/navigation'

export default function DuckRaceRedirectPage() {
  redirect('/tools?tool=duck-race')
}
