import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Switch} from '@/components/ui/switch'
import {STRINGS} from '@/lib/strings'
import type {AdminKioskDetail, EcgFilterSetting, MonitorVital} from '@/types/brands'
import type {ParamsDraft} from './kioskEditModel'
import {NumberField, SectionTitle, SwitchRow} from './FormBits'

const COPY = STRINGS.brands.edit.params

const VITALS = ['ECG', 'RESP', 'SPO2', 'TEMP'] as const

export function ParamsForm({
  draft,
  onChange,
  detail,
  disabled,
}: {
  draft: ParamsDraft
  onChange: (draft: ParamsDraft) => void
  detail: AdminKioskDetail
  disabled?: boolean
}) {
  const setEcg = (patch: Partial<ParamsDraft['ecg']>) => onChange({...draft, ecg: {...draft.ecg, ...patch}})
  const setFilter = (key: 'frec' | 'muscle' | 'baseline', patch: Partial<EcgFilterSetting>) =>
    setEcg({filter: {...draft.ecg.filter, [key]: {...draft.ecg.filter[key], ...patch}}})
  const setMonitor = (patch: Partial<ParamsDraft['monitor']>) => onChange({...draft, monitor: {...draft.monitor, ...patch}})
  const setVital = (key: (typeof VITALS)[number], patch: Partial<MonitorVital>) =>
    setMonitor({config: {...draft.monitor.config, [key]: {...draft.monitor.config[key], ...patch}}})
  const setNibp = (patch: Partial<ParamsDraft['monitor']['config']['NIBP']>) =>
    setMonitor({config: {...draft.monitor.config, NIBP: {...draft.monitor.config.NIBP, ...patch}}})
  const setNetwork = (patch: Partial<ParamsDraft['networkQuality']>) =>
    onChange({...draft, networkQuality: {...draft.networkQuality, ...patch}})

  const welcomeVideo = detail.params?.welcomeVideo

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionTitle>{COPY.ecg}</SectionTitle>
        <div className="grid gap-2">
          <FilterRow
            label={COPY.filterFrec}
            setting={draft.ecg.filter.frec}
            options={['x', 'z']}
            onChange={(patch) => setFilter('frec', patch)}
            disabled={disabled}
          />
          <FilterRow
            label={COPY.filterMuscle}
            setting={draft.ecg.filter.muscle}
            options={['1', '2', '3', '4']}
            onChange={(patch) => setFilter('muscle', patch)}
            disabled={disabled}
          />
          <FilterRow
            label={COPY.filterBaseline}
            setting={draft.ecg.filter.baseline}
            options={['1', '2', '3', '4']}
            onChange={(patch) => setFilter('baseline', patch)}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            label={COPY.stillHereStart}
            value={draft.ecg.stillHereStart}
            onChange={(stillHereStart) => setEcg({stillHereStart})}
            min={0}
            disabled={disabled}
          />
          <NumberField
            label={COPY.stillHerePeriod}
            value={draft.ecg.stillHerePeriod}
            onChange={(stillHerePeriod) => setEcg({stillHerePeriod})}
            min={0}
            disabled={disabled}
          />
          <NumberField
            label={COPY.stillHereCountdownPeriod}
            value={draft.ecg.stillHereCountdownPeriod}
            onChange={(stillHereCountdownPeriod) => setEcg({stillHereCountdownPeriod})}
            min={0}
            disabled={disabled}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>{COPY.monitor}</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1 font-medium">{COPY.vital}</th>
                <th className="pb-1 font-medium">{COPY.min}</th>
                <th className="pb-1 font-medium">{COPY.max}</th>
                <th className="pb-1 text-center font-medium">{COPY.alarm}</th>
                <th className="pb-1 text-center font-medium">{COPY.on}</th>
              </tr>
            </thead>
            <tbody>
              {VITALS.map((key) => {
                const vital = draft.monitor.config[key]
                return (
                  <tr key={key} className="border-t">
                    <td className="py-1.5 pr-3 font-mono">{key}</td>
                    <td className="py-1.5 pr-3">
                      <NumberField
                        label={`${key} ${COPY.min}`}
                        value={vital.min}
                        onChange={(min) => setVital(key, {min})}
                        disabled={disabled}
                        className="[&_label]:sr-only"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <NumberField
                        label={`${key} ${COPY.max}`}
                        value={vital.max}
                        onChange={(max) => setVital(key, {max})}
                        disabled={disabled}
                        className="[&_label]:sr-only"
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <Switch
                        aria-label={`${key} ${COPY.alarm}`}
                        checked={vital.isAlarmActive}
                        onCheckedChange={(isAlarmActive) => setVital(key, {isAlarmActive})}
                        disabled={disabled}
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <Switch
                        aria-label={`${key} ${COPY.on}`}
                        checked={vital.switchOn}
                        onCheckedChange={(switchOn) => setVital(key, {switchOn})}
                        disabled={disabled}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs">NIBP</span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                {COPY.alarm}
                <Switch
                  aria-label={`NIBP ${COPY.alarm}`}
                  checked={draft.monitor.config.NIBP.isAlarmActive}
                  onCheckedChange={(isAlarmActive) => setNibp({isAlarmActive})}
                  disabled={disabled}
                />
              </span>
              <span className="flex items-center gap-2">
                {COPY.on}
                <Switch
                  aria-label={`NIBP ${COPY.on}`}
                  checked={draft.monitor.config.NIBP.switchOn}
                  onCheckedChange={(switchOn) => setNibp({switchOn})}
                  disabled={disabled}
                />
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            <NumberField
              label={COPY.minSys}
              value={draft.monitor.config.NIBP.minSys}
              onChange={(minSys) => setNibp({minSys})}
              disabled={disabled}
            />
            <NumberField
              label={COPY.maxSys}
              value={draft.monitor.config.NIBP.maxSys}
              onChange={(maxSys) => setNibp({maxSys})}
              disabled={disabled}
            />
            <NumberField
              label={COPY.minDia}
              value={draft.monitor.config.NIBP.minDia}
              onChange={(minDia) => setNibp({minDia})}
              disabled={disabled}
            />
            <NumberField
              label={COPY.maxDia}
              value={draft.monitor.config.NIBP.maxDia}
              onChange={(maxDia) => setNibp({maxDia})}
              disabled={disabled}
            />
            <NumberField
              label={COPY.measureInterval}
              value={draft.monitor.config.NIBP.measureInterval}
              onChange={(measureInterval) => setNibp({measureInterval})}
              min={0}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid items-end gap-3 sm:grid-cols-2">
          <SwitchRow
            label={COPY.showInstructions}
            checked={draft.monitor.showInstructions}
            onCheckedChange={(showInstructions) => setMonitor({showInstructions})}
            disabled={disabled}
          />
          <NumberField
            label={COPY.alarmInterval}
            value={draft.monitor.alarmInterval}
            onChange={(alarmInterval) => setMonitor({alarmInterval})}
            min={0}
            disabled={disabled}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>{COPY.network}</SectionTitle>
        <SwitchRow
          label={COPY.networkEnabled}
          checked={draft.networkQuality.enabled}
          onCheckedChange={(enabled) => setNetwork({enabled})}
          disabled={disabled}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            label={COPY.intervalMs}
            value={draft.networkQuality.intervalMs}
            onChange={(intervalMs) => setNetwork({intervalMs})}
            min={5000}
            max={3600000}
            disabled={disabled}
          />
          <NumberField
            label={COPY.minDownloadKbps}
            value={draft.networkQuality.minDownloadKbps}
            onChange={(minDownloadKbps) => setNetwork({minDownloadKbps})}
            min={0}
            disabled={disabled}
          />
          <NumberField
            label={COPY.minUploadKbps}
            value={draft.networkQuality.minUploadKbps}
            onChange={(minUploadKbps) => setNetwork({minUploadKbps})}
            min={0}
            disabled={disabled}
          />
          <NumberField
            label={COPY.maxLatencyMs}
            value={draft.networkQuality.maxLatencyMs}
            onChange={(maxLatencyMs) => setNetwork({maxLatencyMs})}
            min={1}
            disabled={disabled}
          />
          <NumberField
            label={COPY.maxPacketLossPercent}
            value={draft.networkQuality.maxPacketLossPercent}
            onChange={(maxPacketLossPercent) => setNetwork({maxPacketLossPercent})}
            min={0}
            max={100}
            disabled={disabled}
          />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <SectionTitle>{COPY.modes}</SectionTitle>
        <SwitchRow
          label={COPY.keyboardMode}
          checked={draft.keyboardMode}
          onCheckedChange={(keyboardMode) => onChange({...draft, keyboardMode})}
          disabled={disabled}
        />
        <SwitchRow
          label={COPY.assistantMode}
          checked={draft.assistantMode}
          onCheckedChange={(assistantMode) => onChange({...draft, assistantMode})}
          disabled={disabled}
        />
        {welcomeVideo?.key ? (
          <p className="pt-1 text-xs text-muted-foreground">{COPY.welcomeVideo(welcomeVideo.originalName ?? welcomeVideo.key)}</p>
        ) : null}
      </section>
    </div>
  )
}

function FilterRow({
  label,
  setting,
  options,
  onChange,
  disabled,
}: {
  label: string
  setting: EcgFilterSetting
  options: string[]
  onChange: (patch: Partial<EcgFilterSetting>) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {COPY.active}
          <Switch
            aria-label={`${label} ${COPY.active}`}
            checked={setting.active}
            onCheckedChange={(active) => onChange({active})}
            disabled={disabled}
          />
        </span>
        <Select
          value={String(setting.value)}
          onValueChange={(value) => onChange({value: /^\d+$/.test(value) ? Number(value) : value})}
          disabled={disabled}>
          <SelectTrigger aria-label={`${label} ${COPY.value}`} size="sm" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
