import React, { useState, useEffect } from 'react';
import { requestFCMToken, onForegroundMessage } from '../firebase/config';
import { registerServiceWorker as registerSW } from '../firebase/generateServiceWorker';

interface FirebasePushNotificationProps {
  onStatusUpdate: (message: string, type: 'loading' | 'error' | 'success') => void;
}

const FirebasePushNotification: React.FC<FirebasePushNotificationProps> = ({ onStatusUpdate }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    checkFirebaseSupport();
    registerServiceWorker();
    setupForegroundMessaging();
  }, []);

  const checkFirebaseSupport = () => {
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isHTTPS = window.location.protocol === 'https:' || window.location.hostname.includes('localhost') || window.location.protocol === 'http:';
    
    let supported = hasServiceWorker && hasPushManager;
    let message = '';
    
    // 기본적으로 Service Worker와 Push Manager가 있으면 모든 브라우저에서 시도
    if (!hasServiceWorker || !hasPushManager) {
      message = '이 브라우저는 푸시 알림 API를 지원하지 않습니다.';
      onStatusUpdate(message, 'error');
      supported = false;
    } else if (!isHTTPS) {
      message = 'PWA와 푸시 알림은 HTTPS 또는 localhost에서만 작동합니다.';
      onStatusUpdate(message, 'error');
      supported = false;
    } else {
      // 모든 조건을 만족하면 무조건 지원
      supported = true;
      if (isIOS) {
        message = 'iOS 환경에서 FCM 구독을 시도합니다.';
        onStatusUpdate(message, 'success');
      } else if (isSafari) {
        message = 'Safari에서 FCM 구독을 시도합니다.';
        onStatusUpdate(message, 'success');
      } else {
        message = 'FCM 푸시 알림이 지원됩니다.';
        onStatusUpdate(message, 'success');
      }
    }
    
    setIsSupported(supported);
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await registerSW();
      if (registration) {
        console.log('Firebase Service Worker 등록 성공:', registration);
      } else {
        onStatusUpdate('Service Worker 등록에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Firebase Service Worker 등록 실패:', error);
      onStatusUpdate('Service Worker 등록에 실패했습니다.', 'error');
    }
  };

  const setupForegroundMessaging = () => {
    onForegroundMessage((payload) => {
      console.log('포그라운드 메시지 수신:', payload);
      
      // Firebase SDK가 자동으로 알림을 표시하므로 중복 알림 제거
      // 브라우저 알림 표시 비활성화
      // if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      //   new Notification(
      //     payload.notification?.title || '새 알림',
      //     {
      //       body: payload.notification?.body || '새로운 메시지가 도착했습니다.',
      //       icon: payload.notification?.icon || '/character.png',
      //       badge: '/character.png'
      //     }
      //   );
      // }
      
      onStatusUpdate(
        `포그라운드 메시지: ${payload.notification?.title || '새 알림'}`,
        'success'
      );
    });
  };

  const subscribeFCM = async () => {
    try {
      onStatusUpdate('알림 권한 확인 중...', 'loading');

      // 현재 알림 권한 상태 확인
      if (typeof Notification === 'undefined') {
        onStatusUpdate('이 브라우저는 알림을 지원하지 않습니다.', 'error');
        return;
      }
      
      console.log('현재 알림 권한:', Notification.permission);
      
      // 알림 권한 요청 (iOS PWA에서는 더 명시적으로)
      let permission = Notification.permission;
      
      if (permission === 'default') {
        console.log('알림 권한 요청 시작');
        onStatusUpdate('알림 권한을 요청합니다...', 'loading');
        
        // iOS PWA에서는 사용자 제스처 내에서 요청해야 함
        permission = await Notification.requestPermission();
        console.log('알림 권한 결과:', permission);
      }
      
      if (permission !== 'granted') {
        onStatusUpdate(`알림 권한이 거부되었습니다: ${permission}`, 'error');
        console.log('알림 권한 상태:', permission);
        return;
      }

      onStatusUpdate('FCM 토큰 요청 중...', 'loading');
      console.log('FCM 토큰 요청 시작');

      // FCM 토큰 가져오기
      const token = await requestFCMToken();
      console.log('토큰 결과:', token);
      
      if (!token) {
        onStatusUpdate('FCM 토큰을 가져올 수 없습니다. 콘솔을 확인하세요.', 'error');
        return;
      }

      setFcmToken(token);

      // 백엔드에 토큰 등록 - 현재 프로토콜에 맞게 자동 선택
      const backendUrl = window.location.protocol === 'https:' 
        ? 'https://172.21.102.77:8000/api/fcm/subscribe'  // HTTPS용
        : 'http://172.21.102.77:8000/api/fcm/subscribe';   // HTTP용
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(true);
        onStatusUpdate(`FCM 구독 완료! (총 ${data.total_subscribers}명 구독중)`, 'success');
      } else {
        throw new Error('서버 등록 실패');
      }

    } catch (error) {
      console.error('FCM 구독 실패:', error);
      onStatusUpdate(`FCM 구독 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, 'error');
    }
  };

  const unsubscribeFCM = async () => {
    if (!fcmToken) {
      return;
    }

    try {
      onStatusUpdate('FCM 구독 해제 중...', 'loading');

      const backendUrl = window.location.protocol === 'https:' 
        ? 'https://172.21.102.77:8000/api/fcm/unsubscribe'
        : 'http://172.21.102.77:8000/api/fcm/unsubscribe';
        
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: fcmToken })
      });

      if (response.ok) {
        setFcmToken(null);
        setIsSubscribed(false);
        onStatusUpdate('FCM 구독이 해제되었습니다.', 'success');
      } else {
        throw new Error('서버 해제 실패');
      }
    } catch (error) {
      console.error('FCM 구독 해제 실패:', error);
      onStatusUpdate('FCM 구독 해제에 실패했습니다.', 'error');
    }
  };

  const sendTestNotification = async () => {
    try {
      onStatusUpdate('테스트 알림 전송 중...', 'loading');
      
      const backendUrl = window.location.protocol === 'https:' 
        ? 'https://172.21.102.77:8000/api/fcm/send-test'
        : 'http://172.21.102.77:8000/api/fcm/send-test';
        
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'FCM 테스트 알림 📱',
          body: 'Firebase Cloud Messaging이 정상적으로 작동합니다!',
          icon: '/character.png'
        })
      });

      if (response.ok) {
        const data = await response.json();
        onStatusUpdate(`테스트 알림 전송 완료! (성공: ${data.success}, 실패: ${data.failed})`, 'success');
      } else {
        const error = await response.json();
        onStatusUpdate(error.detail || '알림 전송에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('테스트 알림 전송 실패:', error);
      onStatusUpdate('테스트 알림 전송에 실패했습니다.', 'error');
    }
  };

  if (false) { // 강제로 FCM 지원 활성화
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isChrome = /chrome/i.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isHTTPS = window.location.protocol === 'https:';
    
    let message = '이 브라우저는 Firebase 푸시 알림을 지원하지 않습니다.';
    let recommendation = '';
    
    if (!isHTTPS) {
      message = 'HTTPS 또는 localhost 필요';
      recommendation = 'PWA와 푸시 알림을 사용하려면 HTTPS 연결 또는 localhost가 필요합니다.';
    } else if (isSafari && !isIOS) {
      message = 'Safari 푸시 알림 제한';
      recommendation = 'Chrome, Edge, 또는 Firefox 브라우저를 사용해보세요.';
    } else if (isAndroid && !isChrome) {
      message = 'Android에서는 Chrome 브라우저 필요';
      recommendation = 'Chrome 브라우저에서 접속하시면 푸시 알림을 받을 수 있습니다.';
    } else if (isSafari) {
      message = 'Safari 푸시 알림 제한';
      recommendation = 'Chrome 또는 Firefox 브라우저를 사용해보세요.';
    }
    
    return (
      <div style={{ margin: '10px 0', padding: '15px', background: '#ffebee', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
        <div style={{ color: '#d32f2f', fontWeight: 'bold', marginBottom: '8px' }}>
          📱 {message}
        </div>
        {recommendation && (
          <div style={{ color: '#666', fontSize: '14px', lineHeight: '1.4' }}>
            💡 {recommendation}
          </div>
        )}
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
          ✅ 지원: HTTPS + Chrome/Edge/Firefox (Desktop), Chrome (Android), iOS PWA (제한적)
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '10px 0' }}>
      <h3>🔥 Firebase 푸시 알림</h3>
      
      {/* 디버깅 정보 */}
      <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
        <div>알림 권한: {typeof Notification !== 'undefined' ? Notification.permission : '지원안함'}</div>
        <div>Service Worker: {'serviceWorker' in navigator ? '✅' : '❌'}</div>
        <div>Push Manager: {'PushManager' in window ? '✅' : '❌'}</div>
        <div>브라우저 환경: {(/iPad|iPhone|iPod/.test(navigator.userAgent)) ? 'iOS' : 'Web'} {(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) ? 'PWA' : 'Browser'}</div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!isSubscribed ? (
          <>
            <button
              onClick={subscribeFCM}
              style={{
                padding: '10px 15px',
                backgroundColor: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              FCM 구독하기
            </button>
            
            {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
              <div style={{ 
                padding: '10px', 
                background: '#ffebee', 
                borderRadius: '4px', 
                color: '#d32f2f', 
                fontSize: '14px',
                maxWidth: '300px'
              }}>
                알림이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.
                <br/>Safari: 설정 → Safari → 웹사이트 → 알림
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={unsubscribeFCM}
              style={{
                padding: '10px 15px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              구독 해제
            </button>
            
            <button
              onClick={sendTestNotification}
              style={{
                padding: '10px 15px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              테스트 알림 보내기
            </button>
          </>
        )}
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        상태: {isSubscribed ? '🟢 FCM 구독중' : '🔴 구독안함'} 
        {isSubscribed && ' | PWA 설치하면 백그라운드에서도 알림을 받을 수 있습니다'}
      </div>
      
      {fcmToken && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', color: '#333', marginBottom: '5px', fontWeight: 'bold' }}>
            FCM 등록 토큰 (Firebase Console에서 테스트용으로 사용):
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            wordBreak: 'break-all',
            background: '#f5f5f5',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontFamily: 'monospace'
          }}>
            {fcmToken}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(fcmToken)}
            style={{
              marginTop: '5px',
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            토큰 복사
          </button>
        </div>
      )}
    </div>
  );
};

export default FirebasePushNotification;