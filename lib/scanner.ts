'use client'

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'qr_code', 'data_matrix']

let audioCtx: AudioContext | null = null

// Must be called from a user gesture (tap), otherwise mobile browsers keep audio muted.
export function unlockScanSound() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return
    if (!audioCtx) audioCtx = new AC()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const src = audioCtx.createBufferSource()
    src.buffer = audioCtx.createBuffer(1, 1, 22050)
    src.connect(audioCtx.destination)
    src.start(0)
  } catch {}
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  const ctx = audioCtx!
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  const t = ctx.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.004)
  g.gain.setValueAtTime(vol, t + dur - 0.02)
  g.gain.linearRampToValueAtTime(0, t + dur)
  o.connect(g); g.connect(ctx.destination)
  o.start(t); o.stop(t + dur + 0.01)
}

export function playScanSound(ok: boolean) {
  try {
    if (!audioCtx) unlockScanSound()
    if (!audioCtx) return
    if (audioCtx.state === 'suspended') audioCtx.resume()
    if (ok) {
      // Short high "supermarket" beep.
      tone(2900, 0, 0.11, 'square', 0.22)
    } else {
      // Two low buzzes — clearly different from success.
      tone(220, 0, 0.16, 'sawtooth', 0.3)
      tone(180, 0.22, 0.26, 'sawtooth', 0.3)
    }
  } catch {}
  if (navigator.vibrate) navigator.vibrate(ok ? 70 : [120, 60, 120])
}

// Takes a getter because the <video> is only mounted after the scanner opens.
export async function openCamera(getVideo: () => HTMLVideoElement | null): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
  })
  const track = stream.getVideoTracks()[0]
  const caps: any = (track as any).getCapabilities?.() || {}
  const adv: any = {}
  if (caps.focusMode?.includes('continuous')) adv.focusMode = 'continuous'
  if (caps.exposureMode?.includes('continuous')) adv.exposureMode = 'continuous'
  if (caps.whiteBalanceMode?.includes('continuous')) adv.whiteBalanceMode = 'continuous'
  // Slight zoom lets the user hold the phone farther away, where the lens can actually focus.
  if (caps.zoom && caps.zoom.max >= 1.8) adv.zoom = Math.min(2, caps.zoom.max)
  if (Object.keys(adv).length) {
    try { await (track as any).applyConstraints({ advanced: [adv] }) } catch {}
  }
  let video = getVideo()
  for (let i = 0; !video && i < 60; i++) {
    await new Promise(r => requestAnimationFrame(r))
    video = getVideo()
  }
  if (!video) { stream.getTracks().forEach(t => t.stop()); throw new Error('video element not mounted') }
  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play()
  return stream
}

// Tap on the preview to refocus (supported on many Android phones).
export async function refocus(stream: MediaStream | null) {
  const track = stream?.getVideoTracks()[0] as any
  if (!track) return
  const caps = track.getCapabilities?.() || {}
  try {
    if (caps.focusMode?.includes('single-shot')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] })
      setTimeout(() => track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {}), 600)
    }
  } catch {}
}

export type DetectorHandle = { stop: () => void }

// Calls onCode only after the same value is read on 2 consecutive frames — filters out misreads from blurry frames.
export async function startDetector(
  video: HTMLVideoElement,
  stream: MediaStream,
  onCode: (code: string) => void,
): Promise<DetectorHandle> {
  let active = true
  let candidate = ''
  let hits = 0
  let lastCode = ''
  let lastTime = 0

  const accept = (code: string) => {
    if (code === candidate) hits++
    else { candidate = code; hits = 1 }
    if (hits < 2) return
    hits = 0
    const now = Date.now()
    if (code === lastCode && now - lastTime < 1500) return
    lastCode = code; lastTime = now
    onCode(code)
  }

  if ('BarcodeDetector' in window) {
    let detector: any
    try {
      const supported: string[] = await (window as any).BarcodeDetector.getSupportedFormats()
      detector = new (window as any).BarcodeDetector({ formats: FORMATS.filter(f => supported.includes(f)) })
    } catch {
      detector = new (window as any).BarcodeDetector()
    }
    const loop = async () => {
      if (!active) return
      if (video.readyState >= 2) {
        try {
          const codes = await detector.detect(video)
          if (codes.length) accept(codes[0].rawValue)
          else { candidate = ''; hits = 0 }
        } catch {}
      }
      if (active) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return { stop: () => { active = false } }
  }

  const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')
  const hints = new Map()
  hints.set(DecodeHintType.TRY_HARDER, true)
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.QR_CODE,
  ])
  const reader = new BrowserMultiFormatReader(hints, 80)
  reader.decodeFromStream(stream, video, (result) => {
    if (active && result) accept(result.getText())
  })
  return { stop: () => { active = false; try { reader.reset() } catch {} } }
}
