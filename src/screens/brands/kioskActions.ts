import {createContext, useContext} from 'react'
import type {KioskAction, KioskNodeData} from '@/types/brands'

export type KioskActionHandler = (action: KioskAction, kiosk: KioskNodeData) => void

/**
 * Lets kiosk cards inside the React Flow canvas trigger screen-level dialogs
 * without threading callbacks through node `data` (which stays serializable
 * and testable).
 */
export const KioskActionsContext = createContext<KioskActionHandler>(() => {})

export const useKioskActions = () => useContext(KioskActionsContext)
