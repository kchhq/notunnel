// route.js

export async function drawRoute(
  map,
  startLng, startLat,
  endLng,   endLat,
  searchOption = "0",
  avoidTunnels = false,
  highlightTunnels = false
) {
  const sx = startLng.toString();
  const sy = startLat .toString();
  const ex = endLng  .toString();
  const ey = endLat  .toString();

  const res = await fetch(
    "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "appKey": "APPKEY"
      },
      body: JSON.stringify({
        startX: sx, startY: sy,
        endX:   ex, endY:   ey,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        searchOption
      })
    }
  );

  const data = await res.json();
  if (!data.features?.length) {
    alert("경로를 찾을 수 없습니다.");
    return { mainPolyline: null, tunnelPolyline: null };
  }

  const normalPath = [];
  const tunnelPath = [];

  data.features.forEach(f => {
    if (f.geometry.type !== "LineString") return;
    const seg = f.geometry.coordinates.map(
      ([lng, lat]) => new kakao.maps.LatLng(lat, lng)
    );
    if (f.properties.facilityType === 2) {
      // 터널 구간
      tunnelPath.push(...seg);
      if (!avoidTunnels) {
        // 회피하지 않을 때만 메인에 포함
        normalPath.push(...seg);
      }
    } else {
      // 일반 도로 구간
      normalPath.push(...seg);
    }
  });

  // “완전히 회피” 선택했는데 메인 경로가 없으면 터널 포함 기본 경로로 폴백
  if (avoidTunnels && normalPath.length === 0 && tunnelPath.length) {
    alert("터널 회피 경로를 찾지 못해 기본 경로를 표시합니다.");
    normalPath.push(...tunnelPath);
  }

  // 메인 폴리라인 (주황)
  const mainPolyline = new kakao.maps.Polyline({
    path: normalPath,
    strokeWeight: 4,
    strokeColor: "#FF6600",
    strokeOpacity: 0.8,
    strokeStyle: "solid",
    map
  });

  // 터널 하이라이트 (빨간 점선)
  let tunnelPolyline = null;
  if (highlightTunnels && tunnelPath.length) {
    tunnelPolyline = new kakao.maps.Polyline({
      path: tunnelPath,
      strokeWeight: 6,
      strokeColor: "#FF0000",
      strokeOpacity: 0.7,
      strokeStyle: "dashed",
      map
    });
  }

  return { mainPolyline, tunnelPolyline };
}
