from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import math
import random
import httpx
import os
import json
import firebase_admin
from firebase_admin import credentials, messaging

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000", "https://172.21.102.77:3000"],  # React 개발 서버 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase 초기화 (테스트용 - 실제로는 서비스 계정 키 파일 사용)
# firebase_admin.initialize_app(credentials.Certificate("path/to/serviceAccountKey.json"))

# 테스트용으로 기본 앱으로 초기화 (실제 프로덕션에서는 서비스 계정 키 필요)
try:
    if not firebase_admin._apps:
        # 테스트용 기본 초기화 (실제로는 작동하지 않지만 구조만 보여줌)
        firebase_admin.initialize_app()
        print("Firebase Admin 초기화 완료")
except Exception as e:
    print(f"Firebase Admin 초기화 실패: {e}")
    print("실제 사용을 위해서는 Firebase 서비스 계정 키가 필요합니다.")

# 데이터 모델
class Location(BaseModel):
    lat: float
    lng: float

class MarkerCreate(BaseModel):
    location: Location
    marker_type: str
    color: str
    title: Optional[str] = None

class Marker(MarkerCreate):
    id: int

class TreasureRequest(BaseModel):
    center_location: Location
    count: int = 5
    radius_km: float = 0.01  # 10m radius

class FCMToken(BaseModel):
    token: str

class FCMMessage(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/character.png"
    data: Optional[Dict[str, str]] = None


# 메모리 저장소 (실제 애플리케이션에서는 데이터베이스 사용)
markers_db: List[Marker] = []
treasures_db: List[Marker] = []
fcm_tokens: List[str] = []  # FCM 토큰 저장소
marker_id_counter = 1
treasure_id_counter = 1

@app.get("/")
async def root():
    return {"message": "Location Marker API"}

@app.post("/api/markers", response_model=Marker)
async def create_marker(marker: MarkerCreate):
    global marker_id_counter
    new_marker = Marker(
        id=marker_id_counter,
        **marker.dict()
    )
    markers_db.append(new_marker)
    marker_id_counter += 1
    return new_marker

@app.get("/api/markers", response_model=List[Marker])
async def get_markers():
    return markers_db

@app.delete("/api/markers/{marker_id}")
async def delete_marker(marker_id: int):
    global markers_db
    markers_db = [marker for marker in markers_db if marker.id != marker_id]
    return {"message": "Marker deleted"}

@app.post("/api/treasures", response_model=List[Marker])
async def generate_treasures(request: TreasureRequest):
    global treasure_id_counter, treasures_db
    
    # 기존 보물 제거
    treasures_db.clear()
    
    treasures = []
    for i in range(request.count):
        treasure_location = generate_random_location(
            request.center_location.lat,
            request.center_location.lng,
            request.radius_km
        )
        
        treasure = Marker(
            id=treasure_id_counter,
            location=treasure_location,
            marker_type="treasure",
            color="#DAA520",
            title=f"보물상자 {i + 1}"
        )
        
        treasures.append(treasure)
        treasures_db.append(treasure)
        treasure_id_counter += 1
    
    return treasures

@app.get("/api/treasures", response_model=List[Marker])
async def get_treasures():
    return treasures_db

@app.delete("/api/treasures")
async def clear_treasures():
    global treasures_db
    treasures_db.clear()
    return {"message": "All treasures cleared"}

@app.post("/api/treasures/{treasure_id}/collect")
async def collect_treasure(treasure_id: int, user_location: Location):
    global treasures_db
    
    # 보물 찾기
    treasure = next((t for t in treasures_db if t.id == treasure_id), None)
    if not treasure:
        raise HTTPException(status_code=404, detail="Treasure not found")
    
    # 거리 계산
    distance_km = calculate_distance(
        user_location.lat, user_location.lng,
        treasure.location.lat, treasure.location.lng
    )
    distance_m = distance_km * 1000
    
    # 10m 이내인지 확인
    if distance_m <= 10:
        # 보물 수집 (제거)
        treasures_db = [t for t in treasures_db if t.id != treasure_id]
        
        remaining_count = len(treasures_db)
        return {
            "success": True,
            "message": f"보물을 찾았습니다! 🎉 남은 보물: {remaining_count}개",
            "remaining_treasures": remaining_count,
            "distance_meters": distance_m
        }
    else:
        return {
            "success": False,
            "message": f"너무 멀어요! 현재 거리: {distance_m:.1f}m (10m 이내로 접근해주세요)",
            "distance_meters": distance_m
        }


def generate_random_location(center_lat: float, center_lng: float, radius_km: float) -> Location:
    """지정된 중심점에서 반경 내의 랜덤 위치 생성"""
    earth_radius = 6371  # 지구 반지름 (km)
    
    # 랜덤 각도와 거리
    random_angle = random.random() * 2 * math.pi
    random_radius = random.random() * radius_km
    
    # 위도, 경도 계산
    delta_lat = (random_radius / earth_radius) * (180 / math.pi)
    delta_lng = (random_radius / earth_radius) * (180 / math.pi) / math.cos(center_lat * math.pi / 180)
    
    new_lat = center_lat + delta_lat * math.cos(random_angle)
    new_lng = center_lng + delta_lng * math.sin(random_angle)
    
    return Location(lat=new_lat, lng=new_lng)

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """두 지점 간 거리 계산 (km)"""
    R = 6371  # 지구 반지름 (km)
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    
    a = (math.sin(d_lat/2) * math.sin(d_lat/2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lng/2) * math.sin(d_lng/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

# FCM 관련 엔드포인트들
@app.post("/api/fcm/subscribe")
async def subscribe_fcm(token_data: FCMToken):
    """FCM 토큰 구독"""
    global fcm_tokens
    
    if token_data.token not in fcm_tokens:
        fcm_tokens.append(token_data.token)
        print(f"새 FCM 토큰 등록: {token_data.token[:50]}...")
    
    return {
        "message": "FCM 구독이 완료되었습니다!",
        "total_subscribers": len(fcm_tokens)
    }

@app.post("/api/fcm/unsubscribe")
async def unsubscribe_fcm(token_data: FCMToken):
    """FCM 토큰 구독 해제"""
    global fcm_tokens
    
    if token_data.token in fcm_tokens:
        fcm_tokens.remove(token_data.token)
        print(f"FCM 토큰 해제: {token_data.token[:50]}...")
    
    return {
        "message": "FCM 구독이 해제되었습니다!",
        "total_subscribers": len(fcm_tokens)
    }

@app.post("/api/fcm/send-test")
async def send_test_fcm_notification(message: FCMMessage):
    """테스트 FCM 알림 전송"""
    if not fcm_tokens:
        raise HTTPException(status_code=404, detail="구독된 FCM 토큰이 없습니다.")
    
    success_count = 0
    failed_count = 0
    
    for token in fcm_tokens[:]:  # 복사본으로 반복
        try:
            # FCM 메시지 구성
            fcm_message = messaging.Message(
                notification=messaging.Notification(
                    title=message.title,
                    body=message.body,
                    image=message.icon
                ),
                data=message.data or {},
                token=token
            )
            
            # FCM 메시지 전송 (실제로는 Firebase 프로젝트 설정 필요)
            # response = messaging.send(fcm_message)
            # print(f"FCM 메시지 전송 성공: {response}")
            
            # 테스트용으로 성공으로 간주
            print(f"FCM 메시지 전송 시뮬레이션: {token[:50]}...")
            success_count += 1
            
        except Exception as e:
            print(f"FCM 메시지 전송 실패: {str(e)}")
            failed_count += 1
            
            # 만료된 토큰 제거
            if "registration-token-not-registered" in str(e) or "invalid" in str(e).lower():
                fcm_tokens.remove(token)
    
    return {
        "message": "FCM 테스트 알림 전송 완료",
        "success": success_count,
        "failed": failed_count,
        "total_tokens": len(fcm_tokens),
        "note": "실제 전송을 위해서는 Firebase 프로젝트 설정이 필요합니다."
    }

@app.get("/api/fcm/subscribers")
async def get_fcm_subscribers():
    """FCM 구독자 목록"""
    return {
        "total_subscribers": len(fcm_tokens),
        "tokens": [token[:50] + "..." for token in fcm_tokens]
    }

@app.delete("/api/fcm/subscribers")
async def clear_fcm_subscribers():
    """모든 FCM 구독 삭제"""
    global fcm_tokens
    count = len(fcm_tokens)
    fcm_tokens.clear()
    return {"message": f"{count}개의 FCM 구독이 삭제되었습니다."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)