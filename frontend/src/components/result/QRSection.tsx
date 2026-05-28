import React, { useEffect, useState } from 'react';
import { shareOrCopy } from '@/utils/helpers';
import { generateResultCard, downloadResultCard } from '@/utils/resultCardGeneratorV3';
import type { PersonalColorResult } from '@/types';

interface QRSectionProps {
  result: PersonalColorResult;
  instagramId?: string;
}

export const QRSection: React.FC<QRSectionProps> = ({ result, instagramId }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR code for the current page URL
    const currentUrl = window.location.href;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
    setQrCodeUrl(qrApiUrl);
  }, []);

  const handleShare = async () => {
    try {
      await shareOrCopy({
        title: 'Hijab Personal Color Analysis Results',
        text: `My personal color is ${result.personal_color_en}!`,
        url: window.location.href,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleSaveImage = async () => {
    try {
      const blob = await generateResultCard(result, instagramId || '');
      const filename = `hijab_color_${result.personal_color_en.replace(' ', '_')}_${Date.now()}.jpg`;
      downloadResultCard(blob, filename);
    } catch (error) {
      console.error('Failed to save image:', error);
      alert('Failed to save image.');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 18px',
        alignItems: 'center',
        gap: '10px',
        alignSelf: 'stretch',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {/* Title */}
        <h3
          style={{
            color: '#000',
            textAlign: 'center',
            fontFamily: 'Pretendard',
            fontSize: '18px',
            fontStyle: 'normal',
            fontWeight: 700,
            lineHeight: '140%',
          }}
        >
          Scan QR Code
          <br />
          Get Your Personal Results & Product Recommendations
        </h3>
      </div>

      {/* QR Code */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          marginTop: '16px',
          marginBottom: '16px',
        }}
      >
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="QR Code"
            style={{
              width: '140px',
              height: '140px',
              imageRendering: 'pixelated',
            }}
          />
        ) : (
          <div
            style={{
              width: '140px',
              height: '140px',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
            }}
          />
        )}
      </div>

      {/* Scan Button */}
      <button
        onClick={handleSaveImage}
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '370px',
          height: '57px',
          padding: '10px 16px',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          borderRadius: '10px',
          background: '#FFF49B',
          border: 'none',
          color: '#3B1389',
          textAlign: 'center',
          fontFamily: 'Inter',
          fontSize: '16px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: '140%',
          cursor: 'pointer',
        }}
      >
        Scan Now
      </button>
    </div>
  );
};
