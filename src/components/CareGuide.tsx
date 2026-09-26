import { ArrowRight, ArrowUpRight, ExternalLink, Footprints, Heart, Leaf, MessageCircle, ShieldCheck, Sun } from 'lucide-react'
import { useState } from 'react'
import { useDataset } from '../DatasetContext'
import type { Guidance, Marker } from '../types'
import { GroupIcon, MedicalNote, StatusBadge } from './ui'

export function GuidancePreview({ onGuide }: { onGuide: (id?: string) => void }) {
  const { isPersonal } = useDataset()
  if (isPersonal) return null
  return (
    <section className="guidance-preview" aria-labelledby="small-steps-title">
      <div className="section-heading">
        <div><div className="eyebrow">GOOD HEALTH IS BUILT IN SMALL STEPS</div><h2 id="small-steps-title">A little intention, every day.</h2></div>
        <button className="text-button" onClick={() => onGuide()}>Your next steps <ArrowUpRight size={15} /></button>
      </div>
      <div className="habit-grid">
        <button className="habit-card" onClick={() => onGuide('heart')}><span className="habit-icon"><Leaf size={23} /></span><div><h3>Make room for more fibre.</h3><p>Oats, dal, beans and whole grains. Small swaps to support your cholesterol.</p><span>Eat with intention <ArrowRight size={13} /></span></div></button>
        <button className="habit-card" onClick={() => onGuide('heart')}><span className="habit-icon lilac-icon"><Footprints size={23} /></span><div><h3>Find your everyday movement.</h3><p>A walk you enjoy is a good start. Build a sustainable routine at your pace.</p><span>Build a habit <ArrowRight size={13} /></span></div></button>
        <button className="habit-card" onClick={() => onGuide('vitamin-d')}><span className="habit-icon peach-icon"><Sun size={23} /></span><div><h3>Bring vitamin D to the conversation.</h3><p>Explore food sources and a clinician-led plan. Skip the self-prescribed megadoses.</p><span>Prepare for a check-in <ArrowRight size={13} /></span></div></button>
      </div>
    </section>
  )
}

function GuidanceCard({ plan, section, onSelect }: {
  plan: Guidance
  section: 'all' | 'everyday' | 'clinician'
  onSelect: (marker: Marker) => void
}) {
  const { findMarker } = useDataset()
  return (
    <article className={`panel guidance-card guidance-${plan.id}`}>
      <div className="guidance-card-header">
        <span className={`guidance-icon group-${plan.group}`}><GroupIcon group={plan.group} size={25} /></span>
        <div><div className="eyebrow">{plan.eyebrow}</div><h2>{plan.title}</h2></div>
      </div>
      <p className="guidance-summary">{plan.summary}</p>
      <div className="guidance-markers">
        {plan.markerIds.map((id) => {
          const marker = findMarker(id)
          return <button key={id} onClick={() => onSelect(marker)}><span>{marker.name}<strong>{marker.latest?.raw} <small>{marker.unit}</small></strong></span><StatusBadge marker={marker} compact /><ArrowUpRight size={13} /></button>
        })}
      </div>
      <div className={`guidance-columns ${section !== 'all' ? 'single-section' : ''}`}>
        {section !== 'clinician' && <div className="everyday-guidance">
          <h3><Leaf size={18} />On your plate</h3><ul>{plan.foods.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3><Footprints size={18} />In your routine</h3><ul>{plan.habits.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>}
        {section !== 'everyday' && <div className="clinician-guidance">
          <div className="clinician-label">A DISCUSSION, NOT A PRESCRIPTION</div>
          <h3><MessageCircle size={18} />Ask your clinician</h3>
          <ul>{plan.clinician.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>}
      </div>
      <div className="guidance-caution"><ShieldCheck size={17} /><p>{plan.caution}</p></div>
      <div className="guidance-sources"><span>Further reading</span>{plan.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={11} /></a>)}</div>
    </article>
  )
}

export function CareGuide({ initialTopic, onSelect }: { initialTopic: string; onSelect: (marker: Marker) => void }) {
  const { guidance, isPersonal } = useDataset()
  const [topic, setTopic] = useState(initialTopic)
  const [section, setSection] = useState<'all' | 'everyday' | 'clinician'>('all')
  const plans = guidance.filter((plan) => topic === 'all' || topic === plan.id)
  return (
    <div className="care-guide-page">
      <div className="guide-intro"><span><Heart size={20} /></span><p><strong>{guidance.length} {isPersonal ? 'relevant educational' : 'fictional'} focus areas. General education only.</strong><br />{isPersonal ? 'Topics are shown only for supported measurements currently flagged against your imported latest references. Not every flag has a topic; review all results with a clinician.' : 'These invented scenarios demonstrate the interface, not personalized health advice.'} No treatment or dosage is prescribed.</p></div>
      <div className="guide-filters">
        <div className="guide-topics" aria-label="Filter guidance by focus area">
          <button className={topic === 'all' ? 'active' : ''} onClick={() => setTopic('all')} aria-pressed={topic === 'all'}>All focus areas</button>
          {guidance.map((plan) => <button key={plan.id} className={topic === plan.id ? 'active' : ''} onClick={() => setTopic(plan.id)} aria-pressed={topic === plan.id}><GroupIcon group={plan.group} size={15} />{plan.id === 'vitamin-d' ? 'Vitamin D' : plan.id === 'heart' ? 'Cholesterol' : plan.id === 'blood' ? 'Blood count' : 'Liver'}</button>)}
        </div>
        <div className="guide-sections" aria-label="Filter guidance type">
          {([{ value: 'all', label: 'Full guide' }, { value: 'everyday', label: 'Food & habits' }, { value: 'clinician', label: 'Clinician discussion' }] as const).map((item) => <button key={item.value} className={section === item.value ? 'active' : ''} onClick={() => setSection(item.value)} aria-pressed={section === item.value}>{item.label}</button>)}
        </div>
      </div>
      <div className="guidance-list">{plans.map((plan) => <GuidanceCard key={plan.id} plan={plan} section={section} onSelect={onSelect} />)}</div>
      {!plans.length && <div className="panel empty-state"><h2>No matching educational topics</h2><p>This is not an assessment of overall health. Review your complete results and any concerns with a clinician.</p></div>}
      <MedicalNote />
      <p className="urgent-note">This app cannot assess urgent symptoms. Seek urgent medical care for chest pain, severe breathlessness, fainting or other severe symptoms, regardless of your lab results.</p>
    </div>
  )
}
