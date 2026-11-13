import { NextResponse } from 'next/server'

// Short link for WhatsApp statuses: bazarline.kz/wa (RU greeting), bazarline.kz/wa?kz (KZ greeting).
export const dynamic = 'force-dynamic'

const PHONE = '77758020722'
const TEXT = {
  ru: 'Здравствуйте! Хочу подключить BazarLine в свой магазин.',
  kz: 'Сәлеметсіз бе! BazarLine-ды дүкеніме қосқым келеді.',
}

export function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const lang = params.has('kz') || params.get('lang') === 'kz' ? 'kz' : 'ru'
  return NextResponse.redirect(`https://wa.me/${PHONE}?text=${encodeURIComponent(TEXT[lang])}`, 307)
}
