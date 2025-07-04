// 担当設定関連コンポーネントの統一エクスポート
export { ResponsibilityModal } from './ResponsibilityModal';
export { ResponsibilityBadges } from './ResponsibilityBadges';

// 関連する型とユーティリティも再エクスポート
export type { 
  ResponsibilityData, 
  GeneralResponsibilityData, 
  ReceptionResponsibilityData,
  ResponsibilityModalProps,
  ResponsibilityBadgesProps
} from '../../types/responsibility';

export { 
  isReceptionStaff, 
  createResponsibilityKey, 
  hasResponsibilityData,
  initializeResponsibilityData
} from '../../utils/responsibilityUtils';