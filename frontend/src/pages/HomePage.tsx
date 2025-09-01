import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">경로 최적화 서비스</h1>
          <p className="hero-subtitle">
            효율적인 경로 계획으로 시간과 비용을 절약하세요
          </p>
          <p className="hero-description">
            여러 목적지를 방문해야 하는 경우, 최적의 순서로 경로를 계획하여<br/>
            이동 시간과 거리를 최소화할 수 있습니다.
          </p>
          
          <div className="features">
            <div className="feature-item">
              <div className="feature-icon">🗺️</div>
              <h3>경로 최적화</h3>
              <p>여러 목적지를 가장 효율적인 순서로 방문</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📍</div>
              <h3>실시간 위치</h3>
              <p>GPS를 활용한 정확한 위치 기반 서비스</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🚗</div>
              <h3>다양한 교통수단</h3>
              <p>자동차, 대중교통, 도보, 자전거 지원</p>
            </div>
          </div>

          <div className="cta-section">
            <Link to="/map" className="cta-button">
              지도로 이동하기
            </Link>
          </div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-content">
          <h2>사용 방법</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>위치 권한 허용</h3>
                <p>현재 위치를 찾기 위해 위치 권한을 허용해주세요</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>목적지 입력</h3>
                <p>방문하고 싶은 장소들을 입력하세요</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>경로 최적화</h3>
                <p>최적화 버튼을 클릭하여 최단 경로를 확인하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;