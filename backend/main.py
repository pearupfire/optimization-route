from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import math
import random
import httpx
import os

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class NaverDirectionRequest(BaseModel):
    start: str  # "경도,위도" 형태
    goal: str   # "경도,위도" 형태
    waypoints: Optional[str] = None  # "경도,위도|경도,위도" 형태 (최대 5개)
    option: Optional[str] = 'traoptimal'  # trafast, tracomfort, traoptimal

# 메모리 저장소 (실제 애플리케이션에서는 데이터베이스 사용)
markers_db: List[Marker] = []
treasures_db: List[Marker] = []
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

@app.post("/api/naver/directions")
async def get_naver_directions(request: NaverDirectionRequest):
    """네이버 Direction API를 호출하여 실제 경로 정보 반환"""
    
    # 네이버 클라이언트 ID와 시크릿 (환경변수에서 가져오기)
    client_id = os.getenv('NAVER_CLIENT_ID')
    client_secret = os.getenv('NAVER_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Naver API credentials not configured")
    
    # 네이버 Direction API URL
    url = "https://maps.apigw.ntruss.com/map-direction/v1/driving"
    
    # API 요청 파라미터
    params = {
        'start': request.start,
        'goal': request.goal,
        'option': request.option
    }
    
    if request.waypoints:
        params['waypoints'] = request.waypoints
    
    # API 요청 헤더
    headers = {
        'x-ncp-apigw-api-key-id': client_id,
        'x-ncp-apigw-api-key': client_secret if client_secret else client_id,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                # API 오류 처리
                error_detail = f"Naver API Error: {response.status_code}"
                try:
                    error_data = response.json()
                    if 'message' in error_data:
                        error_detail += f" - {error_data['message']}"
                except:
                    error_detail += f" - {response.text}"
                
                raise HTTPException(status_code=response.status_code, detail=error_detail)
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)