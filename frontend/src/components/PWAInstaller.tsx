import React, { useState, useEffect } from 'react';

interface PWAInstallerProps {
  onStatusUpdate: (message: string, type: 'loading' | 'error' | 'success') => void;
}

const PWAInstaller: React.FC<PWAInstallerProps> = ({ onStatusUpdate }) => {
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWA 설치 가능 이벤트 감지
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA 설치 프롬프트 준비됨');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPWAInstallable(true);
    };

    // PWA 설치 완료 감지
    const handleAppInstalled = () => {
      console.log('PWA 설치 완료');
      setIsInstalled(true);
      setIsPWAInstallable(false);
      setDeferredPrompt(null);
      onStatusUpdate('PWA가 성공적으로 설치되었습니다! 🎉', 'success');
    };

    // 이미 PWA로 실행 중인지 확인
    const checkIfPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      
      if (isStandalone || isInWebAppiOS) {
        setIsInstalled(true);
        onStatusUpdate('PWA 모드로 실행 중입니다 ✨', 'success');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    checkIfPWA();
    registerPWAServiceWorker();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onStatusUpdate]);

  const registerPWAServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        console.log('PWA Service Worker 등록 시도, 프로토콜:', window.location.protocol);

        // HTTPS가 아닌 localhost가 아닌 경우에만 Service Worker 등록 시도
        const isHttpsRequired = window.location.protocol === 'https:' && window.location.hostname !== 'localhost';
        const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost';

        if (!isSecureContext && isHttpsRequired) {
          console.log('비보안 컨텍스트에서는 Service Worker를 등록할 수 없습니다.');
          onStatusUpdate('HTTPS 환경이 필요합니다', 'error');
          return;
        }

        // 이미 등록된 PWA Service Worker가 있는지 확인
        const existingPWARegistration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (existingPWARegistration) {
          console.log('PWA Service Worker 이미 등록됨:', existingPWARegistration);
          return;
        }

        // 기본 scope로 등록 (Firebase와 충돌 방지)
        const newRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('PWA Service Worker 등록 성공:', newRegistration);
        onStatusUpdate('PWA Service Worker 등록 완료', 'success');
      } catch (error) {
        console.error('PWA Service Worker 등록 실패:', error);
        // SSL 오류나 보안 오류 시 조용히 처리
        if (error instanceof Error && (error.message.includes('SSL') || error.message.includes('SecurityError'))) {
          console.log('SSL/보안 문제로 PWA Service Worker 등록을 건너뜁니다.');
          onStatusUpdate('개발 환경: 보안 제약으로 PWA 기능 제한됨', 'loading');
        } else {
          onStatusUpdate('PWA Service Worker 등록 실패', 'error');
        }
      }
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      onStatusUpdate('PWA 설치 프롬프트를 사용할 수 없습니다.', 'error');
      return;
    }

    onStatusUpdate('PWA 설치 중...', 'loading');
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        onStatusUpdate('PWA 설치가 시작됩니다...', 'loading');
      } else {
        onStatusUpdate('PWA 설치가 취소되었습니다.', 'error');
      }
      
      setDeferredPrompt(null);
      setIsPWAInstallable(false);
    } catch (error) {
      console.error('PWA 설치 오류:', error);
      onStatusUpdate('PWA 설치 중 오류가 발생했습니다.', 'error');
    }
  };

  if (isInstalled) {
    return (
      <div style={{ margin: '10px 0', padding: '15px', background: '#e8f5e8', borderRadius: '8px', border: '1px solid #4caf50' }}>
        <div style={{ color: '#2e7d32', fontWeight: 'bold', marginBottom: '8px' }}>
          ✅ PWA 설치 완료
        </div>
        <div style={{ color: '#666', fontSize: '14px' }}>
          앱이 성공적으로 설치되어 독립 실행 모드로 동작 중입니다.
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '10px 0' }}>
      <h3>📱 PWA 설치</h3>
      
      <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '14px', color: '#666' }}>
        이 앱을 홈 화면에 설치하면 네이티브 앱처럼 사용할 수 있습니다.
      </div>

      {isPWAInstallable ? (
        <button
          onClick={handleInstallPWA}
          style={{
            padding: '12px 20px',
            backgroundColor: '#FF6B35',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📱 앱 설치하기
        </button>
      ) : (
        <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px', color: '#856404', fontSize: '14px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            💡 수동 설치 방법:
          </div>
          <div>
            • Chrome: 주소창 옆 설치 아이콘 클릭 또는 메뉴 → "앱 설치"<br/>
            • Safari: 공유 버튼 → "홈 화면에 추가"
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAInstaller;