'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fmtN, today, fechaES, dateAddISO } from '@/lib/utils'
import type { Producto, OrdenProduccion } from '@/types/database'
import { PRODUCTOS_DEFAULT } from '@/lib/productos-default'

const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }
const b = (v?: 'gold'): React.CSSProperties => ({ padding: '4px 9px', borderRadius: 6, border: `1px solid ${v === 'gold' ? 'var(--gold)' : 'var(--border)'}`, background: v === 'gold' ? 'var(--gold)' : 'var(--card)', color: v === 'gold' ? '#0f0f0f' : 'var(--text)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' })

// Etiqueta de CONTROL INTERNO (para producción)
function etqControlHTML(p: Producto, fpFmt: string, venceFmt: string, peso: string, lote: string, resp: string) {
  return `<div style="border:2px solid #000;border-radius:4px;padding:8px 10px;max-width:260px;background:#fff;color:#000;font-family:'Courier New',monospace;font-size:11px">
    <div style="font-weight:bold;border-bottom:2px solid #000;padding-bottom:3px;margin-bottom:5px;font-size:10px;letter-spacing:1px">CONTROL INTERNO — LEM</div>
    <div style="font-weight:bold;font-size:13px;margin-bottom:4px">${p.nombre}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:10px">
      <div><strong>Lote:</strong> ${lote}</div>
      <div><strong>Cant:</strong> ${peso}</div>
      <div><strong>Fecha prod:</strong> ${fpFmt}</div>
      <div><strong>Resp:</strong> ${resp || '—'}</div>
      <div style="grid-column:span 2;margin-top:3px;border-top:1px dashed #000;padding-top:3px"><strong>VENCE: ${venceFmt}</strong> (${p.vida_util_dias}d)</div>
    </div>
  </div>`
}

// Etiqueta de CLIENTE (para packaging)
function etqClienteHTML(p: Producto, fpFmt: string, venceFmt: string, peso: string, lote: string, inst: string) {
  return `<div style="border:2px solid #000;border-radius:4px;padding:10px 12px;max-width:270px;background:#fff;color:#000;font-family:Georgia,serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:7px">
      <div style="font-size:15px;font-weight:bold;letter-spacing:1px">LA ESQUINA DE MADERNA</div>
      ${(p as any).cod_interno ? `<div style="font-size:9px;font-family:monospace;color:#555;margin-top:2px">${(p as any).cod_interno}</div>` : ''}
    </div>
    <div style="font-size:17px;font-weight:bold;line-height:1.2;margin-bottom:5px">${p.nombre}</div>
    <div style="font-size:13px;color:#333;margin-bottom:6px">${peso}</div>
    <div style="font-size:11px;border-top:1px solid #ccc;padding-top:5px">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span><strong>Fecha elaboración:</strong> ${fpFmt}</span>
      </div>
      <div style="font-size:14px;font-weight:bold;color:#b00;margin:5px 0">CONSUMIR PREFERENTEMENTE ANTES DEL:<br>${venceFmt}</div>
      ${inst ? `<div style="font-size:10px;color:#444;border-top:1px dashed #ccc;padding-top:4px;margin-top:4px">${inst}</div>` : ''}
    </div>
    <div style="font-size:8px;color:#999;margin-top:5px;border-top:1px solid #eee;padding-top:3px;display:flex;justify-content:space-between"><span>Lote: ${lote}</span>${(p as any).codigo_ean ? `<span style="font-family:monospace">${(p as any).codigo_ean}</span>` : "<span>chefprivado.ar</span>"}</div>
  </div>`
}

export function EtiquetasClient() {
  return <Suspense fallback={null}><EtiquetasInner /></Suspense>
}

function EtiquetasInner() {
  const params = useSearchParams()
  const [prods, setProds] = useState<Producto[]>([])
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([])
  const [selProd, setSelProd] = useState<number | ''>('')
  const [selOrden, setSelOrden] = useState<number | ''>('')
  const [fprod, setFprod] = useState(today())
  const [lote, setLote] = useState('')
  const [peso, setPeso] = useState('1 kg')
  const [batch, setBatch] = useState(1)
  const [inst, setInst] = useState('')
  const [resp, setResp] = useState('')
  const [tipoEtq, setTipoEtq] = useState<'cliente' | 'control'>('cliente')

  useEffect(() => {
    supabase.from('productos').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => {
        const ps = data && data.length ? data : PRODUCTOS_DEFAULT.map((p, i) => ({ ...p, id: i + 1 })) as Producto[]
        setProds(ps)
        if (ps.length && !selProd) setSelProd(ps[0].id)
      })
    supabase.from('ordenes_produccion').select('*').neq('estado', 'cancelado').order('created_at', { ascending: false })
      .then(({ data }) => setOrdenes(data || []))
    supabase.from('ordenes_produccion').select('*', { count: 'exact', head: true })
      .then(({ count }) => setLote('L' + String((count ?? 0) + 1).padStart(3, '0')))
  }, [])

  useEffect(() => {
    const ordenId = params.get('orden')
    if (ordenId && ordenes.length) {
      const o = ordenes.find(x => x.id === parseInt(ordenId))
      if (o) {
        setSelOrden(o.id)
        setSelProd(o.producto_id || '')
        setFprod(o.fecha_produccion)
        setLote(o.numero_lote)
        setPeso(fmtN(o.cantidad_kg) + ' kg')
        setResp(o.responsable || '')
      }
    }
  }, [params, ordenes])

  const prod = prods.find(p => p.id === selProd)
  const fpFmt = prod ? fechaES(fprod || today()) : ''
  const venceISO = prod && fprod ? dateAddISO(fprod, prod.vida_util_dias) : ''
  const venceFmt = venceISO ? fechaES(venceISO) : ''
  const instrFinal = inst || prod?.instrucciones || ''

  async function imprimir() {
    if (!prod) return
    if (selOrden) {
      const o = ordenes.find(x => x.id === selOrden)
      if (o) await supabase.from('ordenes_produccion').update({ etiquetas_generadas: (o.etiquetas_generadas || 0) + batch }).eq('id', o.id)
    }
    const pa = document.getElementById('print-area')
    if (!pa) return
    let html = `<style>body{background:#fff;color:#000} @media print{body *{display:none} #print-area,#print-area *{display:block!important} #print-area{padding:4mm;display:grid;grid-template-columns:1fr 1fr;gap:8mm}}</style>`
    for (let i = 1; i <= batch; i++) {
      const loteI = `${lote}-${String(i).padStart(2, '0')}`
      html += tipoEtq === 'cliente'
        ? etqClienteHTML(prod, fpFmt, venceFmt, peso, loteI, instrFinal)
        : etqControlHTML(prod, fpFmt, venceFmt, peso, loteI, resp)
    }
    pa.innerHTML = html
    window.print()
  }

  const previewHTML = prod && venceFmt
    ? tipoEtq === 'cliente'
      ? etqClienteHTML(prod, fpFmt, venceFmt, peso, lote, instrFinal)
      : etqControlHTML(prod, fpFmt, venceFmt, peso, lote, resp)
    : ''

  return (
    <div className='fichas-grid'>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Generador de Etiquetas</div>

        {/* Tipo de etiqueta */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['cliente', 'control'] as const).map(t => (
            <button key={t} onClick={() => setTipoEtq(t)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${tipoEtq === t ? 'var(--gold)' : 'var(--border)'}`, background: tipoEtq === t ? 'var(--gold-bg)' : 'var(--card)', color: tipoEtq === t ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'Georgia,serif' }}>
              {t === 'cliente' ? '🛍 Para cliente' : '🏭 Control interno'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Cargar desde orden de producción</label>
          <select value={selOrden} onChange={e => {
            const id = parseInt(e.target.value); setSelOrden(id || '')
            const o = ordenes.find(x => x.id === id)
            if (o) { setSelProd(o.producto_id || ''); setFprod(o.fecha_produccion); setLote(o.numero_lote); setPeso(fmtN(o.cantidad_kg) + ' kg'); setResp(o.responsable || '') }
          }} style={{ width: '100%' }}>
            <option value="">— O completar manualmente —</option>
            {ordenes.map(o => <option key={o.id} value={o.id}>{o.numero_lote} · {o.producto_nombre} · {fechaES(o.fecha_produccion)}</option>)}
          </select>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />

        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Producto</label>
          <select value={selProd} onChange={e => setSelProd(parseInt(e.target.value))} style={{ width: '100%' }}>
            {prods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Fecha producción</label><input type="date" value={fprod} onChange={e => setFprod(e.target.value)} /></div>
          <div><label style={lbl}>Lote</label><input value={lote} onChange={e => setLote(e.target.value)} placeholder="L001" /></div>
          <div><label style={lbl}>Peso / Cantidad</label><input value={peso} onChange={e => setPeso(e.target.value)} placeholder="500 g" /></div>
          <div><label style={lbl}>Cantidad de etiquetas</label><input type="number" value={batch} onChange={e => setBatch(parseInt(e.target.value) || 1)} min={1} max={50} /></div>
        </div>

        {tipoEtq === 'control' && (
          <div style={{ marginBottom: 10 }}><label style={lbl}>Responsable</label><input value={resp} onChange={e => setResp(e.target.value)} placeholder="Nombre" /></div>
        )}

        {tipoEtq === 'cliente' && (
          <div style={{ marginBottom: 10 }}><label style={lbl}>Instrucciones de cocción</label><textarea value={inst} onChange={e => setInst(e.target.value)} rows={2} placeholder={prod?.instrucciones || 'Instrucciones opcionales'} /></div>
        )}

        {prod && venceFmt && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Vence: <strong style={{ color: '#aa2020' }}>{venceFmt}</strong> ({prod.vida_util_dias} días desde producción)
          </div>
        )}

        <button onClick={imprimir} style={{ ...b('gold'), width: '100%', padding: '8px', fontSize: 13 }}>
          🖨 {batch > 1 ? `Imprimir ${batch} etiquetas` : 'Imprimir etiqueta'}
        </button>
      </div>

      <div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
            Vista previa — {tipoEtq === 'cliente' ? 'Etiqueta cliente' : 'Etiqueta control interno'}
          </div>
          {previewHTML
            ? <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
            : <div style={{ color: 'var(--dim)', fontSize: 12 }}>Seleccioná un producto y una fecha de producción</div>
          }
        </div>
      </div>
    </div>
  )
}
