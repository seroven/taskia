import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { planetKindIndex, resolvePlanetFeatures } from '../../../lib/planetFeatures'
import {
  planetFragmentShader,
  planetVertexShader,
  ringFragmentShader,
  ringVertexShader,
} from './planetSurface'
import {
  layoutPlanets,
  universeBounds,
  type PlanetLayoutPoint,
} from '../../../lib/planetLayout'
import type { UniverseTroop } from '../../../lib/troopsTypes'

const EDGE_PX = 56
const EDGE_SPEED = 12
const ZOOM_MIN = 8
const ZOOM_MAX = 48

function rankAura(rank: number | null): string | null {
  if (rank === 1) return '#fbbf24'
  if (rank === 2) return '#e2e8f0'
  if (rank === 3) return '#d97706'
  return null
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeStarLayer(
  count: number,
  seed: number,
  minR: number,
  maxR: number,
  dim = 1,
) {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const palette = ['#f8fafc', '#dbeafe', '#e0f2fe', '#fde68a']
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    const radius = minR + rand() * (maxR - minR)
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.cos(phi)
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    const tint = new THREE.Color(palette[Math.floor(rand() * palette.length)]!)
    const bright = dim + rand() * (1 - dim)
    colors[i * 3] = tint.r * bright
    colors[i * 3 + 1] = tint.g * bright
    colors[i * 3 + 2] = tint.b * bright
  }
  return { positions, colors }
}

function starGeometry(data: { positions: Float32Array; colors: Float32Array }) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
  return geometry
}

function makeStarSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Texture()
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.2, 'rgba(255,255,255,0.9)')
  glow.addColorStop(0.45, 'rgba(255,255,255,0.28)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function StarField({ reducedMotion }: { reducedMotion: boolean }) {
  const sprite = useMemo(() => makeStarSprite(), [])
  const farGeo = useMemo(() => starGeometry(makeStarLayer(900, 11, 52, 96)), [])
  const midGeo = useMemo(() => starGeometry(makeStarLayer(420, 29, 28, 70)), [])
  const dustGeo = useMemo(() => starGeometry(makeStarLayer(110, 47, 16, 46)), [])
  const speckGeo = useMemo(() => starGeometry(makeStarLayer(6400, 83, 34, 120, 0.28)), [])
  const farRef = useRef<THREE.Points>(null)
  const midRef = useRef<THREE.Points>(null)
  const dustRef = useRef<THREE.Points>(null)
  const speckRef = useRef<THREE.Points>(null)

  useEffect(() => {
    return () => {
      sprite.dispose()
      farGeo.dispose()
      midGeo.dispose()
      dustGeo.dispose()
      speckGeo.dispose()
    }
  }, [sprite, farGeo, midGeo, dustGeo, speckGeo])

  useFrame((_, dt) => {
    if (reducedMotion) return
    const spin = (points: THREE.Points | null, speed: number) => {
      if (!points) return
      points.rotation.y += dt * speed
      points.rotation.x += dt * speed * 0.15
    }
    spin(speckRef.current, 0.006)
    spin(farRef.current, 0.012)
    spin(midRef.current, 0.028)
    spin(dustRef.current, 0.05)
  })

  return (
    <>
      <points ref={speckRef} geometry={speckGeo} raycast={() => null}>
        <pointsMaterial
          map={sprite}
          size={0.22}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={farRef} geometry={farGeo} raycast={() => null}>
        <pointsMaterial
          map={sprite}
          size={0.7}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={midRef} geometry={midGeo} raycast={() => null}>
        <pointsMaterial
          map={sprite}
          size={1.15}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={dustRef} geometry={dustGeo} raycast={() => null}>
        <pointsMaterial
          map={sprite}
          size={1.7}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  )
}

function PlanetMesh({
  troop,
  position,
  selected,
  onSelect,
  reducedMotion,
}: {
  troop: UniverseTroop
  position: [number, number, number]
  selected: boolean
  onSelect: (id: number) => void
  reducedMotion: boolean
}) {
  const features = useMemo(
    () =>
      resolvePlanetFeatures(troop.planet_style_id, troop.planet_seed, troop.planet_params),
    [troop.planet_style_id, troop.planet_seed, troop.planet_params],
  )
  const aura = rankAura(troop.rank)
  const meshRef = useRef<THREE.Mesh>(null)
  const material = useMemo(() => {
    const [base, detail, accent, cloud] = features.colors
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: (features.seed % 997) / 17 },
        uKind: { value: planetKindIndex(features.kind) },
        uA: { value: new THREE.Color(base) },
        uB: { value: new THREE.Color(detail) },
        uC: { value: new THREE.Color(accent) },
        uCloud: { value: new THREE.Color(cloud) },
        uAtmo: { value: new THREE.Color(features.atmosphere) },
        uScale: { value: features.scale },
        uCoverage: { value: features.coverage },
        uWarp: { value: features.warp },
        uGloss: { value: features.gloss },
        uCloudAmt: { value: features.cloud },
        uCloudSpeed: { value: reducedMotion ? 0 : features.cloudSpeed },
      },
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
    })
  }, [features, reducedMotion])

  const ringMaterial = useMemo(() => {
    if (features.rings <= 0) return null
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(features.ringColor) },
        uSeed: { value: (features.seed % 97) / 10 },
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }, [features])

  useEffect(() => {
    return () => {
      material.dispose()
      ringMaterial?.dispose()
    }
  }, [material, ringMaterial])

  useFrame((_, dt) => {
    material.uniforms.uTime!.value += reducedMotion ? 0 : dt
    if (!meshRef.current || reducedMotion) return
    meshRef.current.rotation.y += dt * 0.12
  })

  return (
    <group position={position}>
      {aura && (
        <mesh raycast={() => null}>
          <sphereGeometry args={[1.55, 24, 24]} />
          <meshBasicMaterial
            color={aura}
            transparent
            opacity={selected ? 0.35 : 0.22}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh raycast={() => null}>
        <sphereGeometry args={[1.07, 32, 32]} />
        <meshBasicMaterial
          color={features.atmosphere}
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={meshRef}
        scale={selected ? 1.12 : 1}
        material={material}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(troop.id)
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[1, 48, 48]} />
      </mesh>
      {features.rings > 0 && !selected && (
        <mesh raycast={() => null} rotation={[features.ringTilt, 0.4, 0.15]}>
          <ringGeometry args={[1.38, features.rings === 2 ? 2.15 : 1.72, 96]} />
          {ringMaterial && <primitive object={ringMaterial} attach="material" />}
        </mesh>
      )}
    </group>
  )
}

function CameraRig({
  focus,
  bounds,
  onNearEdge,
  reducedMotion,
  pointerMoved,
}: {
  focus: { x: number; z: number } | null
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  onNearEdge: () => void
  reducedMotion: boolean
  pointerMoved: { current: boolean }
}) {
  const { camera, gl, size } = useThree()
  const target = useRef(new THREE.Vector3(0, 18, 22))
  const look = useRef(new THREE.Vector3(0, 0, 0))
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const edgeDir = useRef({ x: 0, z: 0 })
  const focusAnim = useRef<THREE.Vector3 | null>(null)
  const downAt = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!focus) {
      focusAnim.current = null
      return
    }
    focusAnim.current = new THREE.Vector3(focus.x, 0, focus.z)
  }, [focus])

  useEffect(() => {
    const el = gl.domElement

    const onDown = (e: PointerEvent) => {
      dragging.current = true
      pointerMoved.current = false
      downAt.current = { x: e.clientX, y: e.clientY }
      last.current = { x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
    }
    const onUp = (e: PointerEvent) => {
      dragging.current = false
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const lx = e.clientX - rect.left
      const ly = e.clientY - rect.top
      let ex = 0
      let ez = 0
      if (lx < EDGE_PX) ex = -1
      else if (lx > rect.width - EDGE_PX) ex = 1
      if (ly < EDGE_PX) ez = -1
      else if (ly > rect.height - EDGE_PX) ez = 1
      edgeDir.current = { x: ex, z: ez }

      if (!dragging.current) return
      const travelX = e.clientX - downAt.current.x
      const travelY = e.clientY - downAt.current.y
      if (travelX * travelX + travelY * travelY > 36) pointerMoved.current = true
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }
      const scale = (camera.position.y / 28) * 0.045
      look.current.x -= dx * scale
      look.current.z -= dy * scale
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const next = THREE.MathUtils.clamp(
        camera.position.y + e.deltaY * 0.02,
        ZOOM_MIN,
        ZOOM_MAX,
      )
      target.current.y = next
      target.current.z = next * 1.15
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('wheel', onWheel)
    }
  }, [camera, gl, size, pointerMoved])

  useFrame((_, dt) => {
    if (focusAnim.current) {
      const speed = reducedMotion ? 1 : 1 - Math.pow(0.001, dt)
      look.current.lerp(focusAnim.current, Math.min(1, speed * (reducedMotion ? 8 : 1.8)))
      if (look.current.distanceTo(focusAnim.current) < 0.05) {
        look.current.copy(focusAnim.current)
        focusAnim.current = null
      }
    }

    if (!dragging.current && (edgeDir.current.x || edgeDir.current.z)) {
      const zoomScale = camera.position.y / 22
      look.current.x += edgeDir.current.x * EDGE_SPEED * zoomScale * dt
      look.current.z += edgeDir.current.z * EDGE_SPEED * zoomScale * dt
    }

    look.current.x = THREE.MathUtils.clamp(look.current.x, bounds.minX, bounds.maxX)
    look.current.z = THREE.MathUtils.clamp(look.current.z, bounds.minZ, bounds.maxZ)

    const margin = 3.5
    const nearEdge =
      look.current.x < bounds.minX + margin ||
      look.current.x > bounds.maxX - margin ||
      look.current.z < bounds.minZ + margin ||
      look.current.z > bounds.maxZ - margin
    if (nearEdge) onNearEdge()

    target.current.x = look.current.x
    target.current.z = look.current.z + target.current.y * 1.15
    camera.position.lerp(target.current, reducedMotion ? 1 : 1 - Math.pow(0.0008, dt))
    camera.lookAt(look.current.x, 0, look.current.z)
  })

  return null
}

function Scene({
  troops,
  layouts,
  openId,
  focus,
  bounds,
  onSelect,
  onNearEdge,
  reducedMotion,
  canvasBg,
  floorColor,
  accentColor,
  pointerMoved,
}: {
  troops: UniverseTroop[]
  layouts: PlanetLayoutPoint[]
  openId: number | null
  focus: { x: number; z: number } | null
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  onSelect: (id: number) => void
  onNearEdge: () => void
  reducedMotion: boolean
  canvasBg: string
  floorColor: string
  accentColor: string
  pointerMoved: { current: boolean }
}) {
  const byId = useMemo(() => new Map(troops.map((t) => [t.id, t])), [troops])

  return (
    <>
      <color attach="background" args={[canvasBg]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 14, 6]} intensity={1.1} />
      <pointLight position={[-10, 6, -8]} intensity={0.4} color={accentColor} />
      <StarField reducedMotion={reducedMotion} />
      <CameraRig
        focus={focus}
        bounds={bounds}
        onNearEdge={onNearEdge}
        reducedMotion={reducedMotion}
        pointerMoved={pointerMoved}
      />
      {layouts.map((p) => {
        const troop = byId.get(p.id)
        if (!troop) return null
        return (
          <PlanetMesh
            key={p.id}
            troop={troop}
            position={[p.x, 0, p.z]}
            selected={openId === p.id}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        )
      })}
      <mesh raycast={() => null} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <circleGeometry args={[120, 48]} />
        <meshBasicMaterial color={floorColor} transparent opacity={0.55} />
      </mesh>
    </>
  )
}

export function SpaceUniverse({
  troops,
  myTroopId,
  openId,
  onSelectTroop,
  onClearTroop,
  onRequestMore,
  focusToken,
}: {
  troops: UniverseTroop[]
  myTroopId: number | null
  openId: number | null
  onSelectTroop: (id: number) => void
  onClearTroop: () => void
  onRequestMore: () => void
  focusToken: number
}) {
  const layoutMapRef = useRef(new Map<number, { x: number; z: number }>())
  const [reducedMotion, setReducedMotion] = useState(false)
  const [sceneColors, setSceneColors] = useState({
    bg: '#050816',
    floor: '#0a1024',
    accent: '#93c5fd',
  })
  const edgeCooldown = useRef(0)
  const pointerMoved = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const read = () => {
      const cs = getComputedStyle(root)
      setSceneColors({
        bg: cs.getPropertyValue('--space-canvas-bg').trim() || '#050816',
        floor: cs.getPropertyValue('--space-floor').trim() || '#0a1024',
        accent: cs.getPropertyValue('--accent').trim() || '#93c5fd',
      })
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-accent'],
    })
    return () => obs.disconnect()
  }, [])

  const layouts = useMemo(() => {
    const ids = troops.map((t) => t.id)
    const points = layoutPlanets(ids, myTroopId, layoutMapRef.current)
    for (const p of points) layoutMapRef.current.set(p.id, { x: p.x, z: p.z })
    return points
  }, [troops, myTroopId])

  const bounds = useMemo(() => universeBounds(layouts), [layouts])

  const focus = useMemo(() => {
    if (openId == null) return null
    const p = layoutMapRef.current.get(openId)
    return p ? { x: p.x, z: p.z } : { x: 0, z: 0 }
    // focusToken fuerza recentrar (botón volver)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, focusToken, layouts])

  const openLayout = openId != null ? layoutMapRef.current.get(openId) : null

  const onNearEdge = useCallback(() => {
    const now = Date.now()
    if (now - edgeCooldown.current < 900) return
    edgeCooldown.current = now
    onRequestMore()
  }, [onRequestMore])

  return (
    <div className="space-universe">
      <Canvas
        camera={{ position: [0, 18, 22], fov: 45, near: 0.1, far: 200 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={(event) => {
          if (event.type !== 'click') return
          if (pointerMoved.current) return
          onClearTroop()
        }}
      >
        <Suspense fallback={null}>
          <Scene
            troops={troops}
            layouts={layouts}
            openId={openId}
            focus={focus}
            bounds={bounds}
            onSelect={onSelectTroop}
            onNearEdge={onNearEdge}
            reducedMotion={reducedMotion}
            canvasBg={sceneColors.bg}
            floorColor={sceneColors.floor}
            accentColor={sceneColors.accent}
            pointerMoved={pointerMoved}
          />
        </Suspense>
      </Canvas>
      {openLayout && (
        <div
          className="space-universe-anchor"
          data-open-id={openId ?? ''}
          style={{
            // El card se posiciona en CSS overlay; el padre proyecta con % aprox.
            // TroopsPage usa el card centrado; el planeta 3D ya hace focus.
          }}
        />
      )}
    </div>
  )
}

export function getPlanetScreenHint(
  troopId: number,
  layoutMap: Map<number, { x: number; z: number }>,
) {
  return layoutMap.get(troopId) ?? null
}
