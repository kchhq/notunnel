// map.js

import { drawRoute } from './route.js';

let map;
let geocoder;
let markers         = [];
let startLatLng     = null;
let endLatLng       = null;
let routePolyline   = null;
let tunnelPolyline  = null;

/** 지도 초기화 */
function initMap() {
  geocoder = new kakao.maps.services.Geocoder();

  map = new kakao.maps.Map(
    document.getElementById('map'),
    {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 5
    }
  );

  kakao.maps.event.addListener(map, 'click', onMapClick);
}

/** 맵 클릭 → 마커+인포윈도우 */
function onMapClick(mouseEvent) {
  const latlng = mouseEvent.latLng;
  geocoder.coord2Address(
    latlng.getLng(), latlng.getLat(),
    (res, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const addr = res[0].road_address?.address_name
                  || res[0].address?.address_name
                  || '주소 없음';
        const marker = new kakao.maps.Marker({ position: latlng, map });
        const infowindow = new kakao.maps.InfoWindow({
          position: latlng,
          content: `
            <div style="padding:8px;min-width:200px;font-size:13px;position:relative;">
              <div style="position:absolute;top:4px;right:4px;cursor:pointer;"
                   onclick="closeInfoWindow(${latlng.getLat()},${latlng.getLng()})">
                ❌
              </div>
              <div style="margin-bottom:8px;">${addr}</div>
              <button onclick="setStart(${latlng.getLat()},${latlng.getLng()})">
                출발지 설정
              </button>
              <button onclick="setEnd(${latlng.getLat()},${latlng.getLng()})">
                도착지 설정
              </button>
            </div>
          `
        });
        infowindow.open(map, marker);
        markers.push({ marker, infowindow });
      }
    }
  );
}

/** 인포윈도우 닫고 마커 제거 */
window.closeInfoWindow = (lat, lng) => {
  const rLat = Math.round(lat * 1e7) / 1e7;
  const rLng = Math.round(lng * 1e7) / 1e7;
  markers = markers.filter(o => {
    const p = o.marker.getPosition();
    const pLat = Math.round(p.getLat() * 1e7) / 1e7;
    const pLng = Math.round(p.getLng() * 1e7) / 1e7;
    if (pLat === rLat && pLng === rLng) {
      o.marker.setMap(null);
      o.infowindow?.close();
      return false;
    }
    return true;
  });
};

/** 마커 찍기 */
function placeMarker(latlng, title) {
  const marker = new kakao.maps.Marker({ map, position: latlng, title });
  markers.push({ marker });
}

/** 모든 마커 지우기 */
function clearMarkers() {
  markers.forEach(o => {
    o.marker.setMap(null);
    o.infowindow?.close();
  });
  markers = [];
}

/** 키워드 검색 → 결과 표시 */
function searchPlaces(keyword, type) {
  const ps = new kakao.maps.services.Places();
  ps.keywordSearch(keyword, (data, status) => {
    const box = document.getElementById('searchResults');
    box.innerHTML = '';
    if (status === kakao.maps.services.Status.OK && data.length) {
      data.forEach(p => {
        const div = document.createElement('div');
        div.style.padding = '6px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #ddd';
        div.textContent = p.place_name;
        div.onclick = () => {
          if (type === 'start') setStart(p.y, p.x);
          else                   setEnd(p.y, p.x);
          box.style.display = 'none';
        };
        box.appendChild(div);
      });
      box.style.display = 'block';
    } else {
      box.innerHTML = `<div style="padding:6px;">검색 결과가 없습니다.</div>`;
      box.style.display = 'block';
    }
  });
}

// --- 이벤트 바인딩 ---
window.addEventListener('load', () => {
  document.getElementById('searchButton')
    .addEventListener('click', async () => {
      if (!startLatLng || !endLatLng) {
        alert('출발지와 도착지를 모두 설정해주세요.');
        return;
      }

      clearMarkers();
      routePolyline?.setMap(null);
      tunnelPolyline?.setMap(null);
      routePolyline = tunnelPolyline = null;

      placeMarker(startLatLng, '출발지');
      placeMarker(endLatLng,   '도착지');

      const opt   = document.getElementById('routeOption').value;
      const avoid = opt === '5';       // “터널 회피” 옵션인 경우
      const apiOpt= avoid ? '0' : opt; // Tmap API 에는 0~4 만 허용
      const hl    = document.getElementById('highlightTunnels').checked;

      const { mainPolyline, tunnelPolyline: tp, instructions } = await drawRoute(
        map,
        startLatLng.getLng(), startLatLng.getLat(),
        endLatLng.getLng(),   endLatLng.getLat(),
        apiOpt, avoid, hl
      );
      console.log('instructions:', instructions); // 테스트

      routePolyline  = mainPolyline;
      tunnelPolyline = tp;

      const instructionList = document.getElementById('routeInstructions');
      instructionList.innerHTML = "";
      instructions.forEach((desc, idx) =>
        {
          const li = document.createElement('li');
          li.textContent = `${idx + 1}. ${desc}`;
          instructionList.appendChild(li);
        });

      // console.log('showing panel'); // 테스트
      window.showRoutePanel(); // 경로 안내 패널 띄우기


      // 지도 중앙 이동
      const midLat = (startLatLng.getLat() + endLatLng.getLat()) / 2;
      const midLng = (startLatLng.getLng() + endLatLng.getLng()) / 2;
      map.setCenter(new kakao.maps.LatLng(midLat, midLng));
    });

  ['startInput','endInput'].forEach(id => {
    document.getElementById(id)
      .addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const kw = e.target.value.trim();
          if (kw) searchPlaces(kw, id.includes('start') ? 'start' : 'end');
        }
      });
  });

  window.setStart = (lat, lng) => {
    startLatLng = new kakao.maps.LatLng(lat, lng);
    geocoder.coord2Address(lng, lat, (res, st) => {
      if (st === kakao.maps.services.Status.OK) {
        document.getElementById('startInput').value =
          res[0].road_address?.address_name ||
          res[0].address?.address_name      ||
          '';
      }
    });
  };

  window.setEnd = (lat, lng) => {
    endLatLng = new kakao.maps.LatLng(lat, lng);
    geocoder.coord2Address(lng, lat, (res, st) => {
      if (st === kakao.maps.services.Status.OK) {
        document.getElementById('endInput').value =
          res[0].road_address?.address_name ||
          res[0].address?.address_name      ||
          '';
      }
    });
  };

  // SDK 로딩이 보장된 시점에 맵 초기화
  initMap();
});