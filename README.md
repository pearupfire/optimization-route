# Location Marker & Route Planning App

React + FastAPI로 구현된 위치 기반 보물 찾기 및 경로 계획 애플리케이션

## 기능

- 현재 위치 찾기
- 보물 생성 및 수집 게임
- 경로 계획 (출발지, 경유지, 목적지)
- 최적화된 경로 (Nearest Neighbor 알고리즘)
- 경유지 잠금 (시간 제약이 있는 장소)
- 드래그 & 드롭 경유지 순서 변경

## 기술 스택

### Frontend
- React 18 with TypeScript
- Google Maps JavaScript API
- Axios for API calls
- CSS3 with modern styling

### Backend
- FastAPI (Python)
- Pydantic for data validation
- CORS middleware for cross-origin requests

### Backend (FastAPI)

서버 실행:
```bash
python main.py
```

서버는 http://localhost:8000 에서 실행

### Frontend (React)

서버 실행:
```bash
npm start
```

앱은 http://localhost:3000 에서 실행

## API 엔드포인트

### 마커 관리
- `GET /api/markers` - 모든 마커 조회
- `POST /api/markers` - 새 마커 생성
- `DELETE /api/markers/{marker_id}` - 마커 삭제

### 보물 관리
- `GET /api/treasures` - 모든 보물 조회
- `POST /api/treasures` - 보물 생성
- `DELETE /api/treasures` - 모든 보물 삭제
- `POST /api/treasures/{treasure_id}/collect` - 보물 수집

## 프로젝트 구조

```
├── backend/
│   ├── main.py              # FastAPI 애플리케이션
│   ├── requirements.txt     # Python 의존성
│   └── venv/               # 가상환경
├── frontend/
│   ├── src/
│   │   ├── components/     # React 컴포넌트
│   │   ├── services/       # API 서비스
│   │   ├── types/          # TypeScript 타입 정의
│   │   ├── App.tsx         # 메인 앱 컴포넌트
│   │   └── App.css         # 스타일시트
│   └── package.json        # Node.js 의존성
└── index.html              # 원본 HTML 파일
```

## 사용 방법

1. 두 서버 모두 실행한 후 http://localhost:3000 접속
2. "내 위치 찾기" 버튼으로 현재 위치 표시
3. 마커 타입과 색상 선택
4. "보물 생성"으로 주변에 보물 생성
5. 보물 마커 클릭하여 수집 시도 (10m 이내 접근 필요)