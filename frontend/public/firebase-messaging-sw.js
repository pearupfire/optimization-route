// Firebase SDK 임포트
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Firebase 설정 (.env 파일의 값을 직접 사용)
const firebaseConfig = {
  apiKey: "AIzaSyAqThbi4vwNssPr-loPGgdCjZGX25xGYPo",
  authDomain: "witple.firebaseapp.com",
  projectId: "witple",
  storageBucket: "witple.firebasestorage.app",
  messagingSenderId: "909733567096",
  appId: "1:909733567096:web:149270a038c12802dfeb8d",
  measurementId: "G-9W2YEFP08E"
};

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
    requireInteraction: true,
    silent: false,
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