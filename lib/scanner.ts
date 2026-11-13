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

export type DetectorHandle = { stop: () => void; engine: () => string }

const TICK_MS = 90
// After this many empty native reads in a row, ZXing joins in (native detector may be present but non-functional).
const NATIVE_GRACE_TICKS = 20

// Reads frames ourselves (center crop, upscaled) and feeds them to the phone's BarcodeDetector,
// falling back to ZXing. Avoids ZXing's own video helpers, which wait for a 'canplay' event that
// has already fired once the camera is running.
export async function startDetector(
  video: HTMLVideoElement,
  _stream: MediaStream,
  onCode: (code: string) => void,
): Promise<DetectorHandle> {
  let active = true
  let lastCode = ''
  let lastTime = 0
  let engine = 'zxing'

  const emit = (raw: string) => {
    const code = (raw || '').trim()
    if (!active || !code) return
    const now = Date.now()
    if (code === lastCode && now - lastTime < 1500) return
    lastCode = code; lastTime = now
    onCode(code)
  }

  let native: any = null
  const BD = (window as any).BarcodeDetector
  if (BD) {
    try {
      let supported: string[] = []
      try { supported = await BD.getSupportedFormats() } catch {}
      const formats = FORMATS.filter(f => supported.includes(f))
      if (formats.length) { native = new BD({ formats }); engine = 'native' }
    } catch { native = null }
  }

  const zx = await import('@zxing/library')
  const hints = new Map()
  hints.set(zx.DecodeHintType.TRY_HARDER, true)
  hints.set(zx.DecodeHintType.POSSIBLE_FORMATS, [
    zx.BarcodeFormat.EAN_13, zx.BarcodeFormat.EAN_8, zx.BarcodeFormat.UPC_A, zx.BarcodeFormat.UPC_E,
    zx.BarcodeFormat.CODE_128, zx.BarcodeFormat.CODE_39, zx.BarcodeFormat.ITF, zx.BarcodeFormat.QR_CODE,
  ])
  const zxReader = new zx.MultiFormatReader()
  zxReader.setHints(hints)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  let emptyNative = 0
  let tick = 0

  const grab = (full: boolean) => {
    const vw = video.videoWidth, vh = video.videoHeight
    // Center crop matching the on-screen frame; every 3rd tick try the whole frame.
    const cw = full ? vw : vw * 0.9
    const ch = full ? vh : Math.min(vh, vw * 0.6)
    const sx = (vw - cw) / 2, sy = (vh - ch) / 2
    const scale = Math.min(1.6, 1280 / cw)
    canvas.width = Math.round(cw * scale)
    canvas.height = Math.round(ch * scale)
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height)
  }

  const tryZxing = (): string | null => {
    try {
      const src = new zx.HTMLCanvasElementLuminanceSource(canvas)
      return zxReader.decode(new zx.BinaryBitmap(new zx.HybridBinarizer(src))).getText()
    } catch {
      return null
    }
  }

  const loop = async () => {
    if (!active) return
    if (video.readyState >= 2 && video.videoWidth) {
      tick++
      grab(tick % 3 === 0)
      let code: string | null = null
      if (native) {
        try {
          const found = await native.detect(canvas)
          if (found.length) code = found[0].rawValue
        } catch {}
        if (code) emptyNative = 0
        else emptyNative++
      }
      if (!code && (!native || (emptyNative > NATIVE_GRACE_TICKS && tick % 2 === 0))) {
        code = tryZxing()
        if (code && native) engine = 'zxing'
      }
      if (code) emit(code)
    }
    if (active) setTimeout(loop, TICK_MS)
  }
  setTimeout(loop, 150)

  return { stop: () => { active = false }, engine: () => engine }
}
