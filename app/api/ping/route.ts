import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    await supabase.from('products').select('id').limit(1)
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
