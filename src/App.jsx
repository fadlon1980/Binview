import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  Check,
  Copy,
  DoorOpen,
  Edit3,
  Eye,
  Home,
  ImagePlus,
  Lock,
  MapPin,
  Package,
  Plus,
  QrCode,
  Search,
  Shield,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const APP_NAME = 'BinView'
const STORAGE_KEY = 'binview_private_family_mvp_v2'

const defaultFamilyMembers = [
  { name: 'Elad', role: 'Owner' },
  { name: 'Maayan', role: 'Admin' },
  { name: 'Michal', role: 'Viewer' },
  { name: 'Maya', role: 'Viewer' },
  { name: 'Daniel', role: 'Viewer' },
]

const demoBins = [
  {
    id: 'garage-bin-04',
    name: 'Garage Bin 04',
    location: 'Garage Shelf B',
    category: 'Winter Clothes',
    notes: 'Kids winter clothes, gloves, and hats.',
    createdAt: new Date().toISOString(),
    photos: [],
  },
]

function createInitialState() {
  return {
    currentUser: null,
    familyMembers: defaultFamilyMembers,
    bins: demoBins,
  }
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : createInitialState()
  } catch {
    return createInitialState()
  }
}

function safeSave(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function makeSlug(value) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `bin-${Date.now()}`
  )
}

function readFilesAsDataUrls(files) {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () =>
            resolve({
              id: createId(),
              url: reader.result,
              caption: file.name.replace(/\.[^.]+$/, ''),
              createdAt: new Date().toISOString(),
            })
          reader.onerror = reject
          reader.readAsDataURL(file)
        }),
    ),
  )
}

function getRole(name, familyMembers) {
  return familyMembers.find((member) => member.name.toLowerCase() === name?.toLowerCase())?.role || null
}

function canEdit(role) {
  return role === 'Owner' || role === 'Admin'
}

function Button({ children, className = '', variant = 'primary', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
  const styles = {
    primary: 'bg-slate-950 text-white shadow-sm hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-700 ring-1 ring-red-100 hover:bg-red-100',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

function Field({ label, value, onChange, placeholder, disabled, textarea = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50"
        />
      )}
    </label>
  )
}

function LoginScreen({ state, setState }) {
  const [name, setName] = useState('Elad')
  const [error, setError] = useState('')

  function signIn() {
    const normalized = name.trim()
    const role = getRole(normalized, state.familyMembers)
    if (!role) {
      setError('This name is not approved for this private family app.')
      return
    }
    setState((prev) => ({ ...prev, currentUser: { name: normalized, role } }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid w-full gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-7 md:p-9">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              <Lock className="h-4 w-4" /> Private family garage-bin app
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{APP_NAME}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Create QR labels for closed storage bins. Scan the QR later to see the photos and notes for what is inside — only approved family members can view it in this prototype.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <Package className="mb-2 h-5 w-5" />
                <p className="text-sm font-semibold">Create bins</p>
                <p className="mt-1 text-xs text-slate-500">Name, location, category, notes.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <Camera className="mb-2 h-5 w-5" />
                <p className="text-sm font-semibold">Add photos</p>
                <p className="mt-1 text-xs text-slate-500">Use camera or upload from phone.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <QrCode className="mb-2 h-5 w-5" />
                <p className="text-sm font-semibold">Print QR</p>
                <p className="mt-1 text-xs text-slate-500">Stick label on each bin.</p>
              </div>
            </div>
          </Card>

          <Card className="p-7 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Family sign in</h2>
                <p className="text-sm text-slate-500">Prototype login using approved family names.</p>
              </div>
            </div>
            <Field label="Family member name" value={name} onChange={setName} placeholder="Elad" />
            {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <Button onClick={signIn} className="mt-5 w-full">
              <Lock className="h-4 w-4" /> Sign in
            </Button>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Approved family names</p>
              <p className="mt-1">Elad · Maayan · Michal · Maya · Daniel</p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function Header({ currentUser, onLogout, activeView, setActiveView }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur no-print">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <button onClick={() => setActiveView('home')} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-lg font-semibold leading-none">{APP_NAME}</p>
            <p className="text-xs text-slate-500">Private family bins</p>
          </div>
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          <Button variant={activeView === 'home' ? 'primary' : 'ghost'} onClick={() => setActiveView('home')}>
            <Home className="h-4 w-4" /> Bins
          </Button>
          <Button variant={activeView === 'family' ? 'primary' : 'ghost'} onClick={() => setActiveView('family')}>
            <Users className="h-4 w-4" /> Family
          </Button>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-2xl bg-slate-100 px-3 py-2 text-right text-xs md:block">
            <p className="font-medium text-slate-800">{currentUser.name}</p>
            <p className="text-slate-500">{currentUser.role}</p>
          </div>
          <Button variant="secondary" onClick={onLogout}>
            <DoorOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 md:hidden">
        <Button variant={activeView === 'home' ? 'primary' : 'secondary'} onClick={() => setActiveView('home')}>
          <Home className="h-4 w-4" /> Bins
        </Button>
        <Button variant={activeView === 'family' ? 'primary' : 'secondary'} onClick={() => setActiveView('family')}>
          <Users className="h-4 w-4" /> Family
        </Button>
      </div>
    </header>
  )
}

function HomeScreen({ bins, setBins, currentUser, selectBin }) {
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const roleCanEdit = canEdit(currentUser.role)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bins
    return bins.filter((bin) => [bin.name, bin.location, bin.category, bin.notes].join(' ').toLowerCase().includes(q))
  }, [bins, query])

  function createBin(form) {
    const baseSlug = makeSlug(form.name)
    const exists = bins.some((bin) => bin.id === baseSlug)
    const id = exists ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug
    const newBin = {
      id,
      ...form,
      createdAt: new Date().toISOString(),
      photos: [],
    }
    setBins((prev) => [newBin, ...prev])
    setShowCreate(false)
    selectBin(id)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Storage bins</h1>
          <p className="mt-1 text-slate-500">Search, create, and open your private bin photo inventory.</p>
        </div>
        {roleCanEdit && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create new bin
          </Button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by bin name, location, category, or note..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {showCreate && <CreateBinModal onClose={() => setShowCreate(false)} onCreate={createBin} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bin) => (
          <motion.button
            key={bin.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => selectBin(bin.id)}
            className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <Package className="h-6 w-6 text-slate-700" />
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{bin.photos.length} photos</span>
            </div>
            <h2 className="text-xl font-semibold">{bin.name}</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {bin.location || 'No location'}</p>
              <p className="flex items-center gap-2"><Eye className="h-4 w-4" /> {bin.category || 'No category'}</p>
            </div>
            {bin.notes && <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{bin.notes}</p>}
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium">No bins found</p>
          <p className="mt-1 text-sm text-slate-500">Try another search or create a new bin.</p>
        </Card>
      )}
    </main>
  )
}

function CreateBinModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', location: '', category: '', notes: '' })
  const canSubmit = form.name.trim().length > 0

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Create new bin</h2>
            <p className="text-sm text-slate-500">Add the basic label details first.</p>
          </div>
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4">
          <Field label="Bin name" value={form.name} onChange={(v) => update('name', v)} placeholder="Garage Bin 04" />
          <Field label="Location" value={form.location} onChange={(v) => update('location', v)} placeholder="Garage Shelf B" />
          <Field label="Category" value={form.category} onChange={(v) => update('category', v)} placeholder="Winter clothes" />
          <Field label="Notes" value={form.notes} onChange={(v) => update('notes', v)} placeholder="What is inside?" textarea />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={() => onCreate(form)}>
            <Check className="h-4 w-4" /> Create bin
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function BinDetailScreen({ bin, setBins, currentUser, goHome }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(bin)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const roleCanEdit = canEdit(currentUser.role)

  useEffect(() => {
    setDraft(bin)
  }, [bin])

  const binUrl = `${window.location.origin}${window.location.pathname}#/bin/${bin.id}`

  function updateBin(updater) {
    setBins((prev) => prev.map((item) => (item.id === bin.id ? updater(item) : item)))
  }

  function saveDraft() {
    updateBin(() => draft)
    setIsEditing(false)
  }

  async function addPhotos(files) {
    if (!files?.length) return
    const newPhotos = await readFilesAsDataUrls(files)
    updateBin((item) => ({ ...item, photos: [...newPhotos, ...item.photos] }))
  }

  function updatePhotoCaption(photoId, caption) {
    updateBin((item) => ({
      ...item,
      photos: item.photos.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo)),
    }))
  }

  function deletePhoto(photoId) {
    updateBin((item) => ({ ...item, photos: item.photos.filter((photo) => photo.id !== photoId) }))
  }

  function deleteBin() {
    const confirmed = window.confirm(`Delete ${bin.name}?`)
    if (!confirmed) return
    setBins((prev) => prev.filter((item) => item.id !== bin.id))
    goHome()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(binUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Button variant="ghost" onClick={goHome} className="-ml-2 mb-3">← Back to bins</Button>
          <h1 className="text-3xl font-semibold tracking-tight">{bin.name}</h1>
          <p className="mt-1 text-slate-500">Private QR inventory page</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowQR(true)}>
            <QrCode className="h-4 w-4" /> QR label
          </Button>
          {roleCanEdit && (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4" /> Edit
              </Button>
              <Button variant="danger" onClick={deleteBin}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.3fr]">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100"><Package className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold">Bin details</h2>
              <p className="text-sm text-slate-500">Information shown after QR scan.</p>
            </div>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Location</p>
              <p className="mt-1 text-slate-800">{bin.location || 'No location added'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Category</p>
              <p className="mt-1 text-slate-800">{bin.category || 'No category added'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-800">{bin.notes || 'No notes added'}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Private access</p>
            <p className="mt-1">Only approved family names can open this bin page after login.</p>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Photos</h2>
              <p className="text-sm text-slate-500">Take photos before closing the bin.</p>
            </div>
            {roleCanEdit && (
              <div className="flex flex-wrap gap-2">
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" multiple onChange={(e) => addPhotos(e.target.files)} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" multiple onChange={(e) => addPhotos(e.target.files)} />
                <Button variant="secondary" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-4 w-4" /> Camera
                </Button>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              </div>
            )}
          </div>

          {bin.photos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <ImagePlus className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium">No photos yet</p>
              <p className="mt-1 text-sm text-slate-500">Add photos of the items before you close the bin.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {bin.photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  <img src={photo.url} alt={photo.caption || 'Bin photo'} className="h-56 w-full object-cover" />
                  <div className="p-3">
                    {roleCanEdit ? (
                      <input
                        value={photo.caption}
                        onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                        placeholder="Photo caption"
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    ) : (
                      <p className="text-sm font-medium">{photo.caption || 'Photo'}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                      {roleCanEdit && (
                        <button onClick={() => deletePhoto(photo.id)} className="rounded-full p-2 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {isEditing && (
        <EditBinModal
          draft={draft}
          setDraft={setDraft}
          onClose={() => { setDraft(bin); setIsEditing(false) }}
          onSave={saveDraft}
        />
      )}

      {showQR && <QRCodeModal bin={bin} binUrl={binUrl} copied={copied} onCopy={copyLink} onClose={() => setShowQR(false)} />}
    </main>
  )
}

function EditBinModal({ draft, setDraft, onClose, onSave }) {
  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Edit bin</h2>
            <p className="text-sm text-slate-500">Update details for the QR inventory page.</p>
          </div>
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4">
          <Field label="Bin name" value={draft.name} onChange={(v) => update('name', v)} />
          <Field label="Location" value={draft.location} onChange={(v) => update('location', v)} />
          <Field label="Category" value={draft.category} onChange={(v) => update('category', v)} />
          <Field label="Notes" value={draft.notes} onChange={(v) => update('notes', v)} textarea />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}><Check className="h-4 w-4" /> Save</Button>
        </div>
      </motion.div>
    </div>
  )
}

function QRCodeModal({ bin, binUrl, copied, onCopy, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between no-print">
          <div>
            <h2 className="text-xl font-semibold">QR label</h2>
            <p className="text-sm text-slate-500">Print and stick this on the bin.</p>
          </div>
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="print-label rounded-3xl border border-slate-200 p-5 text-center print:border-none">
          <p className="text-lg font-semibold">{bin.name}</p>
          <p className="mb-4 text-sm text-slate-500">{bin.location || 'Storage bin'}</p>
          <div className="mx-auto flex w-fit rounded-3xl bg-white p-4 ring-1 ring-slate-200">
            <QRCodeSVG value={binUrl} size={190} level="M" includeMargin />
          </div>
          <p className="mt-4 break-all rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">{binUrl}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 no-print">
          <Button variant="secondary" onClick={onCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button onClick={() => window.print()}>
            <QrCode className="h-4 w-4" /> Print label
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

function FamilyScreen({ state, setState }) {
  const [memberName, setMemberName] = useState('')
  const [role, setRole] = useState('Viewer')
  const currentRole = state.currentUser.role
  const ownerOnly = currentRole === 'Owner'

  function addMember() {
    const normalized = memberName.trim()
    if (!normalized) return
    setState((prev) => {
      const existing = prev.familyMembers.some((member) => member.name.toLowerCase() === normalized.toLowerCase())
      if (existing) return prev
      return { ...prev, familyMembers: [...prev.familyMembers, { name: normalized, role }] }
    })
    setMemberName('')
  }

  function removeMember(memberNameToRemove) {
    setState((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((member) => member.name !== memberNameToRemove),
    }))
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Family access</h1>
        <p className="mt-1 text-slate-500">Control which family names can open private bin pages.</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100"><Users className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold">Approved family members</h2>
            <p className="text-sm text-slate-500">Prototype access list. Firebase will enforce this later.</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {state.familyMembers.map((member) => (
            <div key={member.name} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-slate-500">{member.role}</p>
              </div>
              {ownerOnly && member.role !== 'Owner' && (
                <Button variant="danger" onClick={() => removeMember(member.name)}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5">
        <h2 className="mb-4 text-lg font-semibold">Add family member</h2>
        {!ownerOnly ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Only the Owner can add or remove family members.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
            <Field label="Name" value={memberName} onChange={setMemberName} placeholder="Family member name" />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
                <option>Viewer</option>
                <option>Admin</option>
              </select>
            </label>
            <Button onClick={addMember}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        )}
      </Card>

      <div className="mt-5 rounded-3xl bg-slate-100 p-5 text-sm leading-6 text-slate-600">
        <p className="font-semibold text-slate-800">Role guide</p>
        <p className="mt-1">Owner can manage family access. Admin can create/edit bins and photos. Viewer can only scan and view bin contents.</p>
      </div>
    </main>
  )
}

export default function App() {
  const [state, setState] = useState(() => safeLoad())
  const [activeView, setActiveView] = useState('home')
  const [selectedBinId, setSelectedBinId] = useState(null)

  useEffect(() => {
    safeSave(state)
  }, [state])

  useEffect(() => {
    const readHash = () => {
      const match = window.location.hash.match(/^#\/bin\/(.+)$/)
      if (match) {
        setSelectedBinId(match[1])
        setActiveView('bin')
      }
    }
    readHash()
    window.addEventListener('hashchange', readHash)
    return () => window.removeEventListener('hashchange', readHash)
  }, [])

  const selectedBin = state.bins.find((bin) => bin.id === selectedBinId)

  function setBins(updater) {
    setState((prev) => ({ ...prev, bins: typeof updater === 'function' ? updater(prev.bins) : updater }))
  }

  function selectBin(id) {
    setSelectedBinId(id)
    setActiveView('bin')
    window.location.hash = `/bin/${id}`
  }

  function goHome() {
    setSelectedBinId(null)
    setActiveView('home')
    window.location.hash = ''
  }

  function logout() {
    setState((prev) => ({ ...prev, currentUser: null }))
    goHome()
  }

  if (!state.currentUser) {
    return <LoginScreen state={state} setState={setState} />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header
        currentUser={state.currentUser}
        onLogout={logout}
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view)
          if (view !== 'bin') setSelectedBinId(null)
        }}
      />
      {activeView === 'home' && <HomeScreen bins={state.bins} setBins={setBins} currentUser={state.currentUser} selectBin={selectBin} />}
      {activeView === 'family' && <FamilyScreen state={state} setState={setState} />}
      {activeView === 'bin' && selectedBin && <BinDetailScreen bin={selectedBin} setBins={setBins} currentUser={state.currentUser} goHome={goHome} />}
      {activeView === 'bin' && !selectedBin && (
        <main className="mx-auto max-w-3xl px-4 py-10">
          <Card className="text-center">
            <Lock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h1 className="text-xl font-semibold">Bin not found</h1>
            <p className="mt-2 text-slate-500">This QR link does not match an existing bin in this browser prototype.</p>
            <Button onClick={goHome} className="mt-5">Back to bins</Button>
          </Card>
        </main>
      )}
    </div>
  )
}
