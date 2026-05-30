'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, fechaES } from '@/lib/utils'

interface Cliente {
  id: number
  nombre: string
  telefono?: string
  direccion?: string
  notas?: string
  activo: boolean
  created_at: string
}

interface PedidoCliente {
  id: number
  numero: string
  fecha: string
  total: number
  estado: string
  canal: string
}

const b = (v?: 'gold' | 'red' | 'green'): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia,serif',
  border: v === 'gold' ? '1px solid var(--gold)' : v === 'red' ? '1px solid rgba(190,50,50,.3)' : v === 'green' ? '1px solid rgba(30,140,70,.3)' : '1px solid var(--border)',
  background: v === 'gold' ? 'var(--gold)' : v === 'red' ? 'rgba(190,50,50,.08)' : v === 'green' ? 'rgba(30,140,70,.08)' : 'var(--card)',
  color: v === 'gold' ? '#fff' : v === 'red' ? '#aa2020' : v === 'green' ? '#1a7a40' : 'var(--text)',
})
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }

export function ClientesClient() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null)
  const [historial, setHistorial] = useState<PedidoCliente[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [modal, setModal] = useState<'nuevo' | 'editar' | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [fNombre, setFNombre] = useState('')
  const [fTel, setFTel] = useState('')
  const [fDir, setFDir] = useState('')
  const [fNotas, setFNotas] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('clientes').select('*').eq('activo', true).order('nombre')
    setClientes((data || []) as Cliente[])
  }

  async function abrirCliente(c: Cliente) {
    setSeleccionado(c)
    setLoadingHist(true)
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, fecha, total, estado, canal')
      .eq('cliente_id', c.id)
      .order('fecha', { ascending: false })
      .limit(20)
    setHistorial((data || []) as PedidoCliente[])
    setLoadingHist(false)
  }

  function abrirNuevo() {
    setFNombre(''); setFTel(''); setFDir(''); setFNotas('')
    setModal('nuevo')
  }

  function abrirEditar(c: Cliente) {
    setFNombre(c.nombre); setFTel(c.telefono || ''); setFDir(c.direccion || ''); setFNotas(c.notas || '')
    setModal('editar')
  }

  async function guardar() {
    if (!fNombre.trim()) { alert('El nombre es obligatorio'); return }
    setSaving(true)
    const data = { nombre: fNombre.trim(), telefono: fTel, direccion: fDir, notas: fNotas, activo: true }
    if (modal === 'nuevo') {
      await supabase.from('clientes').insert(data)
    } else if (modal === 'editar' && seleccionado) {
      await supabase.from('clientes').update(data).eq('id', seleccionado.id)
    }
    setSaving(false)
    setModal(null)
    load()
    if (modal === 'editar' && seleccionado) {
      setSeleccionado({ ...seleccionado, ...data })
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    if (seleccionado?.id === id) setSeleccionado(null)
    load()
  }

  const filtrados = busqueda
    ? clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono?.includes(busqueda))
    : clientes

  const totalGastado = historial.filter(p => p.estado === 'cobrado').reduce((s, p) => s + (p.total || 0), 0)
  const pedidosCobrados = historial.filter(p => p.estado === 'cobrado').length
  const ultimoPedido = historial[0]

  const overlay: React.CSSProperties = { display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, alignItems: 'center', justifyContent: 'center', padding: 16 }
  const mbox: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--gold-d)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Clientes frecuentes</div>
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>{clientes.length} registrados</div>
        </div>
        <button onClick={abrirNuevo} style={{ ...b('gold'), padding: '8px 18px' }}>+ Nuevo cliente</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: seleccionado ? '300px 1fr' : '1fr', gap: 16 }}>

        {/* Lista de clientes */}
        <div>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono..." style={{ width: '100%', marginBottom: 10 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtrados.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 30, fontSize: 13 }}>
                  {busqueda ? 'Sin resultados' : 'No hay clientes registrados aún'}
                </div>
              : filtrados.map(c => (
                <div key={c.id}
                  onClick={() => abrirCliente(c)}
                  style={{ background: seleccionado?.id === c.id ? 'var(--gold-bg)' : 'var(--card)', border: seleccionado?.id === c.id ? '1px solid var(--gold-d)' : '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>{c.nombre}</div>
                      {c.telefono && <div style={{ fontSize: 11, color: 'var(--muted)' }}>📞 {c.telefono}</div>}
                      {c.direccion && <div style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {c.direccion}</div>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                      {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Panel detalle del cliente */}
        {seleccionado && (
          <div>
            {/* Header */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 18, marginBottom: 12, boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>{seleccionado.nombre}</div>
                  {seleccionado.telefono && (
                    <a href={`tel:${seleccionado.telefono}`} style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                      📞 {seleccionado.telefono}
                    </a>
                  )}
                  {seleccionado.telefono && (
                    <a href={`https://wa.me/549${seleccionado.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: '#1a7a40', textDecoration: 'none' }}>
                      💬 WhatsApp
                    </a>
                  )}
                  {seleccionado.direccion && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>📍 {seleccionado.direccion}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => abrirEditar(seleccionado)} style={{ ...b(), padding: '5px 10px', fontSize: 11 }}>✏ Editar</button>
                  <button onClick={() => eliminar(seleccionado.id)} style={{ ...b('red'), padding: '5px 10px', fontSize: 11 }}>✕</button>
                </div>
              </div>

              {seleccionado.notas && (
                <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: 12, color: 'var(--muted)', borderLeft: '3px solid var(--gold-d)' }}>
                  📌 {seleccionado.notas}
                </div>
              )}

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
                {[
                  { label: 'Pedidos', val: String(pedidosCobrados) },
                  { label: 'Total gastado', val: fmt(totalGastado), color: 'var(--gold)' },
                  { label: 'Último pedido', val: ultimoPedido ? fechaES(ultimoPedido.fecha) : '—' },
                ].map(k => (
                  <div key={k.label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: k.color || 'var(--text)' }}>{k.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historial de pedidos */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
                Historial de pedidos
              </div>

              {loadingHist
                ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 20 }}>Cargando...</div>
                : historial.length === 0
                  ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: 20, fontSize: 13 }}>
                      Sin pedidos registrados aún.
                      <div style={{ fontSize: 11, marginTop: 6 }}>Los pedidos se asocian automáticamente cuando escribís el nombre del cliente en Pedidos.</div>
                    </div>
                  : <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
                        <thead>
                          <tr>{['#','Fecha','Canal','Total','Estado'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {historial.map(p => (
                            <tr key={p.id}>
                              <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--gold)' }}>{p.numero}</td>
                              <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)' }}>{fechaES(p.fecha)}</td>
                              <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)', color: 'var(--muted)', fontSize: 11 }}>{p.canal}</td>
                              <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)', fontWeight: 'bold', color: 'var(--gold)' }}>{fmt(p.total || 0)}</td>
                              <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--borderl)' }}>
                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4,
                                  background: p.estado === 'cobrado' ? 'rgba(26,122,64,.1)' : 'rgba(154,122,26,.1)',
                                  color: p.estado === 'cobrado' ? '#1a7a40' : 'var(--gold)',
                                  border: `1px solid ${p.estado === 'cobrado' ? 'rgba(26,122,64,.2)' : 'rgba(154,122,26,.2)'}` }}>
                                  {p.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
              }
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo/editar */}
      {modal && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={mbox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>
                {modal === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Nombre completo" autoFocus />
              </div>
              <div>
                <label style={lbl}>Teléfono</label>
                <input value={fTel} onChange={e => setFTel(e.target.value)} placeholder="Ej: 1122334455" type="tel" />
              </div>
              <div>
                <label style={lbl}>Dirección</label>
                <input value={fDir} onChange={e => setFDir(e.target.value)} placeholder="Dirección de entrega" />
              </div>
              <div>
                <label style={lbl}>Notas internas</label>
                <textarea value={fNotas} onChange={e => setFNotas(e.target.value)} rows={3} placeholder="Preferencias, observaciones, etc." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{ ...b(), flex: 1 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ ...b('gold'), flex: 2, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando...' : modal === 'nuevo' ? 'Crear cliente' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
