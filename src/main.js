import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ------- Scene / Camera / Renderer -------
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 5)

const renderer = new THREE.WebGLRenderer({
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setClearColor(0xffffff) // white page background
renderer.domElement.style.display = 'block'
document.body.appendChild(renderer.domElement)


// try to set renderer output encoding depending on Three.js version
if (typeof THREE.sRGBEncoding !== 'undefined') {
  renderer.outputEncoding = THREE.sRGBEncoding
} else if (typeof THREE.SRGBColorSpace !== 'undefined') {
  renderer.outputColorSpace = THREE.SRGBColorSpace
}

// ------- Lighting -------
const ambient = new THREE.AmbientLight(0xffffff, 1.2)
scene.add(ambient)
const dir = new THREE.DirectionalLight(0xffffff, 0.8)
dir.position.set(2, 2, 5)
scene.add(dir)

// ------- Controls -------
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 2
controls.maxDistance = 12
controls.dampingFactor = 0.08

// ------- Texture loader + helpers -------
const loader = new THREE.TextureLoader()
const maxAnisotropy = renderer.capabilities && renderer.capabilities.getMaxAnisotropy
  ? renderer.capabilities.getMaxAnisotropy()
  : 1

// arrays to keep track of clickable cube meshes
const cubes = []
const clickableMeshes = []

// helper that creates a cube with an edge-outline and stores its image path
function createOutlinedCube(imagePath, position) {
  // load texture
  const texture = loader.load(imagePath)
  // better color handling (compat)
  if (typeof THREE.sRGBEncoding !== 'undefined') {
    texture.encoding = THREE.sRGBEncoding
  } else if (typeof THREE.SRGBColorSpace !== 'undefined') {
    texture.colorSpace = THREE.SRGBColorSpace
  }
  // improve sharpness for high-res images
  texture.anisotropy = maxAnisotropy
  texture.minFilter = THREE.LinearMipMapLinearFilter

  // material & geometry
  const geometry = new THREE.BoxGeometry(1.6, 1.6, 0.12) // slightly thin box (art-like)
  const material = new THREE.MeshBasicMaterial({ map: texture })
  const cube = new THREE.Mesh(geometry, material)
  cube.position.copy(position)

  // add black outline (edges)
  const edges = new THREE.EdgesGeometry(geometry)
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 })
  const outline = new THREE.LineSegments(edges, lineMaterial)
  cube.add(outline)

  // store image path for lightbox
  cube.userData = { imagePath }

  scene.add(cube)
  cubes.push(cube)
  clickableMeshes.push(cube)
  return cube
}

// ------- Add your cubes (replace with your real image paths in /public) -------
// ---- Create a 3D grid of artworks automatically ----
const imagePaths = [
  '/art1.jpeg', '/art2.jpeg', '/art3.jpeg', '/art4.jpeg', '/art5.jpeg', '/art6.jpeg',
  '/art7.jpeg', '/art8.jpeg', '/art9.jpeg', '/art10.jpeg', '/art11.jpeg', '/art12.jpeg',
  '/art13.jpeg', '/art14.jpeg', '/art15.jpeg', '/art16.jpeg', '/art17.jpeg', '/art18.jpeg'
]

// grid layout settings
const cols = 6  // number of artworks per row
const spacingX = 3.0  // horizontal gap between cubes
const spacingY = 3.0  // vertical gap between cubes
const startX = -((cols - 1) * spacingX) / 2  // center grid horizontally

imagePaths.forEach((path, i) => {
  const row = Math.floor(i / cols)
  const col = i % cols
  const x = startX + col * spacingX
  const y = 3 - row * spacingY // start high and go down each row
  const z = 0
  createOutlinedCube(path, new THREE.Vector3(x, y, z))
})


// ------- Raycaster for clicks -------
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

let isLightboxOpen = false
let currentLightbox = null

// Create overlay (we will add / remove children from it)
function openLightbox(imagePath) {
  if (isLightboxOpen) return

  // disable controls + stop rotations
  controls.enabled = false
  isLightboxOpen = true

  // overlay container
  const overlay = document.createElement('div')
  overlay.id = 'three-lightbox'
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    display: 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    background: 'rgba(0,0,0,0.9)', // dark for focus
    zIndex: 9999,
    cursor: 'zoom-out'
  })

  // image element
  const img = document.createElement('img')
  img.src = imagePath
  Object.assign(img.style, {
    maxWidth: '92vw',
    maxHeight: '92vh',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    border: '6px solid #ffffff',
    display: 'block',
    objectFit: 'contain'
  })

  // close button
  const btn = document.createElement('button')
  btn.innerHTML = '✕'
  Object.assign(btn.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: 10000
  })

  btn.addEventListener('click', closeLightbox)
  overlay.addEventListener('click', (e) => {
    // clicking background (not the image) or overlay closes
    if (e.target === overlay) closeLightbox()
  })

  overlay.appendChild(img)
  overlay.appendChild(btn)
  document.body.appendChild(overlay)
  currentLightbox = overlay

  // prevent background from being scrolled (safety, though we used overflow:hidden earlier)
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  if (!isLightboxOpen) return
  controls.enabled = true
  isLightboxOpen = false
  if (currentLightbox) {
    currentLightbox.remove()
    currentLightbox = null
  }
  document.body.style.overflow = '' // restore
}

// pointer handler
function onPointerDown(event) {
  // compute normalized device coords (-1..1)
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(clickableMeshes, true)

  if (intersects.length > 0) {
    // find the top clickable parent (in case a child geometry was hit)
    let obj = intersects[0].object
    while (obj && !clickableMeshes.includes(obj)) {
      obj = obj.parent
    }
    if (obj && obj.userData && obj.userData.imagePath) {
      openLightbox(obj.userData.imagePath)
    }
  } else {
    // if clicked empty space and lightbox is open, close it
    if (isLightboxOpen) closeLightbox()
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown, false)

// close with Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isLightboxOpen) closeLightbox()
})

// ------- Animation -------
let rotateEnabled = true
function animate() {
  requestAnimationFrame(animate)

  // only rotate when no lightbox open (so user sees details steady)
  if (!isLightboxOpen && rotateEnabled) {
    cubes.forEach(c => {
      c.rotation.y += 0.005
    })
  }

  controls.update()
  renderer.render(scene, camera)
}
animate()

// ------- Resize -------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Adding background music -------
// --- Background Music ---
const bgAudio = new Audio('/soft-bg.mp3')
bgAudio.loop = true
bgAudio.volume = 0.2

// Play only after the user interacts (bypass autoplay block)
window.addEventListener('click', () => {
  if (bgAudio.paused) {
    bgAudio.play().catch(err => console.log('Autoplay blocked:', err))
  }
})
// ------- End of code -------
