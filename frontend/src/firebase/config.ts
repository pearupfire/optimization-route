import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase 설정 (환경변수에서 가져오기)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// FCM 초기화 (브라우저 지원 여부 확인)
let messaging: any = null;
let messagingSupported = false;

// 브라우저 호환성 확인
const initializeMessaging = async () => {
  try {
    // 추가 브라우저 체크
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // 모든 환경에서 Firebase Messaging 시도 (iOS 제한 제거)
    
    // 모든 브라우저에서 시도 (Safari 제한도 제거)

    // 기본 API 지원 체크
    if (!hasServiceWorker || !hasPushManager) {
      console.warn('이 브라우저는 필요한 API를 지원하지 않습니다.');
      messagingSupported = false;
      return;
    }

    // Firebase Messaging 지원 체크 (모든 환경에서 강제 시도)
    let supported = true; // 무조건 지원한다고 가정
    console.log('모든 환경에서 Firebase Messaging 강제 초기화');
    
    if (supported) {
      messaging = getMessaging(app);
      messagingSupported = true;
      console.log('Firebase Messaging 초기화 완료');
    } else {
      messagingSupported = false;
      console.warn('Firebase Messaging이 이 브라우저에서 지원되지 않습니다.');
    }
  } catch (error) {
    console.error('Firebase Messaging 초기화 실패:', error);
    messagingSupported = false;
    messaging = null;
  }
};

// 즉시 초기화
initializeMessaging();

export { messaging, messagingSupported };

// VAPID 키 (환경변수에서 가져오기)
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

// FCM 토큰 요청
export const requestFCMToken = async (): Promise<string | null> => {
  try {
    console.log('FCM 토큰 요청 시작...');
    console.log('현재 프로토콜:', window.location.protocol);
    
    // messaging이 초기화되지 않았다면 null 반환
    if (!messaging) {
      console.warn('Firebase Messaging이 초기화되지 않았습니다.');
      return null;
    }

    console.log('vapidKey:', vapidKey);

    // Firebase SDK의 기본 동작 사용 (Service Worker 자동 등록)
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
    });
    
    if (token) {
      console.log('FCM 토큰 생성 성공:', token);
      return token;
    } else {
      console.log('FCM 토큰을 가져올 수 없습니다. 권한이나 설정을 확인하세요.');
      return null;
    }
  } catch (err) {
    console.error('FCM 토큰 요청 중 오류:', err);
    console.error('오류 상세:', {
      message: (err as Error).message,
      stack: (err as Error).stack
    });
    return null;
  }
};

// 포그라운드 메시지 수신
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.warn('Firebase Messaging이 지원되지 않아 포그라운드 메시지를 수신할 수 없습니다.');
    return;
  }
  
  onMessage(messaging, (payload) => {
    console.log('포그라운드 메시지 수신:', payload);
    callback(payload);
  });
};

export default app;