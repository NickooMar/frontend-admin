import {createContext, useContext} from 'react'
import type {KioskAction, KioskNodeData, ScheduleAction, ScheduleNodeData} from '@/types/brands'

export type KioskActionHandler = (action: KioskAction, kiosk: KioskNodeData) => void
export type ScheduleActionHandler = (action: ScheduleAction, schedule: ScheduleNodeData) => void

/**
 * Lets the cards inside the React Flow canvas trigger screen-level dialogs
 * without threading callbacks through node `data` (which stays serializable
 * and testable). One context per node kind, so a card only sees the actions
 * it can actually raise.
 */
export const KioskActionsContext = createContext<KioskActionHandler>(() => {})
export const ScheduleActionsContext = createContext<ScheduleActionHandler>(() => {})

export const useKioskActions = () => useContext(KioskActionsContext)
export const useScheduleActions = () => useContext(ScheduleActionsContext)
