// Service Worker를 동적으로 생성하는 함수
export const generateServiceWorkerCode = () => {
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
  };

  return `
// Firebase SDK 임포트
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Firebase 설정 (환경변수에서 동적 생성)
const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firebase 메시징 서비스 가져오기
const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드 메시지 수신:', payload);

  // 알림 옵션 설정
  const notificationTitle = payload.notification?.title || '새 알림';
  const notificationOptions = {
    body: payload.notification?.body || '새로운 메시지가 도착했습니다.',
    icon: payload.notification?.icon || '/character.png',
    badge: '/character.png',
    tag: 'fcm-notification-' + Date.now(),
    renotify: false,
    silent: false,
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '열기',
        icon: '/character.png'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ],
    data: {
      url: payload.data?.url || '/',
      ...payload.data
    }
  };

  // 알림 표시
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭됨:', event);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // 앱 열기
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // 이미 열린 탭이 있다면 포커스
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 새 탭 열기
        if (clients.openWindow) {
          const urlToOpen = event.notification.data?.url || '/';
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('Firebase Service Worker 설치됨');
  self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('Firebase Service Worker 활성화됨');
  event.waitUntil(self.clients.claim());
});
`;
};

// Service Worker를 public 폴더에 동적으로 생성하는 함수
export const createServiceWorkerFile = () => {
  const swCode = generateServiceWorkerCode();
  
  // 개발 환경에서는 동적으로 파일 내용을 업데이트
  // 실제로는 빌드 시점에 생성되어야 함
  return swCode;
};

// Service Worker 등록 함수 (정적 파일 사용)
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker가 지원되지 않습니다.');
    return null;
  }

  try {
    console.log('Firebase Service Worker 등록 시도, 프로토콜:', window.location.protocol);

    // HTTPS가 아닌 localhost가 아닌 경우에만 Service Worker 등록 시도
    const isHttpsRequired = window.location.protocol === 'https:' && window.location.hostname !== 'localhost';
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost';

    if (!isSecureContext && isHttpsRequired) {
      console.log('비보안 컨텍스트에서는 Firebase Service Worker를 등록할 수 없습니다.');
      return null;
    }

    // 이미 등록된 Firebase Service Worker가 있는지 확인
    const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (existingRegistration) {
      console.log('Firebase Service Worker 이미 등록됨:', existingRegistration);
      return existingRegistration;
    }
    
    // 새로운 Service Worker 등록
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('Firebase Service Worker 등록 성공:', registration);
    
    return registration;
  } catch (error) {
    console.error('Firebase Service Worker 등록 실패:', error);
    // SSL 오류나 보안 오류는 조용히 처리
    if (error instanceof Error && (error.message.includes('SSL') || error.message.includes('SecurityError'))) {
      console.log('SSL/보안 문제로 Firebase Service Worker 등록을 건너뜁니다.');
    }
    return null;
  }
};