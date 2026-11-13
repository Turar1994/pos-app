import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Without this Next.js caches the response at build time and Supabase is never queried.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { error } = await supabase.from('stores').select('id', { head: true, count: 'exact' })
  if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  return NextResponse.json({ status: 'ok', time: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
}
