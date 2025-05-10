// ✅ 지도 + Tmap 연동 + 검색 결과 선택 기능 포함된 map.js
import { drawRoute } from './route.js';

let map;
let markers = [];
let polyline = null;

let startLatLng = null;
let endLatLng = null;

const geocoder = new kakao.maps.services.Geocoder();

function initMap() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 5
  };
  map = new kakao.maps.Map(container, options);

  addClickEvent();
}

function addClickEvent() {
  kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
    const latlng = mouseEvent.latLng;

    geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function(result, status) {
      if (status === kakao.maps.services.Status.OK) {
        const roadAddr = result[0].road_address?.address_name;
        const jibunAddr = result[0].address?.address_name;
        const address = roadAddr || jibunAddr || '주소 없음';

        const marker = new kakao.maps.Marker({
          position: latlng,
          map: map
        });

        const content = `
          <div style="padding:8px; font-size:13px; position:relative; min-width:220px;">
            <div style="position:absolute; top:4px; right:6px; cursor:pointer;" onclick="closeInfoWindow(${latlng.getLat()}, ${latlng.getLng()})">❌</div>
            <div style="margin-bottom:8px;">${address}</div>
            <div style="display:flex; gap:6px;">
              <button style="flex:1;" onclick="setStart(${latlng.getLat()}, ${latlng.getLng()})">출발지로 설정</button>
              <button style="flex:1;" onclick="setEnd(${latlng.getLat()}, ${latlng.getLng()})">도착지로 설정</button>
            </div>
          </div>
        `;

        const infowindow = new kakao.maps.InfoWindow({
          content,
          position: latlng
        });

        infowindow.open(map, marker);

        markers.push({ marker, infowindow });
      }
    });
  });
}

window.closeInfoWindow = function(lat, lng) {
  const targetLat = roundCoord(lat);
  const targetLng = roundCoord(lng);

  markers = markers.filter(pair => {
    const mPos = pair.marker.getPosition();
    const isTarget =
      roundCoord(mPos.getLat()) === targetLat &&
      roundCoord(mPos.getLng()) === targetLng;

    if (isTarget) {
      pair.marker.setMap(null);
      pair.infowindow.close();
    }

    return !isTarget;
  });
};

function roundCoord(coord) {
  return Math.round(coord * 1e7) / 1e7;
}

// ✅ 장소 검색 후 결과 목록 보여주기
function searchPlaces(keyword, type) {
  const ps = new kakao.maps.services.Places();
  ps.keywordSearch(keyword, (data, status) => {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    if (status === kakao.maps.services.Status.OK && data.length > 0) {
      data.forEach(place => {
        const item = document.createElement('div');
        item.style.padding = '6px';
        item.style.cursor = 'pointer';
        item.style.borderBottom = '1px solid #ddd';
        item.textContent = place.place_name;
        item.onclick = () => {
          const latlng = new kakao.maps.LatLng(place.y, place.x);
          if (type === 'start') {
            setStart(place.y, place.x);
          } else {
            setEnd(place.y, place.x);
          }
          container.style.display = 'none';
        };
        container.appendChild(item);
      });
      container.style.display = 'block';
    } else {
      container.innerHTML = '<div style="padding:6px;">검색 결과가 없습니다.</div>';
      container.style.display = 'block';
    }
  });
}

function placeMarker(latlng, title) {
  const marker = new kakao.maps.Marker({
    map,
    position: latlng,
    title
  });
  markers.push({ marker });
}

function clearMap() {
  markers.forEach(({ marker, infowindow }) => {
    marker.setMap(null);
    if (infowindow) infowindow.close();
  });
  markers = [];

  if (polyline) {
    polyline.setMap(null);
    polyline = null;
  }
}

document.getElementById('searchButton').addEventListener('click', () => {
  const startText = document.getElementById('startInput').value.trim();
  const endText = document.getElementById('endInput').value.trim();
  const option = document.getElementById('routeOption').value;
  const avoidTunnel = document.getElementById('avoidTunnel')?.checked;

  if (!startLatLng || !endLatLng) {
    alert('출발지와 도착지를 모두 선택하거나 검색 후 선택해주세요.');
    return;
  }

  clearMap();
  placeMarker(startLatLng, '출발지');
  placeMarker(endLatLng, '도착지');

  drawRoute(
    map,
    startLatLng.getLng(), startLatLng.getLat(),
    endLatLng.getLng(), endLatLng.getLat(),
    option,
    pl => (polyline = pl),
    avoidTunnel
  );

  const midLat = (startLatLng.getLat() + endLatLng.getLat()) / 2;
  const midLng = (startLatLng.getLng() + endLatLng.getLng()) / 2;
  map.setCenter(new kakao.maps.LatLng(midLat, midLng));
});

['startInput', 'endInput'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const keyword = e.target.value.trim();
      if (keyword) {
        searchPlaces(keyword, id.includes('start') ? 'start' : 'end');
      }
    }
  });
});

window.setStart = function(lat, lng) {
  startLatLng = new kakao.maps.LatLng(lat, lng);

  geocoder.coord2Address(lng, lat, function(result, status) {
    if (status === kakao.maps.services.Status.OK) {
      const roadAddr = result[0].road_address?.address_name;
      const jibunAddr = result[0].address?.address_name;
      const address = roadAddr || jibunAddr || '';
      document.getElementById('startInput').value = address;
    }
  });

};

window.setEnd = function(lat, lng) {
  endLatLng = new kakao.maps.LatLng(lat, lng);

  geocoder.coord2Address(lng, lat, function(result, status) {
    if (status === kakao.maps.services.Status.OK) {
      const roadAddr = result[0].road_address?.address_name;
      const jibunAddr = result[0].address?.address_name;
      const address = roadAddr || jibunAddr || '';
      document.getElementById('endInput').value = address;
    }
  });

};

initMap();
