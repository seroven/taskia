import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { resolvePlanetLook } from '../../../lib/planetStyles'
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
  const style = resolvePlanetLook(troop.planet_style_id, troop.planet_params)
  const aura = rankAura(troop.rank)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, dt) => {
    if (!meshRef.current || reducedMotion) return
    meshRef.current.rotation.y += dt * 0.15
  })

  return (
    <group position={position}>
      {aura && (
        <mesh>
          <sphereGeometry args={[1.55, 24, 24]} />
          <meshBasicMaterial
            color={aura}
            transparent
            opacity={selected ? 0.35 : 0.22}
            depthWrite={false}
          />
        </mesh>
      )}
      {style.atmosphere && (
        <mesh>
          <sphereGeometry args={[1.22, 24, 24]} />
          <meshBasicMaterial
            color={style.atmosphere}
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        scale={selected ? 1.12 : 1}
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
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={selected ? 0.55 : 0.28}
          roughness={style.roughness}
          metalness={style.metalness}
        />
      </mesh>
    </group>
  )
}

function CameraRig({
  focus,
  bounds,
  onNearEdge,
  reducedMotion,
}: {
  focus: { x: number; z: number } | null
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  onNearEdge: () => void
  reducedMotion: boolean
}) {
  const { camera, gl, size } = useThree()
  const target = useRef(new THREE.Vector3(0, 18, 22))
  const look = useRef(new THREE.Vector3(0, 0, 0))
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const edgeDir = useRef({ x: 0, z: 0 })
  const focusAnim = useRef<THREE.Vector3 | null>(null)

  useEffect(() => {
    if (!focus) return
    focusAnim.current = new THREE.Vector3(focus.x, 0, focus.z)
  }, [focus])

  useEffect(() => {
    const el = gl.domElement

    const onDown = (e: PointerEvent) => {
      dragging.current = true
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
  }, [camera, gl, size])

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
}) {
  const byId = useMemo(() => new Map(troops.map((t) => [t.id, t])), [troops])

  return (
    <>
      <color attach="background" args={[canvasBg]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 14, 6]} intensity={1.1} />
      <pointLight position={[-10, 6, -8]} intensity={0.4} color={accentColor} />
      {!reducedMotion && (
        <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.4} />
      )}
      <CameraRig
        focus={focus}
        bounds={bounds}
        onNearEdge={onNearEdge}
        reducedMotion={reducedMotion}
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
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
  onRequestMore,
  focusToken,
}: {
  troops: UniverseTroop[]
  myTroopId: number | null
  openId: number | null
  onSelectTroop: (id: number) => void
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
    if (openId == null) return myTroopId != null ? { x: 0, z: 0 } : { x: 0, z: 0 }
    const p = layoutMapRef.current.get(openId)
    return p ? { x: p.x, z: p.z } : { x: 0, z: 0 }
    // focusToken fuerza recentrar (botón volver)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, myTroopId, focusToken, layouts])

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
