'use client';

import React from 'react';
import type { ResponsibilityBadgesProps, GeneralResponsibilityData, ReceptionResponsibilityData } from '../../types/responsibility';

/**
 * 統一担当設定バッジコンポーネント
 * 全ページで同一のスタイル・ロジックを使用
 */
export const ResponsibilityBadges: React.FC<ResponsibilityBadgesProps> = ({
  responsibilities,
  isReception
}) => {
  if (!responsibilities) return null;
  
  const badges: JSX.Element[] = [];
  
  if (isReception) {
    // 受付部署用バッジ
    const receptionResp = responsibilities as ReceptionResponsibilityData;
    
    if (receptionResp.lunch) {
      badges.push(
        <span key="lunch" className="responsibility-badge bg-blue-500 text-white px-1 py-0 rounded text-[10px] font-bold ml-1">
          昼
        </span>
      );
    }
    
    if (receptionResp.fax) {
      badges.push(
        <span key="fax" className="responsibility-badge bg-green-500 text-white px-1 py-0 rounded text-[10px] font-bold ml-1">
          FAX
        </span>
      );
    }
    
    if (receptionResp.cs) {
      badges.push(
        <span key="cs" className="responsibility-badge bg-purple-500 text-white px-1 py-0 rounded text-[10px] font-bold ml-1">
          CS
        </span>
      );
    }
    
    if (receptionResp.custom) {
      badges.push(
        <span key="custom" className="responsibility-badge bg-gray-500 text-white px-1 py-0 rounded text-[10px] font-bold ml-1">
          {receptionResp.custom.substring(0, 3)}
        </span>
      );
    }
  } else {
    // 一般部署用バッジ
    const generalResp = responsibilities as GeneralResponsibilityData;
    
    if (generalResp.fax) {
      badges.push(
        <span key="fax" className="responsibility-badge bg-green-500 text-white px-1 py-0 rounded text-[10px] font-bold ml-1">
          FAX
        </span>
      );
    }
    
    if (generalResp.subjectCheck) {
      badges.push(
        <span key="subject" className="responsibility-badge bg-orange-500 text-white px-1 py-0 rounded text-[10px] font-bold ml-1">
          件名
        </span>
      );
    }
    
    if (generalResp.custom) {
      badges.push(
        <span key="custom" className="responsibility-badge bg-gray-500 text-white px-1 py-0 rounded text-[10px] font-bold ml-1">
          {generalResp.custom.substring(0, 3)}
        </span>
      );
    }
  }
  
  return <>{badges}</>;
};