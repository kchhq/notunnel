// route.js

export async function drawRoute(
  map,
  startLng, startLat,
  endLng,   endLat,
  searchOption = "0",
  avoidTunnels = false,
  highlightTunnels = false
) {
  // 1) Tmap 요청 헬퍼
  async function fetchRoute(opt) {
    const res = await fetch(
      "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "appKey": "appkey"
        },
        body: JSON.stringify({
          startX: startLng.toString(),
          startY: startLat .toString(),
          endX:   endLng  .toString(),
          endY:   endLat  .toString(),
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          searchOption: opt
        })
      }
    );
    return res.json();
  }

  // 2) 최초 경로 받아오기
  let data = await fetchRoute(searchOption);

  // 3) 터널 회피 옵션일 때만, 경로에 터널이 있으면 대체 옵션으로 재탐색
  if (avoidTunnels) {
    const hasTunnel = data.features?.some(f =>
      f.geometry.type === "LineString" &&
      Number(f.properties.facilityType) === 2
    );

    if (hasTunnel) {
      // 재탐색 우선 순위: 무료도로(3), 최단(1), 최소시간(2), 고속도로우선(4), 기본(0)
      const alternatives = ["3","1","2","4","0"];
      for (const alt of alternatives) {
        if (alt === searchOption) continue;
        const altData = await fetchRoute(alt);
        const altHasTunnel = altData.features?.some(f =>
          f.geometry.type === "LineString" &&
          Number(f.properties.facilityType) === 2
        );
        if (!altHasTunnel && altData.features?.length) {
          data = altData;
          break;
        }
      }
    }
  }

  // 4) 경로 유효성 검사
  if (!data.features?.length) {
    alert("경로를 찾을 수 없습니다.");
    return { mainPolyline: null, tunnelPolyline: null, instructions: [] };
  }

  // 5) 경로 분리 및 안내문구 수집
  const normalPath   = [];
  const tunnelPath   = [];
  const instructions = [];

  data.features.forEach(f => {
    if (f.geometry.type === "LineString") {
      const seg = f.geometry.coordinates.map(
        ([lng, lat]) => new kakao.maps.LatLng(lat, lng)
      );
      const ft = Number(f.properties.facilityType);
      // 터널 구간은 언제나 따로 모으고
      if (ft === 2) {
        tunnelPath.push(...seg);
      }
      // 메인 경로(normalPath)는 avoidTunnels 옵션에 따라
      if (!avoidTunnels || ft !== 2) {
        normalPath.push(...seg);
      }
    }
    else if (f.geometry.type === "Point") {
      const desc = f.properties.description?.trim();
      if (desc) instructions.push(desc);
    }
  });

  // 6) 메인 폴리라인 (오렌지)
  const mainPolyline = new kakao.maps.Polyline({
    path: normalPath,
    strokeWeight: 4,
    strokeColor: "#FF6600",
    strokeOpacity: 0.8,
    strokeStyle: "solid",
    map
  });

  // 7) 터널 하이라이트 (옵션 체크 시)
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

  return { mainPolyline, tunnelPolyline, instructions };
}
